// Первая загрузка моделей по медленной сети (по умолчанию 10 Мбит/с) и запасной путь без моделей.
// node qa_models/load.js [Мбит/с]
const fs = require('fs'), http = require('http'), path = require('path');
const pw = require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate = require('D:/games/pw_gate.js');
const ROOT = 'D:/games/tc-wt-models', MB = +(process.argv[2] || 10);
const T = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/json', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(d); }); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const { browser } = await gate.launch(pw, { label: 'qa-models-load' });
  let fails = 0; const ok = (n, c, i) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (i !== undefined ? ' — ' + i : '')); };
  const init = () => { try { localStorage.setItem('tysyacha-nick', 'Тест'); } catch (e) { }
    window.__gap = { max: 0, at: 0, list: [] }; let last = 0; const f = t => { if (last) { const d = t - last; if (d > window.__gap.max) { window.__gap.max = d; window.__gap.at = t; } if (d > 50) window.__gap.list.push([Math.round(t), Math.round(d)]); } last = t; requestAnimationFrame(f); }; requestAnimationFrame(f); };
  try {
    // 1) медленная сеть
    {
      const ctx = await gate.phoneContext(browser, { w: 440, h: 956 }); await ctx.addInitScript(init);
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
      const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: MB * 1e6 / 8, uploadThroughput: 2e6 / 8 });
      let bytes = 0; p.on('response', async r => { if (/assets\/models|GLTFLoader|hero-models/.test(r.url())) { try { bytes += (await r.body()).length; } catch (e) { } } });
      const E = c => p.evaluate(x => window.__ev(x), c);
      const t0 = Date.now(); await p.goto(gate.url(BASE, 'debug'));
      let tSel = 0, tMdl = 0; while (Date.now() - t0 < 60000) { const st = await p.evaluate(() => { try { return [window.__ev("mode==='select'&&!!$('#selPlay')"), window.__ev("!!(hero&&hero.mdl)")]; } catch (e) { return [false, false]; } }); if (st[0] && !tSel) tSel = Date.now() - t0; if (st[1]) { tMdl = Date.now() - t0; break; } await sleep(50); }
      await sleep(2500);
      const g = await p.evaluate(() => window.__gap);
      console.log(`сеть ${MB} Мбит/с: экран выбора ${tSel} мс, модель героя ${tMdl} мс, скачано для моделей ${(bytes / 1024).toFixed(0)} КБ; самый долгий кадр ${g.max.toFixed(0)} мс; кадры >50 мс: ${JSON.stringify(g.list.slice(0, 12))}`);
      ok('модель встала по медленной сети', tMdl > 0);
      ok('ошибок страницы нет', errs.length === 0, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // 2) модели недоступны (сбой/офлайн) — остаётся простой герой, игра идёт
    {
      const ctx = await gate.phoneContext(browser, { w: 440, h: 956 }); await ctx.addInitScript(init);
      await ctx.route(/kk_heroes\.glb/, r => r.abort());
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
      const E = c => p.evaluate(x => window.__ev(x), c);
      await p.goto(gate.url(BASE, 'debug')); const t = Date.now(); while (Date.now() - t < 30000) { try { if (await E("mode==='select'&&!!$('#selPlay')")) break; } catch (e) { } await sleep(100); }
      await sleep(2500);
      ok('без моделей: простой герой на месте', await E("!!(hero&&!hero.mdl&&hero.body.visible&&hero.g.parent)"));
      await p.evaluate(() => document.getElementById('selPlay').click()); await sleep(1500);
      ok('без моделей: игра запускается', await E("mode==='game'"));
      ok('без моделей: ошибок страницы нет', errs.length === 0, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // 3) ?nomdl=1 — модели не грузятся вовсе
    {
      const ctx = await gate.phoneContext(browser, { w: 440, h: 956 }); await ctx.addInitScript(init);
      let req = 0; ctx.on('request', r => { if (/kk_heroes|GLTFLoader|hero-models/.test(r.url())) req++; });
      const p = await ctx.newPage(); await p.goto(gate.url(BASE, 'debug&nomdl=1')); await sleep(3000);
      ok('nomdl=1: запросов моделей нет', req === 0, req);
      await ctx.close();
    }
  } catch (e) { fails++; console.log('FAIL', e && e.stack || e); }
  finally { await browser.close(); srv.close(); }
  console.log(fails ? 'ИТОГ: провалов ' + fails : 'ИТОГ: всё прошло'); process.exitCode = fails ? 1 : 0;
})();
