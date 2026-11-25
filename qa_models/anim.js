// Проверка анимаций моделей в игре: бег (и скольжение стоп), удар/выстрел/чары, удар по герою, смерть.
// node qa_models/anim.js [классы]  → qa_models/after/anim_<id>.png (полосы кадров) и цифры в консоль
const fs = require('fs'), http = require('http'), path = require('path');
const pw = require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate = require('D:/games/pw_gate.js');
const ROOT = 'D:/games/tc-wt-models', OUT = ROOT + '/qa_models/after/'; fs.mkdirSync(OUT, { recursive: true });
const CLS = (process.argv[2] || 'pyro,paladin,windr,bers,monk,hunter').split(',');
const T = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/json', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(d); }); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const { browser } = await gate.launch(pw, { label: 'qa-models-anim' });
  try {
    const ctx = await gate.phoneContext(browser, { w: 440, h: 956 });
    await ctx.addInitScript(() => { try { localStorage.setItem('tysyacha-nick', 'Тест'); } catch (e) { } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    const E = c => p.evaluate(x => window.__ev(x), c);
    const waitF = async (expr, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 20000)) { try { if (await E(expr)) return true; } catch (e) { } await sleep(100); } return false; };
    await p.goto(gate.url(BASE, 'debug')); await waitF("mode==='select'&&!!$('#selPlay')", 30000);
    await waitF("!!(hero&&hero.mdl)", 30000);
    await p.evaluate(() => document.getElementById('selPlay').click()); await waitF("mode==='game'", 15000); await sleep(500);
    await E("luQueue=0;luOpen=false;$('#lvlup').hidden=true;hideUpg();syncPause();S.autoLu=true;clearWorld();spawnPack=function(){};spawnBoss=function(){};P.invulnT=1e9;$('#hud').hidden=true;camera.clearViewOffset();" +
      "window.__cy=Math.PI/2;window.__cd=5.2;updateCamera=function(dt){const a=P.face+(window.__cy||0),d=window.__cd||5,ty=1.0;camera.position.set(P.pos.x+Math.sin(a)*d,ty+.7,P.pos.z+Math.cos(a)*d);camera.lookAt(P.pos.x,ty,P.pos.z);sky.position.copy(camera.position);};");
    for (const id of CLS) {
      await E(`setClass('${id}');P.face=0;$('#hud').hidden=true;clearWorld();P.invulnT=1e9;P.dead=false;hero.g.rotation.z=0;P.pos.set(-6,0,0);P.prev.copy(P.pos);P.face=Math.PI/2;`); await waitF("!!(hero&&hero.mdl)", 15000); await sleep(400);
      const shots = [];
      // бег вбок от камеры: бежим по +z, камера сбоку
      await E("window.__fs=[];input.moveTo={x:P.pos.x+40,z:P.pos.z};window.__fsI=setInterval(()=>{const f=hero.mdl.bones.footl,v=new THREE.Vector3();f.getWorldPosition(v);__fs.push([performance.now(),v.x,v.y,v.z]);},16);");
      await sleep(700);
      for (let i = 0; i < 4; i++) { const b = OUT + `_a_${id}_run${i}.png`; await p.screenshot({ path: b }); shots.push(b); await sleep(90); }
      await sleep(900);
      const slide = await E("(()=>{clearInterval(__fsI);input.moveTo=null;const a=__fs;let mn=1e9;for(const s of a)mn=Math.min(mn,s[2]);const sp=[];for(let i=1;i<a.length-1;i++){if(a[i][2]<mn+.03){const dt=(a[i+1][0]-a[i-1][0])/1000;sp.push(Math.hypot(a[i+1][1]-a[i-1][1],a[i+1][3]-a[i-1][3])/dt);}}sp.sort((x,y)=>x-y);return {hero:+P.speed.toFixed(2),footContactMed:sp.length?+sp[sp.length>>1].toFixed(2):null,n:sp.length,runTs:+(hero.mdl.Ly.Lo.a?hero.mdl.Ly.Lo.a.timeScale:0).toFixed(2)};})()");
      // удар/выстрел: враг перед героем
      await E("window.__cy=Math.PI*0.3;P.pos.set(0,0,0);P.prev.copy(P.pos);P.face=0;hero.g.rotation.y=0;const ids=Object.keys(MOBS).filter(k=>!MOBS[k].boss&&!MOBS[k].as);const en=spawnEnemy(ids[0],P.pos.x,P.pos.z+(CLS.melee?2.2:7),1);en.hp=en.maxHp=1e7;en.atkCd=99;en.stun=99;input.attack=true;");
      await sleep(350);
      for (let i = 0; i < 4; i++) { const b = OUT + `_a_${id}_atk${i}.png`; await p.screenshot({ path: b }); shots.push(b); await sleep(110); }
      await E("input.attack=false;");
      // чары: первый слот
      await E("P.mp=P.maxMp;P.cds={};trySlot(0,true);"); await sleep(150);
      { const b = OUT + `_a_${id}_cast.png`; await p.screenshot({ path: b }); shots.push(b); }
      // удар по герою и смерть
      await sleep(700); await E("P.invulnT=0;hurtPlayer(1,null,{});"); await sleep(120);
      { const b = OUT + `_a_${id}_hit.png`; await p.screenshot({ path: b }); shots.push(b); }
      await sleep(800); await E("P.invulnT=0;P.shield=0;P.hp=1;hurtPlayer(1e6,null,{});"); await sleep(1300); await E("$('#dead').hidden=true"); await sleep(80);
      { const b = OUT + `_a_${id}_dead.png`; await p.screenshot({ path: b }); shots.push(b); }
      const st = await E("({dead:P.dead,rz:hero.g.rotation.z,U:hero.mdl.Ly.U.n,L:hero.mdl.Ly.Lo.n,mode,paused})");
      // вернуть к жизни
      await E("$('#dead').hidden=true;P.dead=false;paused=false;syncPause&&syncPause();hero.g.rotation.z=0;hero.g.position.y=0;P.hp=P.maxHp;P.invulnT=1e9;clearWorld();");
      await sleep(500);
      const st2 = await E("({U:hero.mdl.Ly.U.n,L:hero.mdl.Ly.Lo.n})");
      console.log(id, 'бег', JSON.stringify(slide), 'смерть', JSON.stringify(st), 'после', JSON.stringify(st2));
      fs.writeFileSync(OUT + `_a_${id}.json`, JSON.stringify(shots));
    }
    console.log('ошибки страницы:', errs.length ? errs.slice(0, 8).join(' | ') : 'нет');
  } catch (e) { console.log('FAIL', e && e.stack || e); process.exitCode = 1; }
  finally { await browser.close(); srv.close(); }
})();
