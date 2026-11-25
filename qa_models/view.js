// Снимки смотрелки моделей: node qa_models/view.js out1.png "ids=..&view=front" [out2.png "..."]...
const fs = require('fs'), http = require('http'), path = require('path');
const pw = require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate = require('D:/games/pw_gate.js');
const ROOT = 'D:/games/tc-wt-models';
const T = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(d); }); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/qa_models/viewer.html?';
  const { browser } = await gate.launch(pw, { label: 'qa-models-view' });
  try {
    const p = await browser.newPage({ viewport: { width: 1400, height: 1500 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    const a = process.argv.slice(2);
    for (let i = 0; i < a.length; i += 2) {
      await p.goto(BASE + a[i + 1]); const t = Date.now();
      while (!(await p.evaluate(() => window.__done)) && Date.now() - t < 30000) await sleep(100);
      const info = await p.evaluate(() => ({ err: window.__err, run: window.HM && HM.runDbg, runV: window.HM && HM.runV }));
      const el = await p.$('canvas'); await el.screenshot({ path: a[i] });
      console.log(a[i], JSON.stringify(info));
    }
    if (errs.length) console.log('ошибки:', errs.slice(0, 10).join(' | '));
  } catch (e) { console.log('FAIL', e && e.stack || e); }
  finally { await browser.close(); srv.close(); }
})();
