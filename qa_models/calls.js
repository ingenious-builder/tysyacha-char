// Задержка кадра при смене героя на экране выбора (новая модель, перекраска, шейдеры) — по всем 20.
const fs = require('fs'), http = require('http'), path = require('path');
const pw = require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate = require('D:/games/pw_gate.js');
const ROOT = process.argv[2] || 'D:/games/tc-wt-models';
const T = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/json', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(d); }); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const { browser } = await gate.launch(pw, { label: 'qa-models-switch' });
  try {
    const ctx = await gate.phoneContext(browser, { w: 440, h: 956 });
    await ctx.addInitScript(() => { try { localStorage.setItem('tysyacha-nick', 'Тест'); } catch (e) { } });
    const p = await ctx.newPage(); const E = c => p.evaluate(x => window.__ev(x), c);
    await p.goto(gate.url(BASE, 'debug')); const t = Date.now(); while (Date.now() - t < 30000) { try { if (await E("mode==='select'&&!!$('#selPlay')&&(typeof HM==='undefined'||!!(hero&&hero.mdl))")) break; } catch (e) { } await sleep(100); }
    await sleep(1500);
    const ids = await E("CLASSES.map(c=>c.id)"); const out = [];
    for (const id of ids) {
      await E(`selectClass('${id}')`); const r = await E("(()=>{let a=0,b=0,t=0;(hero.pbody||hero.body).traverse(o=>{if(o.isMesh)a++;});if(hero.mdl)hero.mdl.inner.traverse(o=>{if(o.isMesh){b++;const g=o.geometry;t+=(g.index?g.index.count:g.attributes.position.count)/3;}});return [a,b,Math.round(t)];})()");
      out.push(id + ':' + r[0] + '→' + r[1] + '(' + r[2] + 'т)');
    }
    console.log('мешей у героя (простой → модель):', out.join(' '));
  } catch (e) { console.log('FAIL', e && e.stack || e); }
  finally { await browser.close(); srv.close(); }
})();
