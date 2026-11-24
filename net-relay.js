/* net-relay.js — запасной канал связи «через сервер» для кооператива «Тысячи чар».
 *
 * Зачем: P2P (Trystero) у части игроков не пробивается (мобильный интернет, NAT, режут реле nostr).
 * Этот файл поднимает ту же «комнату» через Supabase Realtime (broadcast) на голом WebSocket
 * по протоколу Phoenix — без сборки и без supabase-js. Классический скрипт, глобальная функция relayJoin.
 *
 * Интерфейс как у комнаты Trystero:
 *   const room = relayJoin({ appId, roomId, selfId, url, key });
 *   const [send, onReceive] = room.makeAction('m');   // send(data, peerId?) -> Promise; onReceive(cb(data, peerId))
 *   room.onPeerJoin(cb(peerId)); room.onPeerLeave(cb(peerId));
 *   room.getPeers() -> { peerId: {lastSeen} };  room.ping(peerId) -> Promise<ms>;
 *   room.kick() — принудительное переподключение (вернулись в приложение на iOS);  room.leave();
 *   room.status() -> { ws, joined, peers, tx, rx, lastErr, rtt, ... } для диагностики.
 *
 * Отправка (v2, меньше задержка): всё, что игра накопила за текущий ход JS (позиция + снимок + удар…), уходит одним конвертом
 * в конце этого хода (микрозадача), без ожидания пачки. Позиции и снимки (p, s, ka) «последнее побеждает»: старый p/s в очереди
 * заменяется новым. Пинг/понг и присутствие идут мимо очереди сразу. Лимит на себя: ведро ~24 конверта/с (ёмкость 8);
 * при нехватке сообщения копятся (p/s заменяются) и уходят следующим конвертом, как только есть место.
 * Лимиты Supabase Realtime (бесплатный план): ~100 событий/с на проект и до 200 одновременных соединений.
 * Присутствие: свои hello раз в 2 с и bye при выходе; пир пропадает после 6 с молчания (любое сообщение его освежает).
 */
