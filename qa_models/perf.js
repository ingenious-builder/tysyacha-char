// Замер FPS: телефон 440×956, бой с толпой (30 врагов вокруг, герой бессмертен, авто-бой). Одинаковая сцена для «до» и «после».
// node qa_models/perf.js <корень> <метка> [классы через запятую]
const fs = require('fs'), http = require('http'), path = require('path');
const pw = require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate = require('D:/games/pw_gate.js');
const ROOT = process.argv[2], TAG = process.argv[3] || 'x', CLS = (process.argv[4] || 'pyro,bers,windr').split(',');
const THROTTLE = process.env.THROTTLE ? +process.env.THROTTLE : 0; // Мбит/с — для замера первой загрузки модели
const T = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/json', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(d); }); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const { browser } = await gate.launch(pw, { label: 'qa-models-perf-' + TAG });
  const res = {};
  try {
    for (const cls of CLS) {
      const ctx = await gate.phoneContext(browser, { w: 440, h: 956 });
      await ctx.addInitScript(() => {
        try { localStorage.setItem('tysyacha-nick', 'Тест'); } catch (e) { }
        let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
      if (THROTTLE) { const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: THROTTLE * 1e6 / 8, uploadThroughput: 2e6 / 8 }); }
      const E = c => p.evaluate(x => window.__ev(x), c);
      const waitF = async (expr, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 20000)) { try { if (await E(expr)) return true; } catch (e) { } await sleep(100); } return false; };
      const t0 = Date.now();
      await p.goto(gate.url(BASE, 'debug')); await waitF("mode==='select'&&!!$('#selPlay')", 60000);
      const tSel = Date.now() - t0;
      await E(`selectClass('${cls}')`);
      let tMdl = null; if (await E("typeof HM!=='undefined'")) { const t1 = Date.now(); const ok = await waitF("!!(hero&&hero.mdl)", 60000); tMdl = ok ? Date.now() - t1 : -1; }
      await p.evaluate(() => document.getElementById('selPlay').click()); await waitF("mode==='game'", 15000); await sleep(800);
      await E("luQueue=0;luOpen=false;$('#lvlup').hidden=true;hideUpg();syncPause();S.autoLu=true;S.auto=true;syncAuto();P.invulnT=1e9;spawnBoss=function(){};spawnPack=function(){};");
      // толпа: 30 врагов кольцом, поддерживаем число
      await E("window.__crowd=()=>{const ids=Object.keys(MOBS).filter(k=>!MOBS[k].boss&&!MOBS[k].as).slice(0,4);let n=ENEMIES.filter(e=>!e.dead).length,i=0;while(n<30){const a=(i++)*2.4,d=4+(i%5)*1.6;spawnEnemy(ids[i%ids.length],P.pos.x+Math.cos(a)*d,P.pos.z+Math.sin(a)*d,1+(i%3));n++;}};__crowd();window.__crI=setInterval(__crowd,500);");
      await sleep(3000);
      // замер 10 с: FPS и время JS-кадра
      await E("window.__pf={n:0,js:0,max:0,t0:performance.now()};const _l0=loop;loop=function(now){const t=performance.now();_l0(now);const d=performance.now()-t;__pf.n++;__pf.js+=d;if(d>__pf.max)__pf.max=d;};");
      await sleep(10000);
      const r = await E("(()=>{const t=(performance.now()-__pf.t0)/1000;return {fps:+(__pf.n/t).toFixed(1),jsMs:+(__pf.js/__pf.n).toFixed(2),jsMax:+__pf.max.toFixed(1),enemies:ENEMIES.length,calls:renderer.info.render.calls,tris:renderer.info.render.triangles,mdl:!!(hero&&hero.mdl)};})()");
      r.tSelMs = tSel; r.tModelMs = tMdl; r.errs = errs.slice(0, 3);
      res[cls] = r; console.log(TAG, cls, JSON.stringify(r));
      await ctx.close();
    }
  } catch (e) { console.log('FAIL', e && e.stack || e); process.exitCode = 1; }
  finally { await browser.close(); srv.close(); }
  fs.appendFileSync('D:/games/tc-wt-models/qa_models/perf_log.txt', new Date().toISOString() + ' ' + TAG + ' ' + (THROTTLE ? 'throttle ' + THROTTLE + 'Mbit ' : '') + JSON.stringify(res) + '\n');
})();
