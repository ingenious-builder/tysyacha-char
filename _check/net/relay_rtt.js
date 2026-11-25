// Замер задержки канала «через сервер» (Supabase Realtime broadcast) с этого ПК, без браузера.
// Протокол тот же, что в net-relay.js (Phoenix vsn 1.0.0, broadcast self:false/ack:false).
//   node _check/net/relay_rtt.js [число замеров=40]
// Печатает: (1) пинг игрок→сервер→игрок→сервер→игрок, как его меряет игра в режиме «через сервер» (4 участка);
//           (2) эхо своего broadcast (self:true) — игрок→сервер→игрок (2 участка);
//           (3) heartbeat Phoenix — до сервера и обратно без рассылки.
const URL_ = 'wss://mugzpapozmuryzkfqldr.supabase.co/realtime/v1/websocket';
const KEY = 'sb_publishable_2vCpEK1hJ3X-pmTtjbY8ZA_w9WUdvUu';
const N = +(process.argv[2] || 40);
const topic = 'realtime:nettest-' + Math.random().toString(36).slice(2, 8);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = () => performance.now();
let ref = 1;

function client(name, self) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(URL_ + '?apikey=' + encodeURIComponent(KEY) + '&vsn=1.0.0');
    const c = { ws, name, waits: {}, onEnv: null };
    c.raw = (ev, payload, r) => ws.send(JSON.stringify({ topic: ev === 'heartbeat' ? 'phoenix' : topic, event: ev, payload: payload || {}, ref: r === undefined ? String(ref++) : r }));
    c.bc = env => c.raw('broadcast', { type: 'broadcast', event: 'tc', payload: env }, null);
    let joinRef = '';
    ws.onopen = () => { joinRef = String(ref++); c.raw('phx_join', { config: { broadcast: { self, ack: false }, presence: { key: '' }, private: false } }, joinRef); };
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.event === 'phx_reply') {
        if (m.ref === joinRef) { if (m.payload.status === 'ok') res(c); else rej(new Error(JSON.stringify(m.payload))); }
        else if (c.waits[m.ref]) { c.waits[m.ref](); delete c.waits[m.ref]; }
      } else if (m.event === 'broadcast' && m.payload && m.payload.event === 'tc') { c.onEnv && c.onEnv(m.payload.payload); }
    };
    ws.onerror = e => rej(e);
    setTimeout(() => rej(new Error('таймаут подключения ' + name)), 10000);
  });
}
function stat(a) {
  const s = a.slice().sort((x, y) => x - y), q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, min: Math.round(s[0]), med: Math.round(q(.5)), p90: Math.round(q(.9)), max: Math.round(s[s.length - 1]) };
}
(async () => {
  const t0 = now();
  const A = await client('A', false), B = await client('B', false), C = await client('C', true);
  console.log('подключение трёх клиентов:', Math.round(now() - t0), 'мс; тема', topic);
  B.onEnv = env => { if (env.k === 'pi' && env.i === 'A') B.bc({ k: 'po', n: env.n, i: 'B', to: 'A' }); };
  const pend = {}, rtt4 = [], rtt2 = [], hb = [];
  A.onEnv = env => { if (env.k === 'po' && pend[env.n]) { rtt4.push(now() - pend[env.n]); delete pend[env.n]; } };
  const echo = {};
  C.onEnv = env => { if (env.k === 'e' && echo[env.n]) { rtt2.push(now() - echo[env.n]); delete echo[env.n]; } };
  await sleep(500);
  for (let i = 0; i < N; i++) {
    const n = 'x' + i; pend[n] = now(); A.bc({ k: 'pi', n, i: 'A' });
    const e = 'e' + i; echo[e] = now(); C.bc({ k: 'e', n: e, i: 'C' });
    const r = String(ref++), th = now(); A.waits[r] = () => hb.push(now() - th); A.raw('heartbeat', {}, r);
    await sleep(350);
  }
  await sleep(1500);
  const out = { when: new Date().toISOString(), pingCoop4: stat(rtt4), echo2: stat(rtt2), heartbeat: stat(hb), lost4: N - rtt4.length };
  console.log(JSON.stringify(out, null, 1));
  for (const c of [A, B, C]) try { c.ws.close(); } catch (e) {}
  setTimeout(() => process.exit(0), 300);
})().catch(e => { console.error('ошибка', e && e.message || e); process.exit(1); });