(function (g) {
  'use strict';
  var DEF_URL = 'wss://mugzpapozmuryzkfqldr.supabase.co/realtime/v1/websocket';

  function relayJoin(o) {
    o = o || {};
    var selfId = o.selfId || Math.random().toString(36).slice(2, 12);
    var url = o.url || DEF_URL, key = o.key || '';
    var rateMax = o.rate || 24, burst = o.burst || 8, helloMs = o.helloMs || 2000, silenceMs = o.silenceMs || 6000;
    var coalesce = o.coalesce || ['p', 's', 'ka'];
    var topic = 'realtime:' + String(o.appId || 'app').replace(/[^A-Za-z0-9_-]/g, '-').slice(-40) + '-' + String(o.roomId || 'room').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 24);

    var ws = null, joined = false, closed = false, ref = 1, joinRef = '', tries = 0, lastErr = '';
    var hbTimer = 0, hbAt = 0, hbRef = '', helloTimer = 0, flushTimer = 0, reconTimer = 0, prTimer = 0, connAt = 0;
    var peers = {}, actions = {}, joinCbs = [], leaveCbs = [], queue = [], pings = {};
    var st = { tx: 0, rx: 0, txBytes: 0, rxBytes: 0, rtt: 0, maxBytes: 0, connects: 0 };

    function nextRef() { return String(ref++); }
    function raw(ev, payload, r) {
      if (!ws || ws.readyState !== 1) return false;
      try { ws.send(JSON.stringify({ topic: ev === 'heartbeat' ? 'phoenix' : topic, event: ev, payload: payload || {}, ref: r === undefined ? nextRef() : r })); return true; } catch (e) { return false; }
    }
    function emitEnv(env) {
      if (!joined) return false;
      env.i = selfId;
      var s = JSON.stringify(env);
      var ok = raw('broadcast', { type: 'broadcast', event: 'tc', payload: env }, null);
      if (ok) { st.tx++; st.txBytes += s.length; if (s.length > st.maxBytes) st.maxBytes = s.length; }
      return ok;
    }

    function connect() {
      if (closed) return;
      clearTimeout(reconTimer);
      try { if (ws) { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; ws.close(); } } catch (e) {}
      joined = false; connAt = Date.now();
      var w;
      try { w = new WebSocket(url + '?apikey=' + encodeURIComponent(key) + '&vsn=1.0.0'); } catch (e) { lastErr = 'WebSocket: ' + (e && e.message || e); return schedule(); }
      ws = w;
      w.onopen = function () {
        if (ws !== w) return;
        joinRef = nextRef();
        raw('phx_join', { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, private: false } }, joinRef);
        clearInterval(hbTimer); hbAt = 0;
        hbTimer = setInterval(heartbeat, 25000);
      };
      w.onmessage = function (e) {
        if (ws !== w) return;
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.event === 'phx_reply') {
          if (m.ref === joinRef) {
            if (m.payload && m.payload.status === 'ok') { joined = true; tries = 0; lastErr = ''; st.connects++; for (var pid in peers) peers[pid].lastSeen = Date.now(); /* сами были без связи — напарника не списываем */ sendHello(false); flush(); }
            else { lastErr = 'join: ' + JSON.stringify(m.payload && m.payload.response || m.payload).slice(0, 120); try { w.close(); } catch (x) {} }
          } else if (m.ref === hbRef) { hbAt = 0; }
          else if (m.payload && m.payload.status === 'error' && m.topic === 'phoenix') { lastErr = 'heartbeat error'; }
        } else if (m.event === 'broadcast') {
          var env = m.payload && m.payload.payload;
          if (env && m.payload.event === 'tc') onEnv(env, e.data.length);
        } else if (m.event === 'phx_error' || m.event === 'phx_close') {
          lastErr = m.event; try { w.close(); } catch (x) {}
        } else if (m.event === 'system' && m.payload && m.payload.status === 'error') {
          lastErr = 'system: ' + String(m.payload.message || '').slice(0, 120);
        }
      };
      w.onerror = function () { if (ws === w) lastErr = lastErr || 'сбой соединения'; };
      w.onclose = function () {
        if (ws !== w) return;
        joined = false; clearInterval(hbTimer); schedule();
      };
    }
    function schedule() {
      if (closed) return;
      clearTimeout(reconTimer);
      var d = Math.min(8000, 400 * Math.pow(2, tries++)) + Math.random() * 300;
      reconTimer = setTimeout(connect, d);
    }
    function heartbeat() {
      if (!ws || ws.readyState !== 1) return;
      if (hbAt && Date.now() - hbAt > 12000) { lastErr = 'нет ответа сервера'; try { ws.close(); } catch (e) {} return; }
      hbRef = nextRef(); hbAt = Date.now(); raw('heartbeat', {}, hbRef);
    }

    function sendHello(re) { emitEnv({ k: 'h', re: re ? 1 : 0 }); }
    function seen(id, t) {
      var p = peers[id];
      if (!p) {
        p = peers[id] = { lastSeen: t, since: t };
        for (var i = 0; i < joinCbs.length; i++) try { joinCbs[i](id); } catch (e) {}
        return true;
      }
      p.lastSeen = t; return false;
    }
    function drop(id) {
      if (!peers[id]) return;
      delete peers[id];
      for (var i = 0; i < leaveCbs.length; i++) try { leaveCbs[i](id); } catch (e) {}
    }
    function onEnv(env, len) {
      var id = env.i; if (!id || id === selfId) return;
      if (env.to && env.to !== selfId) return;
      st.rx++; st.rxBytes += len || 0;
      var now = Date.now(), k = env.k;
      if (k === 'b') { drop(id); return; }
      var isNew = seen(id, now);
      if (k === 'h') { if (isNew && !env.re) sendHello(true); return; }
      if (k === 'pi') { emitEnv({ k: 'po', n: env.n, to: id }); return; }
      if (k === 'po') { var pr = pings[env.n]; if (pr) { delete pings[env.n]; var ms = performance.now() - pr.t; st.rtt = ms; pr.res(ms); } return; }
      if (k === 'd' && env.m) {
        for (var j = 0; j < env.m.length; j++) {
          var a = env.m[j], cbs = actions[a[0]]; if (!cbs) continue;
          for (var q = 0; q < cbs.length; q++) try { cbs[q](a[1], id); } catch (e) { try { console.error(e); } catch (x) {} }
        }
      } else if (isNew && k !== 'h') { /* неизвестный пир прислал данные — считаем присутствием */ }
    }

    var tokens = o.burst || 8, tokAt = 0;
    function takeToken() {
      var n = performance.now();
      if (!tokAt) tokAt = n;
      tokens = Math.min(burst, tokens + (n - tokAt) * rateMax / 1000); tokAt = n;
      if (tokens >= 1) { tokens -= 1; return 0; }
      return Math.ceil((1 - tokens) * 1000 / rateMax);   // через сколько мс будет токен
    }
    function flush(force) {
      flushTimer = 0;
      if (!joined || !queue.length) { if (!joined && queue.length > 300) queue.splice(0, queue.length - 300); return; }
      var wait = force === true ? 0 : takeToken();
      if (wait) { flushTimer = setTimeout(flush, wait); return; }
      var by = {}, order = [], i, it;
      for (i = 0; i < queue.length; i++) { it = queue[i]; var t = it.to || ''; if (!by[t]) { by[t] = []; order.push(t); } by[t].push([it.a, it.d]); }
      queue = [];
      var left = [];
      for (i = 0; i < order.length; i++) {
        var env = { k: 'd', m: by[order[i]] }; if (order[i]) env.to = order[i];
        // сокет закрылся — сообщения не теряем, а возвращаем в очередь (уйдут после переподключения)
        if (!emitEnv(env)) for (var j = 0; j < by[order[i]].length; j++) left.push({ a: by[order[i]][j][0], d: by[order[i]][j][1], to: order[i] });
      }
      if (left.length) { queue = left.concat(queue); if (queue.length > 300) queue.splice(0, queue.length - 300); }
    }
    function enqueue(a, d, to) {
      if (closed) return Promise.resolve();
      if (d && typeof d === 'object' && coalesce.indexOf(d.t) >= 0) {
        for (var i = 0; i < queue.length; i++) { var q = queue[i]; if (q.a === a && q.to === to && q.d && q.d.t === d.t) { q.d = d; return Promise.resolve(); } }
      }
      queue.push({ a: a, d: d, to: to || '' });
      if (!flushTimer) { flushTimer = -1; Promise.resolve().then(function () { if (flushTimer === -1) flush(); }); }
      return Promise.resolve();
    }

    // присутствие: свои hello и сторож молчания
    helloTimer = setInterval(function () { if (joined) sendHello(false); }, helloMs);
    prTimer = setInterval(function () {
      var now = Date.now();
      if (!joined) return; // пока у самих нет связи, молчание напарника ничего не значит
      for (var id in peers) if (now - peers[id].lastSeen > silenceMs) drop(id);
    }, 1000);

    connect();

    return {
      selfId: selfId,
      topic: topic,
      makeAction: function (name, opt) {
        var cbs = actions[name] = actions[name] || [], now = !!(opt && opt.now);
        // opt.now — срочные сообщения (сигнализация P2P): уходят сразу, без ожидания пачки
        return [function (data, peerId) { var r = enqueue(name, data, typeof peerId === 'string' ? peerId : ''); if (now) { clearTimeout(flushTimer); flush(); } return r; }, function (cb) { cbs.push(cb); }];
      },
      onPeerJoin: function (cb) { joinCbs.push(cb); },
      onPeerLeave: function (cb) { leaveCbs.push(cb); },
      getPeers: function () { var r = {}; for (var id in peers) r[id] = peers[id]; return r; },
      ping: function (peerId) {
        return new Promise(function (res, rej) {
          if (!joined || !peers[peerId]) { rej(new Error('нет связи')); return; }
          var n = String(ref++); pings[n] = { t: performance.now(), res: res };
          setTimeout(function () { if (pings[n]) { delete pings[n]; rej(new Error('таймаут')); } }, 5000);
          emitEnv({ k: 'pi', n: n, to: peerId });
        });
      },
      isJoined: function () { return joined; },
      kick: function () {
        // вернулись из фона: сокет мог тихо умереть — пересоздаём сразу и объявляемся заново
        if (closed) return; tries = 0;
        for (var id in peers) peers[id].lastSeen = Date.now();
        connect();
      },
      status: function () {
        var n = 0; for (var id in peers) n++;
        return { ws: !ws ? 'нет' : ['подключается', 'открыт', 'закрывается', 'закрыт'][ws.readyState], joined: joined, peers: n, tx: st.tx, rx: st.rx, txBytes: st.txBytes, rxBytes: st.rxBytes, maxBytes: st.maxBytes, rtt: st.rtt, connects: st.connects, lastErr: lastErr, tries: tries, age: Date.now() - connAt };
      },
      leave: function () {
        if (closed) return;
        flush(true);
        if (joined) emitEnv({ k: 'b' });
        closed = true;
        clearInterval(helloTimer); clearInterval(prTimer); clearInterval(hbTimer); clearTimeout(reconTimer); clearTimeout(flushTimer);
        var w = ws; setTimeout(function () { try { if (w) { w.onclose = null; w.close(); } } catch (e) {} }, 150);
        peers = {};
      }
    };
  }
  g.relayJoin = relayJoin;
})(typeof window !== 'undefined' ? window : this);
