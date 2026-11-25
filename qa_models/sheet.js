// Лист всех 20 героев: экран выбора (спереди) и в игре крупно (спереди и в ¾). Телефон 440×956.
// node qa_models/sheet.js before|after [корень]  → qa_models/<tag>/*.png и листы qa_models/<tag>_*.png (склейка — sheet.py)
const fs = require('fs'), http = require('http'), path = require('path');
const pw = require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate = require('D:/games/pw_gate.js');
const TAG = process.argv[2] || 'after', ROOT = process.argv[3] || 'D:/games/tc-wt-models', OUT = 'D:/games/tc-wt-models/qa_models/' + TAG + '/';
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/json', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(d); }); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const { browser } = await gate.launch(pw, { label: 'qa-models-sheet-' + TAG });
  const meta = {};
  try {
    const ctx = await gate.phoneContext(browser, { w: 440, h: 956 });
    await ctx.addInitScript(() => { try { localStorage.setItem('tysyacha-nick', 'Тест'); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const E = c => p.evaluate(x => window.__ev(x), c);
    const waitF = async (expr, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 20000)) { try { if (await E(expr)) return true; } catch (e) { } await sleep(150); } return false; };
    await p.goto(gate.url(BASE, 'debug')); await waitF("mode==='select'&&!!$('#selPlay')", 30000);
    const ids = await E("CLASSES.map(c=>c.id)");
    const hasHM = await E("typeof HM!=='undefined'");
    const waitModel = async () => { if (hasHM) { const ok = await waitF("!!(hero&&hero.mdl)", 15000); if (!ok) console.log('  модель не встала'); } };
    const proj = () => E("(()=>{const v=hero.g.position.clone();v.y+=1.05;v.project(camera);return [Math.round((v.x+1)/2*innerWidth),Math.round((1-v.y)/2*innerHeight)];})()");
    // 1) экран выбора
    for (const id of ids) {
      if (ONLY && !ONLY.includes(id)) continue;
      await E(`selectClass('${id}')`); await waitModel(); await E("selFx=99;P.castT=0"); await sleep(900);
      meta[id] = { sel: await proj() };
      await p.screenshot({ path: OUT + 'sel_' + id + '.png' });
    }
    // 2) в игре крупно
    await E("selectClass('" + ids[0] + "')"); await waitModel();
    await p.evaluate(() => document.getElementById('selPlay').click()); await waitF("mode==='game'", 15000); await sleep(500);
    await E("luQueue=0;luOpen=false;$('#lvlup').hidden=true;hideUpg();syncPause();clearWorld();updateEnemies=function(){};spawnBoss=function(){};P.invulnT=1e9;$('#hud').hidden=true;camera.clearViewOffset();" +
      "window.__cy=0;updateCamera=function(dt){const a=P.face+(window.__cy||0),d=4.4,ty=1.0;camera.position.set(P.pos.x+Math.sin(a)*d,ty+.75,P.pos.z+Math.cos(a)*d);camera.lookAt(P.pos.x,ty,P.pos.z);sky.position.copy(camera.position);};");
    for (const id of ids) {
      if (ONLY && !ONLY.includes(id)) continue;
      await E(`setClass('${id}');P.face=0;P.castT=0;P.swingT=0;$('#hud').hidden=true;`); await waitModel(); await sleep(900);
      await E("window.__cy=0"); await sleep(250); await p.screenshot({ path: OUT + 'game_front_' + id + '.png' });
      await E("window.__cy=Math.PI/4"); await sleep(250); await p.screenshot({ path: OUT + 'game_34_' + id + '.png' });
      await E("window.__cy=Math.PI"); await sleep(250); await p.screenshot({ path: OUT + 'game_back_' + id + '.png' });
    }
    fs.writeFileSync(OUT + 'meta.json', JSON.stringify(meta));
    console.log('ошибки страницы:', errs.length ? errs.slice(0, 8).join(' | ') : 'нет');
  } catch (e) { console.log('FAIL', e && e.stack || e); process.exitCode = 1; }
  finally { await browser.close(); srv.close(); }
})();
