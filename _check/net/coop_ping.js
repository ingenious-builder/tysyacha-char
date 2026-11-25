// coop_ping.js — кооп двумя контекстами в одном браузере (через замок pw_gate): что показывает пинг-метр
// и с каким реальным опозданием гость видит хозяина (и врагов хоста) на экране.
//   node _check/net/coop_ping.js [p2p|relay|both] [секунд=18]
// p2p   — как в жизни: свой WebRTC (net-p2p.js) поднимется по локальной сети;
// relay — P2P выключен (__NOMYP2P + модуль Trystero не грузится): только канал Supabase, как у игроков за CGNAT.
// Пишет _check/net/out/coop_<режим>.json и снимки _check/net/out/coop_<режим>_{host,guest}.png
const http = require('http'), fs = require('fs'), path = require('path');
const pw = require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate = require('D:/games/pw_gate.js');
const ROOT = path.resolve(__dirname, '../..'), OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const MODE = process.argv[2] || 'both', SEC = +(process.argv[3] || 18);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wasm': 'application/wasm', '.css': 'text/css' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
      fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(b); });
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}
async function page(b, nick, qs, relayOnly) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await ctx.addInitScript(([n, ro]) => { try { localStorage.setItem('tysyacha-nick', n); } catch (e) {} if (ro) window.__NOMYP2P = true; }, [nick, relayOnly]);
  if (relayOnly) await ctx.route('**/vendor/trystero-nostr-*.js', r => r.abort());
  const p = await ctx.newPage();
  p.E = c => p.evaluate(x => window.__ev(x), c);
  p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(BASE + qs);
  for (let i = 0; i < 80; i++) { try { if (await p.evaluate(() => !!window.__ev && typeof CLS !== 'undefined')) break; } catch (e) {} await sleep(250); }
  await sleep(800);
  return p;
}
const waitF = async (p, expr, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 30000)) { try { if (await p.E(expr)) return true; } catch (e) {} await sleep(250); } return false; };
function stat(a) {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y), q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { n: s.length, min: Math.round(s[0]), med: Math.round(q(.5)), p90: Math.round(q(.9)), max: Math.round(s[s.length - 1]) };
}
// опоздание картинки: при каком сдвиге L путь «как видит гость» лучше всего ложится на путь «как было у хоста»
function lag(src, dst) {
  if (src.length < 20 || dst.length < 20) return null;
  const at = (t) => { let lo = 0, hi = src.length - 1; if (t <= src[0][0] || t >= src[hi][0]) return null;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (src[m][0] <= t) lo = m; else hi = m; }
    const A = src[lo], B = src[hi], k = (t - A[0]) / Math.max(1, B[0] - A[0]); return [A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]; };
  let best = null;
  for (let L = 0; L <= 900; L += 5) {
    let s = 0, n = 0;
    for (const [t, x, z] of dst) { const p = at(t - L); if (!p) continue; s += Math.hypot(p[0] - x, p[1] - z); n++; }
    if (n > dst.length * .6) { const e = s / n; if (!best || e < best.err) best = { lagMs: L, err: +e.toFixed(3), n }; }
  }
  return best;
}
let BASE = '';
async function run(b, mode) {
  const relayOnly = mode === 'relay';
  const A = await page(b, 'Хост', '?debug&test=1', relayOnly);
  await A.E("selectClass('pyro')");
  await A.click('#selCoop'); await sleep(500);
  if (await A.isVisible('[data-a=create]').catch(() => false)) await A.click('[data-a=create]');
  await waitF(A, '!!MP.code', 20000);
  const code = await A.E('MP.code');
  const B = await page(b, 'Гость', '?room=' + code + '&debug&test=1', relayOnly);
  if (await B.isVisible('#nickIn').catch(() => false)) { await B.fill('#nickIn', 'Гость'); await B.click('#nickOk'); await sleep(300); }
  await B.E("selectClass('cryo')"); await sleep(300);
  const tJoin = Date.now();
  await B.click('#selJoin');
  const linked = await waitF(A, '!!(MP.peer&&MP.peerId)', 60000) && await waitF(B, '!!(MP.peer&&MP.peerId)', 30000);
  const linkMs = Date.now() - tJoin;
  if (!linked) return { mode, error: 'не связались за 60 с' };
  if (!relayOnly) await waitF(A, "mpVia()==='p2p'", 15000);
  await A.E("mpHostStart('world',0)");
  const inGame = await waitF(A, "mode==='game'", 20000) && await waitF(B, "mode==='game'&&MP.active", 20000);
  if (!inGame) return { mode, error: 'не вошли в игру' };
  await waitF(B, '!!(MP.peer&&MP.peer.on&&MP.peer.hero)', 15000);
  for (const p of [A, B]) await p.E('P.invulnT=1e9;S.auto=true;');
  // нагрузка: 24 врага вокруг хоста; движение хоста по кругу
  await A.E("for(let i=0;i<24;i++){const a=Math.random()*TAU,d=6+Math.random()*6;try{spawnEnemy(['goblin','skeleton','wolf','brute','slime'][i%5],P.pos.x+Math.cos(a)*d,P.pos.z+Math.sin(a)*d,3,{aggro:true});}catch(e){}}");
  await A.E("window.__o0=P.pos.clone();window.__orb=setInterval(()=>{const t=performance.now()/1100;input.moveTo={x:__o0.x+Math.cos(t)*6,z:__o0.z+Math.sin(t)*6};},100);");
  await sleep(1500);
  // запись: хост — свои координаты и координаты 6 врагов; гость — как он видит хоста и тех же врагов
  const uids = await A.E('ENEMIES.filter(e=>!e.dead).slice(0,6).map(e=>e.uid)');
  const REC = (who, u) => `window.__rec={me:[],peer:[],en:{},ping:[],via:[]};window.__recT=setInterval(()=>{const t=Date.now(),R=window.__rec;
    ${who === 'A' ? 'R.me.push([t,P.pos.x,P.pos.z]);for(const e of ENEMIES){if(!e.dead&&' + JSON.stringify(u) + '.includes(e.uid))(R.en[e.uid]||(R.en[e.uid]=[])).push([t,e.pos.x,e.pos.z]);}'
      : 'if(MP.peer)R.peer.push([t,MP.peer.pos.x,MP.peer.pos.z]);for(const [u,e] of MP.byUid){if(!e.dead&&' + JSON.stringify(u) + '.includes(u))(R.en[u]||(R.en[u]=[])).push([t,e.pos.x,e.pos.z]);}'}
    },20);window.__pingT=setInterval(()=>{window.__rec.ping.push(MP.ping||0);window.__rec.via.push(mpVia());},500);
    window.__st0={rel:mpRel?mpRel.status():null,t:performance.now()};
    if(!window.__hmW){window.__hmW=1;const f=mpOnMsg;window.__hm={n:0,t:0,max:0};mpOnMsg=function(m,id){const t=performance.now();try{return f(m,id);}finally{const d=performance.now()-t,H=window.__hm;H.n++;H.t+=d;if(d>H.max)H.max=d;}};}`;
  await A.E(REC('A', uids)); await B.E(REC('B', uids));
  const fps0 = await Promise.all([A, B].map(p => p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); }))));
  await sleep(SEC * 1000);
  const grab = p => p.E("clearInterval(window.__recT);clearInterval(window.__pingT);({rec:window.__rec,st0:window.__st0,st1:mpRel?mpRel.status():null,dt:performance.now()-window.__st0.t,dc:mpDc?mpDc.info():null,net:mpNetDetail(),hud:(document.getElementById('mpLink')||{}).textContent||'',pingQ:MP.pingQ,hm:window.__hm,nj:[Math.round(NJ.p.d),Math.round(NJ.s.d)]})");
  const [ra, rb] = [await grab(A), await grab(B)];
  await A.screenshot({ path: path.join(OUT, `coop_${mode}_host.png`) });
  await B.screenshot({ path: path.join(OUT, `coop_${mode}_guest.png`) });
  const rate = r => r.st1 && r.st0.rel ? { envPerSec: +((r.st1.tx - r.st0.rel.tx) / (r.dt / 1000)).toFixed(1), bytesPerSec: Math.round((r.st1.txBytes - r.st0.rel.txBytes) / (r.dt / 1000)), rxPerSec: +((r.st1.rx - r.st0.rel.rx) / (r.dt / 1000)).toFixed(1), maxBytes: r.st1.maxBytes, qWait: r.st1.qWait, srvRtt: r.st1.srvRtt, held: r.st1.held } : null;
  const hm = r => r.hm && r.hm.n ? { msgs: r.hm.n, avgMs: +(r.hm.t / r.hm.n).toFixed(3), maxMs: +r.hm.max.toFixed(1) } : null;
  const enLag = []; for (const u of uids) { const l = lag((ra.rec.en[u] || []), (rb.rec.en[u] || [])); if (l) enLag.push(l.lagMs); }
  const res = {
    mode, linkMs, fps: fps0, via: [ra.rec.via[ra.rec.via.length - 1], rb.rec.via[rb.rec.via.length - 1]],
    hudHost: ra.hud, hudGuest: rb.hud,
    pingHost: stat(ra.rec.ping.filter(Boolean)), pingGuest: stat(rb.rec.ping.filter(Boolean)),
    peerLag: lag(ra.rec.me, rb.rec.peer), enemyLagMs: stat(enLag),
    relayHost: rate(ra), relayGuest: rate(rb), dcHost: ra.dc, dcGuest: rb.dc,
    handlerHost: hm(ra), handlerGuest: hm(rb), bufferGuest: rb.nj,
    netHost: ra.net, netGuest: rb.net, errs: [...A.errs, ...B.errs].slice(0, 5)
  };
  await A.context().close().catch(() => {}); await B.context().close().catch(() => {});
  return res;
}
(async () => {
  const srv = await serve();
  BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  let browser;
  try {
    ({ browser } = await gate.launch(pw, { label: 'net ping', launch: { args: [...gate.ARGS, '--disable-features=WebRtcHideLocalIpsWithMdns'] } }));
    const modes = MODE === 'both' ? ['p2p', 'relay'] : [MODE];
    for (const m of modes) {
      const r = await run(browser, m);
      const tag = process.env.TAG ? '_' + process.env.TAG : '';
      fs.writeFileSync(path.join(OUT, `coop_${m}${tag}.json`), JSON.stringify(r, null, 1));
      const { netHost, netGuest, dcHost, dcGuest, ...short } = r;
      console.log(JSON.stringify(short, null, 1));
      console.log('--- подробно у гостя ---\n' + netGuest);
    }
  } finally { if (browser) await browser.close().catch(() => {}); srv.close(); }
  setTimeout(() => process.exit(0), 200);
})().catch(e => { console.log('FAIL', e && e.stack || e); process.exit(1); });
