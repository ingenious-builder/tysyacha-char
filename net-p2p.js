/* net-p2p.js — прямое соединение двух телефонов (WebRTC DataChannel) с сигнализацией через канал сервера (net-relay.js).
 *
 * Зачем: публичные реле nostr (сигнализация Trystero) ненадёжны. Канал Supabase у обоих игроков открыт всегда,
 * поэтому offer/answer/ICE гоним через него (действие 'sdp'), а игровой трафик — напрямую по DataChannel.
 *
 *   const dc = p2pDirect({ rel, host, onMessage(d,id), onOpen(id), onClose(id, lostMsgs) });
 *   dc.peerJoined(id) — вызвать, когда пир появился в канале сервера; dc.peerLeft(id)
 *   dc.send(obj, id) -> true, если ушло по DataChannel (false — слать через сервер); dc.isOpen(id); dc.rtt();
 *   dc.info() — состояние для «Подробнее»; dc.kick() — вернулись в приложение; dc.leave().
 *
 * Два канала: 'u' — без гарантий (maxRetransmits 0, unordered) для позиций p, снимков s и keepalive ka; 'r' — надёжный для событий.
 * Хост — offerer. Ждём открытия 6 с, не вышло — остаёмся на сервере и пробуем снова через 20–30 с.
 * Сбой открытого канала: сначала перезапуск ICE (до 5 с), потом пересоздание. События (≤ 3 с), ушедшие по надёжному каналу
 * перед обрывом, отдаются в onClose — приложение досылает их через сервер (у событий есть номер _q, приёмник отсеивает дубли).
 */
