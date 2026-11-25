// unit_net.js — проверки сетевых правок без браузера:
//  1) net-relay.js на поддельном WebSocket: такт (paced), срочные 'now', замена p/s, сторож буфера, отклик heartbeat;
//  2) буфер плавности NetJit + Interp из index.html на смоделированных потоках пакетов (P2P / сервер / рваная сеть):
//     сколько кадров уходит в экстраполяцию и насколько картинка отстаёт — прежние 95/110 мс против подстройки.
//   node _check/net/unit_net.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.resolve(__dirname, '../..');
let fails = 0; const ok = (c, m) => { if (c) console.log('  ок  ', m); else { fails++; console.log('  БРАК', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 1) net-relay ----------
async function relayTests() {
  console.log('net-relay.js');
  const sent = [];
  class FakeWS {
    constructor(url) { this.url = url; this.readyState = 0; this.bufferedAmount = 0; FakeWS.last = this; setTimeout(() => { this.readyState = 1; this.onopen && this.onopen(); }, 5); }
    send(s) { const m = JSON.parse(s); sent.push({ t: performance.now(), m }); if (m.event === 'phx_join') setTimeout(() => this.onmessage({ data: JSON.stringify({ event: 'phx_reply', ref: m.ref, payload: { status: 'ok' } }) }), 5);
      if (m.event === 'heartbeat') setTimeout(() => this.onmessage({ data: JSON.stringify({ event: 'phx_reply', ref: m.ref, topic: 'phoenix', payload: { status: 'ok' } }) }), 40); }
    close() { this.readyState = 3; }
  }
  global.WebSocket = FakeWS; global.window = global;
  new Function(fs.readFileSync(path.join(ROOT, 'net-relay.js'), 'utf8'))();
  const room = global.relayJoin({ appId: 'a', roomId: 'r', selfId: 'me', url: 'ws://x', key: 'k', paced: true });
  const [send] = room.makeAction('m'), [sig] = room.makeAction('sdp', { now: true });
  await sleep(80);
  const env = () => sent.filter(x => x.m.event === 'broadcast' && x.m.payload.payload.k === 'd');
  ok(room.isJoined(), 'подключился');
  ok(room.status().srvRtt >= 35 && room.status().srvRtt < 120, 'отклик сервера по heartbeat сразу после входа: ' + room.status().srvRtt + ' мс (поддельный сервер отвечает за 40)');
  let n0 = env().length;
  send({ t: 'p', x: 1 }, 'peer'); send({ t: 'p', x: 2 }, 'peer'); send({ t: 'fl', s: 'x' }, 'peer');
  await sleep(10);
  ok(env().length === n0, 'по такту: до flush() ничего не ушло');
  room.flush();
  const e1 = env().slice(n0);
  ok(e1.length === 1, 'flush(): один конверт');
  ok(e1.length && e1[0].m.payload.payload.m.length === 2 && e1[0].m.payload.payload.m[0][1].x === 2, 'p заменился свежим, событие рядом: ' + JSON.stringify(e1[0] && e1[0].m.payload.payload.m));
  n0 = env().length; send({ t: 'k', u: 1 }, 'peer'); const tq = performance.now();
  while (env().length === n0 && performance.now() - tq < 300) await sleep(5);
  const dt = performance.now() - tq;
  ok(dt >= 50 && dt < 120, 'без такта — сам через ~60 мс: ' + Math.round(dt) + ' мс');
  n0 = env().length; sig({ k: 'o' }, 'peer');
  ok(env().length === n0 + 1, 'срочное (сигнализация P2P) уходит сразу');
  // сторож буфера: в сокете > 64 КБ — конверт ждёт, p в очереди заменяется
  FakeWS.last.bufferedAmount = 100000; n0 = env().length;
  send({ t: 'p', x: 5 }, 'peer'); room.flush(); await sleep(5);
  ok(env().length === n0 && room.status().held > 0, 'буфер сокета полон — не кладём (held ' + room.status().held + ')');
  send({ t: 'p', x: 6 }, 'peer'); FakeWS.last.bufferedAmount = 0; await sleep(70);
  const e2 = env().slice(n0);
  ok(e2.length === 1 && e2[0].m.payload.payload.m.length === 1 && e2[0].m.payload.payload.m[0][1].x === 6, 'буфер освободился — ушла только свежая позиция');
  // темп: 20 тактов/с + события кадров 60/с -> конвертов ~20/с
  n0 = env().length; const t0 = performance.now();
  const fr = setInterval(() => send({ t: 'fl', s: 'x' }, 'peer'), 16), tk = setInterval(() => { send({ t: 'p', x: Math.random() }, 'peer'); room.flush(); }, 50);
  await sleep(1000); clearInterval(fr); clearInterval(tk);
  const rate = (env().length - n0) / ((performance.now() - t0) / 1000);
  ok(rate <= 22.5, 'конвертов в секунду при событиях каждый кадр: ' + rate.toFixed(1) + ' (было бы 24+ — потолок ведра)');
  ok(room.status().qWait < 60, 'ожидание в очереди ~' + room.status().qWait + ' мс');
  room.leave();
  // без paced — старое поведение (микрозадача)
  const room2 = global.relayJoin({ appId: 'a', roomId: 'r2', selfId: 'me2', url: 'ws://x', key: 'k' });
  const [send2] = room2.makeAction('m'); await sleep(60); n0 = env().length;
  send2({ t: 'k', u: 2 }, 'peer'); await sleep(0); await Promise.resolve();
  ok(env().length === n0 + 1, 'без paced конверт уходит в той же задаче (как раньше)');
  room2.leave();
}

// ---------- 2) буфер плавности ----------
function interpTests() {
  console.log('NetJit + Interp (index.html)');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const a = html.indexOf('function Interp(){'), b = html.indexOf('// ---------- ник ----------');
  assert(a > 0 && b > a, 'не нашёл Interp/NetJit в index.html');
  let clock = 0; const perf = { now: () => clock };
  const mod = new Function('performance', html.slice(a, b) + '\nreturn {Interp,NetJit,NJ,PEER_DELAY,ENEMY_DELAY};')(perf);
  // поток: отправка раз в ~50 мс (такт телефона пляшет ±jit кадр), задержка base + случайный разброс, потери loss
  function run(name, o, fixedDelay) {
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const ib = new mod.Interp(), nj = new mod.NetJit(50, fixedDelay), out = { x: 0, z: 0 };
    const pos = t => [Math.cos(t / 1100) * 6, Math.sin(t / 1100) * 6]; // как ходит хост в coop_ping.js
    const pk = []; let ts = 1000;
    for (let i = 0; i < 1600; i++) { ts += 50 + (rnd() - .5) * 2 * (o.tickJit || 0); if (rnd() < (o.loss || 0)) continue;
      let d = o.base + rnd() * o.jit; if (o.spike && rnd() < o.spike) d += 150 + rnd() * 150; pk.push([ts + d, ts]); }
    pk.sort((x, y) => x[0] - y[0]);
    const res = {};
    for (const mode of ['fixed', 'adapt']) {
      const ib2 = new mod.Interp(), nj2 = new mod.NetJit(50, fixedDelay);
      let k = 0, ext = 0, frames = 0, deep = [], dSum = 0;
      for (clock = 2000; clock < 80000; clock += 16.7) {
        while (k < pk.length && pk[k][0] <= clock) { const [, t] = pk[k++]; const p = pos(t); ib2.push(t, p[0], p[1]); nj2.push(t); }
        if (clock < 6000) continue;
        const d = mode === 'fixed' ? fixedDelay : nj2.d; dSum += d;
        ib2.at(d, out); frames++;
        const T = clock - ib2.off - d, L = ib2.b[ib2.b.length - 1];
        if (L && T > L[0]) { ext++; deep.push(T - L[0]); } // пакета ещё нет — рисуем по скорости (экстраполяция), на сколько мс вперёд
      }
      deep.sort((x, y) => x - y);
      res[mode] = { delay: Math.round(dSum / frames), extrap: +(ext / frames * 100).toFixed(1), deep: Math.round(deep.length ? deep[Math.floor(deep.length * .99)] : 0) };
    }
    console.log(`  ${name.padEnd(34)} прежний ${fixedDelay} мс: экстраполяция ${res.fixed.extrap}% кадров (до ${res.fixed.deep} мс) | подстройка: ${res.adapt.delay} мс, экстраполяция ${res.adapt.extrap}% (до ${res.adapt.deep} мс)`);
    return res;
  }
  const P = mod.PEER_DELAY, E = mod.ENEMY_DELAY;
  let r = run('P2P рядом (база 15, разброс 0–8)', { base: 15, jit: 8, tickJit: 4 }, P);
  ok(r.adapt.delay <= 75 && r.adapt.extrap < 3, 'P2P: буфер ' + r.adapt.delay + ' мс вместо ' + P + ', дёрганья нет');
  r = run('P2P телефон (такт ±17, разброс 0–25)', { base: 25, jit: 25, tickJit: 17 }, P);
  ok(r.adapt.delay < P && r.adapt.extrap < 3, 'телефон P2P: ' + r.adapt.delay + ' мс');
  r = run('сервер (база 100, разброс 0–40, 1% потерь)', { base: 100, jit: 40, tickJit: 10, loss: .01 }, P);
  ok(r.adapt.delay <= P && r.adapt.extrap <= r.fixed.extrap + 1.5, 'сервер: ' + r.adapt.delay + ' мс, не хуже прежнего');
  r = run('рваная (всплески +150–300 мс у 3%)', { base: 60, jit: 30, tickJit: 10, spike: .03 }, P);
  ok(r.adapt.delay <= P && r.adapt.extrap <= r.fixed.extrap + 1.5, 'рваная: ' + r.adapt.delay + ' мс, не хуже прежнего');
  r = run('враги P2P (снимки, разброс 0–10)', { base: 15, jit: 10, tickJit: 4 }, E);
  ok(r.adapt.delay <= 78 && r.adapt.extrap < 3, 'враги P2P: ' + r.adapt.delay + ' мс вместо ' + E);
}

// ---------- 3) напарник вернулся после перезагрузки; пинг привязан к каналу; статус раз в секунду ----------
function rejoinTests() {
  console.log('NetJit: напарник перезагрузил страницу');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const a = html.indexOf('function Interp(){'), b = html.indexOf('// ---------- ник ----------');
  let clock = 0; const perf = { now: () => clock };
  const M = new Function('performance', html.slice(a, b) + ';return {NetJit};')(perf);
  const nj = new M.NetJit(50, 95); let ts = 600000;
  for (clock = 1000; clock < 21000; clock += 50) { ts += 50; nj.push(ts - 10); }
  const d1 = nj.d; let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const n0 = nj.n; let ts2 = 3000; // новые часы гостя, канал через сервер (100–180 мс)
  for (let i = 0; i < 1200; i++) { clock += 50; ts2 += 50; nj.push(ts2 - 100 - rnd() * 80); }
  ok(d1 < 70 && nj.d >= 90 && nj.n > 0 && nj.pts > 3000 && nj.pts < 70000, 'после P2P буфер ' + Math.round(d1) + ' мс; вернулся через сервер — подстроился до ' + Math.round(nj.d) + ' мс (пакетов принято ' + nj.n + ')');
  const nj2 = new M.NetJit(50, 95); ts = 1000; for (clock = 1000; clock < 3000; clock += 50) { ts += 50; nj2.push(ts); }
  const n1 = nj2.n; nj2.push(ts - 1500); nj2.push(ts - 40);
  ok(nj2.n === n1 && nj2.pts === ts, 'старый пакет (на 1,5 с и на 40 мс раньше) просто отброшен, буфер не сброшен');
}
async function pingChanTests() {
  console.log('пинг по каналу и обновление статуса (mpTick)');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const cut = (from, to) => { const i = html.indexOf(from), j = html.indexOf(to, i + 1); if (i < 0 || j < 0) throw new Error('нет ' + from); return html.slice(i, j); };
  const src = cut('function mpPingCh(', 'function mpVia(') + cut('function mpVia(', 'function mpProbeNostr(') + cut('function mpTick(', 'function mpSendPos(') + cut('function lobNetText(', 'function lobRefreshNet(');
  let clock = 0, refresh = 0; const relPings = [];
  const env = { MP: { peerId: 'g', pingQ: [], pingRaw: 0, pingCh: '', ping: 0, pingAt: 0, lastRx: 0, kaAt: 0, active: false, role: 'host' },
    dcOpen: false, dcRtt: 0, P2P: new Set(), Srv: new Set(['g']) };
  const factory = new Function('E', 'performance', '$', 'mpRefreshNet', 'mpSend', 'mpPeerGone',
    'let MP=E.MP,mode="camp",MPH=false,mpTry=null,mpP2P=E.P2P,mpSrv=E.Srv;' +
    'let mpDc={isOpen:()=>E.dcOpen,rtt:()=>E.dcRtt};' +
    'let mpRel={flush(){},ping(id){return new Promise(r=>E.relPings.push(r));}};' + src + ';return {mpTick,lobNetText,mpPingSync};');
  env.relPings = relPings;
  const F = factory(env, { now: () => clock }, () => ({ hidden: false }), () => refresh++, () => {}, () => {});
  const tick = async n => { for (let i = 0; i < n; i++) { clock += 50; env.MP.lastRx = clock; F.mpTick(); await Promise.resolve(); } };
  await tick(100);
  ok(refresh === 5, 'статус связи и значок лобби обновляются раз в секунду: ' + refresh + ' раз за 5 с (было 0 — условие !(n)%20)');
  while (relPings.length) relPings.shift()(410); await Promise.resolve(); await Promise.resolve();
  ok(env.MP.ping === 410 && F.lobNetText() === 'Сервер · 410 мс', 'через сервер: ' + F.lobNetText());
  await tick(40); const late = relPings.splice(0); // замер через сервер ещё в пути
  env.dcOpen = true; env.dcRtt = 0; await tick(1);
  ok(env.MP.ping === 0 && F.lobNetText() === 'P2P', 'P2P открылся, понга ещё нет: «' + F.lobNetText() + '» — без старой цифры сервера');
  late.forEach(r => r(420)); await Promise.resolve(); await Promise.resolve();
  ok(env.MP.ping === 0, 'опоздавший замер старого канала не подставился');
  env.dcRtt = 6; await tick(1);
  ok(F.lobNetText() === 'P2P · 6 мс', 'первый понг P2P: «' + F.lobNetText() + '»');
  env.dcOpen = false; await tick(1);
  ok(env.MP.ping === 0 && relPings.length === 1, 'P2P закрылся: цифра P2P снята, замер через сервер ушёл сразу');
}

(async () => {
  await relayTests();
  interpTests();
  rejoinTests();
  await pingChanTests();
  console.log(fails ? 'ИТОГ: брак ' + fails : 'ИТОГ: всё ок');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('FAIL', e && e.stack || e); process.exit(1); });
