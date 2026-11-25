// Браузерный замер реального урона чар (через замок D:/games/pw_gate.js, один браузер).
// measure(корень игры, {jobs:[{id,scen,cls,seed?,T?,withK?,lvl?,tag?}], progress?, evals?}) → {sc, rows:[{id,scen,cls,dps,cyc}], errs}
const path = require('path'), fs = require('fs'), http = require('http');
const PW = 'C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core';
const gate = require('D:/games/pw_gate.js');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json', '.webmanifest': 'application/json' };

async function measure(root, opts = {}) {
  const pw = require(PW);
  const srv = http.createServer((q, r) => {
    let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
    if (f.endsWith(path.sep) || f.endsWith('/')) f += 'index.html';
    fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); });
  }).listen(0);
  const { browser } = await gate.launch(pw, { label: 'power_check' });
  const errs = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 400, height: 700 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(() => { try { localStorage.setItem('tysyacha-nick', 'Тест'); } catch (e) {} });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('c:' + m.text().slice(0, 160)); });
    await p.goto(`http://127.0.0.1:${srv.address().port}/index.html?debug&test=1`);
    await p.waitForFunction(() => !!window.__tc && !!window.__ev && !!document.getElementById('selPlay'), null, { timeout: 60000 });
    await p.evaluate(() => window.__tc.sel(window.__CLS0 || 'windr'));
    await p.evaluate(() => document.getElementById('selPlay').click());
    await p.waitForFunction(() => window.__tc.state().mode === 'game', null, { timeout: 30000 });
    // уровень на старте мог открыть окно выбора — закрываем, потом замораживаем цикл игры (без отрисовки)
    for (let k = 0; k < 6; k++) { const o = await p.evaluate(() => window.__tc.lu().open); if (!o) break; await p.evaluate(() => document.getElementById('luAuto').click()); await p.waitForTimeout(300); }
    await p.evaluate(() => window.__ev('bookOpen=true;luQueue=0;S.lvl=1;S.xp=0;S.talents={};S.ranks={};S.mx=0;computeStats();recalcStats();'));
    const code = fs.readFileSync(path.join(__dirname, 'sim_page.js'), 'utf8');
    await p.evaluate(c => window.__ev(c), code);
    const sc = await p.evaluate(() => window.__ev('__sim.SC'));
    if (opts.evals) { const out = []; for (const c of opts.evals) out.push(await p.evaluate(c => { try { return window.__ev(c); } catch (e) { return 'ОШИБКА ' + e.message; } }, c)); await ctx.close(); return { sc, evals: out, errs }; }
    const jobs = opts.jobs;
    const rows = [];
    const t0 = Date.now();
    const B = 24;
    for (let i = 0; i < jobs.length; i += B) {
      const part = jobs.slice(i, i + B);
      const r = await p.evaluate(list => window.__ev('__sim.batch(' + JSON.stringify(list) + ')'), part);
      rows.push(...r);
      if (opts.progress) opts.progress(rows.length, jobs.length, Date.now() - t0);
      if (Date.now() - t0 > (opts.maxMs || 9.5 * 60e3)) { errs.push('остановлено по времени: ' + rows.length + '/' + jobs.length); break; }
    }
    await ctx.close();
    return { sc, rows, errs };
  } finally { await browser.close(); srv.close(); }
}
module.exports = { measure };