(function (g) {
  'use strict';
  var STUN = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:global.stun.twilio.com:3478' }, { urls: 'stun:stun.nextcloud.com:443' }];
  var UNREL = { p: 1, s: 1, ka: 1 };
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function newCand() { return { l: { host: 0, srflx: 0, relay: 0, prflx: 0, mdns: 0 }, r: { host: 0, srflx: 0, relay: 0, prflx: 0, mdns: 0 } }; }

  function p2pDirect(o) {
    var rel = o.rel, host = !!o.host, closed = false;
    var servers = o.ice || STUN, tmo = o.timeoutMs || 6000;
    var sg = rel.makeAction('sdp', { now: true }), sendSig = sg[0];
    var peer = null, pc = null, chR = null, chU = null, cur = '', st = 'idle', openAt = 0, startAt = 0;
    var pend = [], timerFail = 0, timerRetry = 0, timerDisc = 0, timerKa = 0;
    var fails = 0, reason = '', pair = '', rttMs = 0, lastIn = 0, pings = {}, sent = [], cand = newCand();

    function log() { try { if (g.__P2PLOG) console.log.apply(console, ['[p2p]'].concat([].slice.call(arguments))); } catch (e) {} }
    function sig(m) { if (peer) try { sendSig(m, peer); } catch (e) {} }

    function teardown() {
      clearTimeout(timerFail); clearTimeout(timerDisc);
      var c = pc; pc = null;
      try { if (chR) { chR.onopen = chR.onclose = chR.onmessage = null; } if (chU) { chU.onopen = chU.onclose = chU.onmessage = null; } } catch (e) {}
      try { if (c) { c.onicecandidate = c.onconnectionstatechange = c.oniceconnectionstatechange = c.ondatachannel = null; c.close(); } } catch (e) {}
      chR = chU = null; pend = []; pair = ''; cand = newCand();
    }
    function setClosed(why) {
      var was = st === 'open', lost = [];
      if (was) { var now = Date.now(); for (var i = 0; i < sent.length; i++) if (now - sent[i].t < 3000) lost.push(sent[i].o); }
      sent = [];
      teardown(); clearInterval(timerKa);
      st = 'failed'; reason = why || reason;
      if (was) { try { o.onClose && o.onClose(peer, lost); } catch (e) {} }
      return was;
    }
    function fail(why) {
      if (closed) return;
      var was = setClosed(why);
      fails++;
      log('fail', why);
      // открытый канал упал — вернуться быстро; не поднялся за 6 с — ждать 20–30 с
      scheduleRetry(was ? 1200 : 20000 + Math.random() * 10000);
    }
    function scheduleRetry(ms) {
      clearTimeout(timerRetry);
      if (closed || !peer) return;
      timerRetry = setTimeout(function () { timerRetry = 0; if (host) begin(); else if (st !== 'open' && st !== 'connecting') sig({ k: 'q' }); }, ms);
    }

    function iceSummary() {
      var l = cand.l, r = cand.r;
      return 'ICE ' + (pc ? pc.iceConnectionState : '-') + '; свои кандидаты: host ' + l.host + ', srflx ' + l.srflx + ', relay ' + l.relay + (l.mdns ? ' (mDNS ' + l.mdns + ')' : '') + (l.srflx ? '' : ' — STUN не ответил или сеть режет UDP') + '; чужие: host ' + r.host + ', srflx ' + r.srflx + ', relay ' + r.relay + (r.mdns ? ' (mDNS ' + r.mdns + ')' : '');
    }
    function newPc(id) {
      cur = id; st = 'connecting'; startAt = Date.now(); reason = '';
      var c = new RTCPeerConnection({ iceServers: servers, iceCandidatePoolSize: 2 });
      pc = c;
      c.onicecandidate = function (e) {
        if (pc !== c || !e.candidate) return;
        var x = e.candidate, cs = x.candidate || '', t = x.type || (/ typ (\w+)/.exec(cs) || [])[1];
        if (t && cand.l[t] !== undefined) cand.l[t]++;
        if (/\.local\b/.test(cs)) cand.l.mdns++;
        sig({ k: 'i', g: id, c: x.toJSON ? x.toJSON() : { candidate: cs, sdpMid: x.sdpMid, sdpMLineIndex: x.sdpMLineIndex } });
      };
      c.oniceconnectionstatechange = function () {
        if (pc !== c) return;
        var s = c.iceConnectionState; log('ice', s);
        if (s === 'failed') { if (host && st === 'open' && !c._rs) iceRestart(); else if (st === 'open') fail('ICE failed'); }
        else if (s === 'disconnected') {
          clearTimeout(timerDisc);
          timerDisc = setTimeout(function () {
            if (pc === c && c.iceConnectionState !== 'connected' && c.iceConnectionState !== 'completed') { if (host && st === 'open' && !c._rs) iceRestart(); else fail('ICE disconnected'); }
          }, 2500);
        } else if (s === 'connected' || s === 'completed') { clearTimeout(timerDisc); c._rs = 0; }
      };
      c.onconnectionstatechange = function () { if (pc === c && c.connectionState === 'failed' && st !== 'open') fail('соединение не установилось (' + iceSummary() + ')'); };
      timerFail = setTimeout(function () { if (pc === c && st !== 'open') fail('таймаут ' + Math.round(tmo / 1000) + ' с: ' + iceSummary()); }, tmo);
      return c;
    }
    function iceRestart() {
      if (!pc || !host) return;
      var c = pc; c._rs = 1;
      log('ice restart');
      c.createOffer({ iceRestart: true }).then(function (d) { return c.setLocalDescription(d); }).then(function () { sig({ k: 'o', g: cur, s: c.localDescription.sdp, rs: 1 }); }).catch(function () { fail('перезапуск ICE не удался'); });
      clearTimeout(timerDisc); timerDisc = setTimeout(function () { if (pc === c && c.iceConnectionState !== 'connected' && c.iceConnectionState !== 'completed') fail('ICE не восстановился'); }, 5000);
    }

    function wire(ch, name) {
      ch.onopen = function () { checkOpen(); };
      ch.onclose = function () { if (pc && (chR === ch || chU === ch) && (st === 'open' || st === 'connecting')) fail('канал ' + name + ' закрылся'); };
      ch.onmessage = function (e) { lastIn = Date.now(); onData(e.data); };
      if (name === 'r') chR = ch; else chU = ch;
      if (ch.readyState === 'open') checkOpen();
    }
    function checkOpen() {
      if (st === 'open' || !chR || !chU || chR.readyState !== 'open' || chU.readyState !== 'open') return;
      clearTimeout(timerFail); st = 'open'; openAt = Date.now(); fails = 0; lastIn = openAt; sent = [];
      log('open за', openAt - startAt, 'мс');
      readPair(); setTimeout(readPair, 900);
      clearInterval(timerKa);
      timerKa = setInterval(function () {
        if (st !== 'open') return;
        var now = Date.now();
        if (now - lastIn > 4500) { fail('нет данных 4,5 с'); return; }
        var n = rid(); pings[n] = now; rawU({ '~': 'pi', n: n });
        for (var k in pings) if (now - pings[k] > 8000) delete pings[k];
      }, 1500);
      try { o.onOpen && o.onOpen(peer); } catch (e) {}
    }
    function readPair() {
      if (!pc || !pc.getStats) return;
      var c = pc;
      c.getStats().then(function (rep) {
        var byId = {}, sel = null;
        rep.forEach(function (v) { byId[v.id] = v; });
        rep.forEach(function (v) { if (v.type === 'transport' && v.selectedCandidatePairId) sel = byId[v.selectedCandidatePairId]; });
        if (!sel) rep.forEach(function (v) { if (v.type === 'candidate-pair' && (v.selected || (v.nominated && v.state === 'succeeded'))) sel = v; });
        if (sel && pc === c) {
          var L = byId[sel.localCandidateId] || {}, R = byId[sel.remoteCandidateId] || {};
          pair = (L.candidateType || '?') + ' / ' + (R.candidateType || '?') + ' (' + (L.protocol || R.protocol || '?') + ')';
        }
      }).catch(function () {});
    }
    function rawU(x) { try { if (chU && chU.readyState === 'open') chU.send(JSON.stringify(x)); } catch (e) {} }
    function onData(s) {
      var d; try { d = JSON.parse(s); } catch (e) { return; }
      if (d && d['~']) {
        if (d['~'] === 'pi') rawU({ '~': 'po', n: d.n });
        else if (d['~'] === 'po') { var t = pings[d.n]; if (t) { delete pings[d.n]; rttMs = Date.now() - t; } }
        return;
      }
      try { o.onMessage && o.onMessage(d, peer); } catch (e) { try { console.error(e); } catch (x) {} }
    }

    // ---- хост: offer ----
    function begin() {
      if (closed || !host || !peer) return;
      if (typeof RTCPeerConnection === 'undefined') { reason = 'WebRTC недоступен'; return; }
      clearTimeout(timerRetry); timerRetry = 0;
      teardown(); clearInterval(timerKa); st = 'idle';
      var id = rid(), c;
      try { c = newPc(id); } catch (e) { st = 'failed'; reason = 'RTCPeerConnection: ' + (e && e.message || e); fails++; scheduleRetry(25000); return; }
      wire(c.createDataChannel('r', { ordered: true }), 'r');
      wire(c.createDataChannel('u', { ordered: false, maxRetransmits: 0 }), 'u');
      c.createOffer().then(function (d) { return c.setLocalDescription(d); }).then(function () { if (pc === c) sig({ k: 'o', g: id, s: c.localDescription.sdp }); })
        .catch(function (e) { if (pc === c) fail('offer: ' + (e && e.message || e)); });
    }
    // ---- гость: answer ----
    function onOffer(m) {
      if (host || closed || !peer) return;
      var c = pc && m.g === cur ? pc : null;
      if (!c) {
        if (typeof RTCPeerConnection === 'undefined') { reason = 'WebRTC недоступен'; return; }
        teardown(); clearInterval(timerKa); st = 'idle';
        try { c = newPc(m.g); } catch (e) { st = 'failed'; reason = 'RTCPeerConnection: ' + (e && e.message || e); fails++; return; }
        c.ondatachannel = function (e) { if (pc !== c) return; wire(e.channel, e.channel.label === 'u' ? 'u' : 'r'); };
      }
      c.setRemoteDescription({ type: 'offer', sdp: m.s }).then(function () { return flushPend(c); }).then(function () { return c.createAnswer(); })
        .then(function (d) { return c.setLocalDescription(d); }).then(function () { if (pc === c) sig({ k: 'a', g: m.g, s: c.localDescription.sdp }); })
        .catch(function (e) { if (pc === c) fail('answer: ' + (e && e.message || e)); });
    }
    function flushPend(c) {
      var a = pend; pend = [];
      return Promise.all(a.map(function (x) { return c.addIceCandidate(x).catch(function () {}); }));
    }
    function onSig(m, id) {
      if (closed || !m || id !== peer) return;
      log('sig', m.k);
      if (m.k === 'q') { if (host && !(st === 'connecting' && Date.now() - startAt < 5000)) begin(); }
      else if (m.k === 'o') onOffer(m);
      else if (m.k === 'a') {
        if (!host || !pc || m.g !== cur) return;
        var c = pc; c.setRemoteDescription({ type: 'answer', sdp: m.s }).then(function () { return flushPend(c); }).catch(function (e) { if (pc === c) fail('answer apply: ' + (e && e.message || e)); });
      } else if (m.k === 'i') {
        if (!pc || m.g !== cur || !m.c) return;
        var cs = m.c.candidate || '', t = (/ typ (\w+)/.exec(cs) || [])[1];
        if (t && cand.r[t] !== undefined) cand.r[t]++;
        if (/\.local\b/.test(cs)) cand.r.mdns++;
        if (pc.remoteDescription) pc.addIceCandidate(m.c).catch(function () {}); else pend.push(m.c);
      }
    }
    sg[1](onSig);

    return {
      peerJoined: function (id) {
        if (closed) return;
        if (peer === id && (st === 'open' || st === 'connecting')) return;
        peer = id;
        if (host) { clearTimeout(timerRetry); timerRetry = setTimeout(begin, 150); }
        else sig({ k: 'q' });
      },
      peerLeft: function (id) { if (id !== peer) return; setClosed('пир ушёл'); peer = null; clearTimeout(timerRetry); st = 'idle'; },
      isOpen: function (id) { return st === 'open' && (!id || id === peer); },
      send: function (obj, id) {
        if (st !== 'open' || (id && id !== peer)) return false;
        var s; try { s = JSON.stringify(obj); } catch (e) { return false; }
        var u = obj && UNREL[obj.t] && s.length < 12000, ch = u ? chU : chR;
        if (!ch || ch.readyState !== 'open') return false;
        try { ch.send(s); } catch (e) { return false; }
        if (!u) { var now = Date.now(); sent.push({ t: now, o: obj }); while (sent.length && (now - sent[0].t > 3500 || sent.length > 60)) sent.shift(); }
        return true;
      },
      rtt: function () { return st === 'open' ? rttMs : 0; },
      kick: function () {
        // вернулись из фона: iOS мог убить канал — проверяем и при необходимости поднимаем заново
        if (closed || !peer) return;
        if (st === 'open') { lastIn = Math.min(lastIn, Date.now() - 2500); rawU({ '~': 'pi', n: '_k' }); return; }
        clearTimeout(timerRetry); timerRetry = 0;
        if (host) begin(); else sig({ k: 'q' });
      },
      info: function () {
        if (st === 'open' && !pair) readPair();
        return { state: st, peer: peer, pair: pair, rtt: rttMs, fails: fails, reason: reason, openMs: openAt && startAt ? openAt - startAt : 0, summary: pc ? iceSummary() : '' };
      },
      leave: function () { if (closed) return; closed = true; clearTimeout(timerRetry); clearInterval(timerKa); teardown(); st = 'idle'; peer = null; },
      _closeChannels: function () { try { if (chR) chR.close(); } catch (e) {} }
    };
  }
  g.p2pDirect = p2pDirect;
})(typeof window !== 'undefined' ? window : this);
