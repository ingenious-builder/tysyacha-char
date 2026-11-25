// Модели во втором герое: 3D-лобби (напарник и силуэт) и напарник в игре (имитация MP.peer без сети).
// node qa_models/lobby.js → qa_models/after/lobby_*.png, coop_*.png
const fs = require('fs'), http = require('http'), path = require('path');
const pw = require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate = require('D:/games/pw_gate.js');
const ROOT = 'D:/games/tc-wt-models', OUT = ROOT + '/qa_models/after/'; fs.mkdirSync(OUT, { recursive: true });
const T = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/json', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(d); }); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const { browser } = await gate.launch(pw, { label: 'qa-models-lobby' });
  let fails = 0; const ok = (n, c, i) => { if (!c) fails++; console.log((c ? 'OK   ' : 'FAIL ') + n + (i !== undefined ? ' — ' + i : '')); };
  try {
    const ctx = await gate.phoneContext(browser, { w: 440, h: 956 });
    await ctx.addInitScript(() => { try { localStorage.setItem('tysyacha-nick', 'Тест'); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const E = c => p.evaluate(x => window.__ev(x), c);
    const waitF = async (expr, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 20000)) { try { if (await E(expr)) return true; } catch (e) { } await sleep(100); } return false; };
    await p.goto(gate.url(BASE, 'debug')); await waitF("mode==='select'&&!!$('#selPlay')", 30000);
    ok('модель своего героя на выборе', await waitF("!!(hero&&hero.mdl)", 30000));
    const mkPeer = cls => `MP.peer={ib:new Interp(),on:false,pos:new THREE.Vector3(),vel:new THREE.Vector3(),tx:0,tz:0,tf:0,dead:false,hp:100,maxHp:100,walk:0,castT:0,hero:null,lbl:null,placed:false,mv:0,sh:0,rp:0,cls:'${cls}',nick:'Друг',lvl:5};`;
    // 1) лобби с силуэтом, потом с напарником
    await E("MP.role='host';MP.peer=null;LOB.wasLinked=true;coopEl.hidden=false;LOB.want=true;try{mpRenderLobby()}catch(e){}");
    await sleep(1200);
    ok('силуэт в лобби — модель', await E("!!(LOB.sil&&LOB.sil.h.mdl)"));
    ok('силуэт — полупрозрачный материал со скиннингом', await E("(()=>{let n=0,b=0;LOB.sil.h.mdl.inner.traverse(o=>{if(o.isSkinnedMesh){n++;if(o.material!==LOB_SILSK)b++;}});return n>0&&b===0;})()"));
    await p.screenshot({ path: OUT + 'lobby_sil.png' });
    await E(mkPeer('dk')); await sleep(1600);
    ok('напарник в лобби — модель', await E("!!(LOB.ph&&LOB.ph.h.mdl&&LOB.ph.cls==='dk')"));
    await sleep(800); await p.screenshot({ path: OUT + 'lobby_peer.png' });
    await E("MP.peer.cls='shaman';"); await sleep(1500);
    ok('смена героя напарника в лобби', await E("!!(LOB.ph&&LOB.ph.h.mdl&&LOB.ph.cls==='shaman')"));
    await p.screenshot({ path: OUT + 'lobby_peer2.png' });
    const leak = await E("HM.inst.size");
    await E("LOB.want=false;coopEl.hidden=true;MP.peer=null;MP.role=null;"); await sleep(600);
    ok('после выхода из лобби модели лобби освобождены', await E("HM.inst.size") < leak, 'было ' + leak + ', стало ' + await E("HM.inst.size"));
    // 2) напарник в игре
    await p.evaluate(() => document.getElementById('selPlay').click()); await waitF("mode==='game'", 15000); await sleep(500);
    await E("luQueue=0;luOpen=false;$('#lvlup').hidden=true;hideUpg();syncPause();clearWorld();spawnPack=function(){};spawnBoss=function(){};P.invulnT=1e9;$('#hud').hidden=true;camera.clearViewOffset();P.pos.set(0,0,0);P.face=0;" +
      "updateCamera=function(dt){camera.position.set(P.pos.x+5.5,2.6,P.pos.z+6.5);camera.lookAt(P.pos.x+1.2,1,P.pos.z);sky.position.copy(camera.position);};" +
      mkPeer('paladin') + "MP.active=true;MP.peer.on=true;MP.peer.pos.set(2.5,0,0);MP.peer.tx=2.5;MP.peer.tz=0;MP.peer.placed=true;mpPeerModelMake();window.__pI=setInterval(()=>{try{mpUpdatePeer(.016)}catch(e){console.error(e)}},16);");
    await sleep(1200);
    ok('напарник в игре — модель', await E("!!(MP.peer.hero&&MP.peer.hero.mdl)"));
    await p.screenshot({ path: OUT + 'coop_idle.png' });
    await E("MP.peer.mv=1;MP.peer.tf=Math.PI;window.__mvI=setInterval(()=>{MP.peer.tz-=0.1;},16);"); await sleep(500);
    ok('напарник бежит', await E("MP.peer.hero.mdl.Ly.Lo.n.indexOf('Running_A')===0"));
    await p.screenshot({ path: OUT + 'coop_run.png' });
    await E("clearInterval(__mvI);MP.peer.mv=0;MP.peer.tz=MP.peer.pos.z;MP.peer.sw=1;MP.peer.tf=0;"); await sleep(200);
    ok('напарник бьёт', await E("MP.peer.hero.mdl.Ly.U.once===true"), await E("MP.peer.hero.mdl.Ly.U.n"));
    await p.screenshot({ path: OUT + 'coop_swing.png' });
    await E("MP.peer.sw=0;MP.peer.dead=true;"); await sleep(1200);
    ok('напарник упал — анимация смерти, без поворота группы', await E("MP.peer.hero.mdl.Ly.U.n.indexOf('Death_A')===0&&MP.peer.hero.g.rotation.z===0"));
    await p.screenshot({ path: OUT + 'coop_dead.png' });
    await E("MP.peer.dead=false;"); await sleep(600);
    ok('напарник поднялся', await E("MP.peer.hero.mdl.Ly.U.n.indexOf('Death_A')!==0"));
    await E("clearInterval(__pI);mpPeerModelDrop();MP.active=false;MP.peer=null;");
    // 3) мастерство: оттенок плаща меняет карту у модели
    const t0 = await E("hero.mdl.texMats[Object.keys(hero.mdl.texMats)[0]][0].map.uuid");
    await E("hero.mdl.setCapeTint(0xf2c46b,.55)");
    ok('оттенок плаща меняет текстуру', await E("(()=>{const k=Object.keys(hero.mdl.texMats);return k.some(t=>hero.mdl.texMats[t][0].map.uuid!=='" + t0 + "');})()"));
    console.log('ошибки страницы:', errs.length ? errs.slice(0, 8).join(' | ') : 'нет');
    if (errs.length) fails++;
  } catch (e) { fails++; console.log('FAIL', e && e.stack || e); }
  finally { await browser.close(); srv.close(); }
  console.log(fails ? 'ИТОГ: провалов ' + fails : 'ИТОГ: всё прошло'); process.exitCode = fails ? 1 : 0;
})();
