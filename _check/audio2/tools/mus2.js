// Музыка боя после рецензии 26.11 (через замок D:/games/pw_gate.js, один браузер): node mus2.js
// 1) громкость на выходе (измеритель ?debug): затишье, волна inten 1 и 2 — запись против прежнего синтеза (battle.mp3 закрыт)
// 2) запись пришла посреди волны: синтез → запись на такте, без провала громкости и без ошибок; ранняя загрузка (до волны)
const path = require('path'), fs = require('fs'), http = require('http');
const PW = 'C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core';
const gate = require('D:/games/pw_gate.js');
const ROOT = 'D:/games/tc-wt-audio2';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const pw = require(PW);
  const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/') || f.endsWith(path.sep)) f += 'index.html';
    fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
  const base = `http://127.0.0.1:${srv.address().port}/index.html`;
  const { browser } = await gate.launch(pw, { label: 'audio2_mus2' }); const R = {};
  try {
    const meterDb = async (p, ms) => { const t0 = Date.now(); let e = 0, n = 0;
      while (Date.now() - t0 < ms) { const m = await p.evaluate(() => window.TCSND.dbg.meter()); if (m) { e += m.rms * m.rms; n++; } await sleep(110); }
      return +(10 * Math.log10(e / Math.max(1, n) + 1e-12)).toFixed(2); };
    const lvl = async (p, w, k, ms) => { await p.evaluate(k => window.TCSND.dbg.inten(k), k); await p.evaluate(w => window.TCSND.dbg.force(w), w); await sleep(5000);
      const db = await meterDb(p, ms); const st = await p.evaluate(() => window.TCSND.state()); return { rmsDb: db, batRec: st.batRec, mus: st.mus }; };
    async function open(route) {
      const ctx = await gate.phoneContext(browser, { w: 440, h: 956 }); if (route) await ctx.route(/assets\/audio\/battle/, route);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.goto(base + '?test=1&debug&snd=1'); await p.waitForFunction(() => !!window.TCSND && !!document.getElementById('selPlay'), null, { timeout: 60000 });
      await p.touchscreen.tap(220, 300); await sleep(1500); await p.evaluate(() => window.TCSND.dbg.set({ sfx: 0, amb: 0, mus: 45 })); return { ctx, p, errs };
    }
    // 1) громкость: запись (ранняя загрузка — без force) и синтез
    for (const [name, route] of (process.argv[2] === 'switch' ? [] : [['rec', null], ['syn', r => r.fulfill({ status: 404, body: '' })]])) {
      const { ctx, p, errs } = await open(route);
      if (name === 'rec') { const t0 = Date.now(); await p.waitForFunction(() => window.TCSND.dbg.rec().bat, null, { timeout: 30000 }).catch(() => { });
        R.rec_early = { loadedBeforeWave: await p.evaluate(() => window.TCSND.dbg.rec().bat), ms: Date.now() - t0, mus: await p.evaluate(() => window.TCSND.state().mus) }; }
      R[name + '_calm'] = await lvl(p, 'calm', 0, 10000);
      R[name + '_tense1'] = await lvl(p, 'tense', 1, 20000);
      R[name + '_tense2'] = await lvl(p, 'tense', 2, 20000);
      R[name + '_errs'] = errs.slice(0, 5); await ctx.close();
    }
    // 2) запись догружается посреди волны
    { let release; const hold = new Promise(r => release = r);
      const { ctx, p, errs } = await open(async r => { await hold; await r.continue(); });
      await p.evaluate(() => window.TCSND.dbg.force('tense')); await sleep(3000);
      const before = await p.evaluate(() => window.TCSND.state().batRec);
      const pre = await meterDb(p, 3000); const t0 = Date.now() + 6000; const trace = []; let rel = false;
      while (Date.now() - t0 < 15000) { if (!rel && Date.now() >= t0) { rel = true; release(); } const s = await p.evaluate(() => { const m = window.TCSND.dbg.meter(); return { rec: window.TCSND.state().batRec, rms: m ? m.rms : 0 }; });
        trace.push([Date.now() - t0, s.rec, +(20 * Math.log10(s.rms + 1e-9)).toFixed(1)]); await sleep(50); }
      const sw = trace.find(v => v[1]); const after = await meterDb(p, 6000);
      // провал громкости у перехода: самое тихое окно 0,4 с вокруг перехода против среднего до
      // сравнение с обычными местами: самое тихое окно у перехода (±0,5 с) против самых тихих окон чистого синтеза (до −0,6 с) и чистой записи (после +0,6 с)
      const mn = f => { const w = trace.filter(f).map(v => v[2]); return w.length ? Math.min(...w) : null; };
      const pct = (f, q) => { const w = trace.filter(f).map(v => v[2]).sort((a, b) => a - b); return w.length ? w[Math.floor(q * (w.length - 1))] : null; };
      const S = sw ? sw[0] : 0;
      R.switch = { synthBefore: !before, switchedAfterMs: sw ? S : null, preDb: pre, afterDb: after,
        nearMin: mn(v => Math.abs(v[0] - S) <= 500), synthMin: mn(v => v[0] < S - 600), synthP10: pct(v => v[0] < S - 600, .1), recMin: mn(v => v[0] > S + 600), recP10: pct(v => v[0] > S + 600, .1), synthP95: pct(v => v[0] < S - 600, .95), recP95: pct(v => v[0] > S + 600, .95), synthMax: Math.max(...trace.filter(v => v[0] < S - 600).map(v => v[2])), recMax: Math.max(...trace.filter(v => v[0] > S + 600).map(v => v[2])), nearMax: Math.max(...trace.filter(v => Math.abs(v[0] - S) <= 800).map(v => v[2])),
        near: trace.filter(v => Math.abs(v[0] - S) <= 700).map(v => [v[0] - S, v[2]]), errs: errs.slice(0, 5) };
      await ctx.close(); }
  } finally { await browser.close(); srv.close(); }
  fs.writeFileSync(path.join(__dirname, '..', process.argv[2] === 'switch' ? 'mus2_switch.json' : 'mus2.json'), JSON.stringify(R, null, 1)); console.log(JSON.stringify(R, null, 1));
}
main().catch(e => { console.error('СБОЙ', e); process.exit(1); });
