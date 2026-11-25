#!/usr/bin/env node
// Облик редкостей: снимки одной формы в 5 редкостях и замер FPS (телефон 440×956, настоящая отрисовка, без ?test=1).
//   node rf_vis.js shots [класс] [форма,форма]   → _check/rf/shot_<форма>_<r>.png и сравнение shot_<форма>_all.png
//   node rf_vis.js fps [классы] [повторов] [секунд] → fps.json: до (tc-wt-rarfeel0) и после (tc-wt-rarfeel), чередуя
const fs = require('fs'), path = require('path');
const { withBrowser, openGame, sleep, FREEZE } = require('D:/games/_sc_check/lib.js');
const SECT = process.argv[2] || 'shots';
const OUT = __dirname;
const NAMES = ['Обычная', 'Редкая', 'Эпическая', 'Легендарная', 'Невозможная'];
async function enter(g, cid) {
  await g.E(`SAVE.chars={};selectClass('${cid}');true`); await g.p.evaluate(() => document.getElementById('selPlay').click()); await g.waitF("mode==='game'", 30000); await sleep(600);
}
(async () => {
  await withBrowser('rarfeel-vis', async (b, BASE) => {
    if (SECT === 'shots') {
      const cid = process.argv[3] || 'pyro', FORMS = (process.argv[4] || 'bolt,nova').split(',');
      const g = await openGame(b, BASE, 'tc-wt-rarfeel', { seed: 99, notest: true });
      try {
        await enter(g, cid);
        await g.E(FREEZE(30));
        await g.E(`Q.pp=true;Q.shadow=true;spawnPack=function(){};spawnBoss=function(){};S.auto=false;true`);
        await g.p.addStyleTag({ content: 'body *{visibility:hidden !important} canvas{visibility:visible !important}' });
        for (const f of FORMS) {
          const ids = await g.E(`(()=>{const I=rarInfo(),t=[[],[],[],[]];for(const id of CLS.pool){const s=SKILLS[id];if(s.F.id!=='${f}'||s.E.id!==SKILLS[[...CLS.pool].find(i=>SKILLS[i].F.id==='${f}'&&(I.map.get(i)|0)===3)].E.id)continue;t[I.map.get(id)|0].push(id);}
            return t.map(a=>a.find(id=>!SKILLS[id].M.count&&!SKILLS[id].M.echo)??a[0]);})()`);
          const files = [];
          for (let r = 0; r < 5; r++) {
            const id = ids[Math.min(r, 3)]; if (id == null) continue;
            await g.E(`(()=>{clearWorld();S.imp=${r === 4 ? `[${id}]` : '[]'};impDirty();S.active=Array(8).fill(null);S.active[0]=${id};S.passive=Array(42).fill(null);onBuildChanged();
              P.pos.set(0,0,0);P.prev.copy(P.pos);P.face=0;P.mp=P.maxMp;for(const k in P.cds)delete P.cds[k];
              for(let i=0;i<3;i++){const en=spawnEnemy('goblin',(i-1)*1.6,7+(i%2),S.lvl,{});en.maxHp=en.hp=1e9;en.stun=1e9;en.aggro=false;}
              target=null;__step(1.8);P.face=0;P.mp=P.maxMp;cast(SKILLS[${id}]);return 1;})()`);
            await g.E(`__step(${f === 'bolt' ? +(process.env.TB || .16) : f === 'meteor' ? .55 : .12});__vt+=1000/60;loop(__vt);true`);
            await sleep(120);
            const fn = path.join(OUT, `shot_${f}_${r}.png`); await g.p.screenshot({ path: fn, clip: { x: 60, y: 330, width: 320, height: 420 } }); files.push([fn, NAMES[r]]);
          }
          // сравнение: пять снимков в ряд
          const html = '<html><body style="margin:0;background:#111;display:flex;gap:4px;font:15px sans-serif;color:#eee">' + files.map(([fn, n]) => `<div style="text-align:center"><img src="data:image/png;base64,${fs.readFileSync(fn).toString('base64')}" width="240"><div>${n}</div></div>`).join('') + '</body></html>';
          const pg = await g.ctx.newPage(); await pg.setViewportSize({ width: 5 * 244, height: 340 }); await pg.setContent(html); await pg.screenshot({ path: path.join(OUT, `shot_${f}_all.png`) }); await pg.close();
          console.log('снимки', f, files.map(x => path.basename(x[0])).join(' '));
        }
        if (g.errs.length) console.log('ошибки страницы', g.errs.slice(0, 5));
      } finally { await g.ctx.close(); }
    } else if (SECT === 'cpu') {
      // без отрисовки (карта занята рендером): время JS на шаг боя и число эффектов — толпа 30, авто-бой, билд 60-го с легендарными и 2 невозможными
      const CL = (process.argv[3] || 'pyro,necro').split(','), REP = +(process.argv[4] || 2), res = [];
      for (const cid of CL) for (let r = 0; r < REP; r++) for (const dir of (r % 2 ? ['tc-wt-rarfeel', 'tc-wt-rarfeel0'] : ['tc-wt-rarfeel0', 'tc-wt-rarfeel'])) {
        const g = await openGame(b, BASE, dir, { seed: 12345 + r });
        try {
          await enter(g, cid); await g.E(FREEZE(60));
          await g.E(`render=function(){};window.__R=render;Q.pp=true;spawnBoss=function(){};spawnPack=function(){};LEARNED=new Set(CLS.pool);S.learned=[...LEARNED];applyBestBuild();
            {const L=equippedIds().filter(id=>rarBase(SKILLS[id])>=3).sort((a,b)=>pwr(SKILLS[b])-pwr(SKILLS[a]));S.imp=L.slice(0,2);impDirty();onBuildChanged();}
            P.maxHp=P.hp=1e9;P.maxMp=P.mp=1e7;rebuildPassives();S.auto=true;
            window.__crowd=()=>{const ids=Object.keys(MOBS).filter(k=>!MOBS[k].boss&&!MOBS[k].as).slice(0,4);let n=ENEMIES.filter(e=>!e.dead).length,i=0;while(n<30){const a=(i++)*2.4,d=4+(i%5)*1.6;spawnEnemy(ids[i%ids.length],P.pos.x+Math.cos(a)*d,P.pos.z+Math.sin(a)*d,60+(i%3));n++;}};true`);
          const q = await g.E(`(()=>{let js=0,fx=0,fxMax=0,pb=0,n=0;__crowd();__step(2);for(let k=0;k<40;k++){__crowd();P.mp=P.maxMp;const t=performance.now();__step(.25);js+=performance.now()-t;n+=15;fx+=FX.length;fxMax=Math.max(fxMax,FX.length);pb+=500-pBudget;}
            const h=[0,0,0,0,0];for(const id of equippedIds())h[rarOf(SKILLS[id])]++;return {msStep:+(js/n).toFixed(3),fxAvg:+(fx/40).toFixed(1),fxMax,partFrame:+(pb/40).toFixed(0),rar:h.join('/'),kills:S.kills};})()`);
          q.dir = dir; q.cls = cid; q.errs = g.errs.length; res.push(q); console.log(JSON.stringify(q));
        } catch (e) { console.log('ПРОВАЛ', cid, dir, e.message); } finally { await g.ctx.close(); }
      }
      fs.writeFileSync(path.join(OUT, 'cpu.json'), JSON.stringify(res, null, 1));
      for (const dir of ['tc-wt-rarfeel0', 'tc-wt-rarfeel']) { const a = res.filter(x => x.dir === dir); if (!a.length) continue; const m = k => (a.reduce((s, x) => s + x[k], 0) / a.length).toFixed(2); console.log(dir, 'мс JS на шаг', m('msStep'), 'FX ср.', m('fxAvg'), 'FX макс', Math.max(...a.map(x => x.fxMax)), 'частиц на кадр', m('partFrame'), 'убийств', m('kills')); }
    } else if (SECT === 'fps') {
      const CL = (process.argv[3] || 'pyro,necro').split(','), REP = +(process.argv[4] || 2), SEC = +(process.argv[5] || 10), res = [];
      for (const cid of CL) for (let r = 0; r < REP; r++) for (const dir of (r % 2 ? ['tc-wt-rarfeel', 'tc-wt-rarfeel0'] : ['tc-wt-rarfeel0', 'tc-wt-rarfeel'])) {
        const g = await openGame(b, BASE, dir, { seed: 12345, cpu: 4, notest: true });
        try {
          await enter(g, cid);
          await g.E(`luQueue=0;luOpen=false;$('#lvlup').hidden=true;try{hideUpg()}catch(e){};syncPause();S.autoLu=true;S.autoBest=true;spawnBoss=function(){};spawnPack=function(){};
            S.lvl=60;computeStats();recalcStats();LEARNED=new Set(CLS.pool);S.learned=[...LEARNED];applyBestBuild();
            {const L=equippedIds().filter(id=>rarBase(SKILLS[id])>=3).sort((a,b)=>pwr(SKILLS[b])-pwr(SKILLS[a]));S.imp=L.slice(0,2);impDirty();onBuildChanged();}
            P.maxHp=P.hp=1e9;P.maxMp=P.mp=1e7;P.invulnT=0;rebuildPassives();S.auto=true;syncAuto();
            Q.pp=true;Q.shadow=false;moon.castShadow=false;pr=1;renderer.setPixelRatio(1);resize();
            window.__crowd=()=>{const ids=Object.keys(MOBS).filter(k=>!MOBS[k].boss&&!MOBS[k].as).slice(0,4);let n=ENEMIES.filter(e=>!e.dead).length,i=0;while(n<30){const a=(i++)*2.4,d=4+(i%5)*1.6;spawnEnemy(ids[i%ids.length],P.pos.x+Math.cos(a)*d,P.pos.z+Math.sin(a)*d,40+(i%3));n++;}};
            __crowd();window.__crI=setInterval(()=>{__crowd();P.mp=P.maxMp;P.hp=P.maxHp;},400);true`);
          await sleep(3000);
          await g.E(`window.__pf={n:0,js:0,t0:performance.now(),last:0,dts:[],fx:0,fxMax:0};const _l0=loop;loop=function(now){const t=performance.now();_l0(now);const d=performance.now()-t;const f=__pf;
            f.n++;f.js+=d;if(f.last)f.dts.push(t-f.last);f.last=t;f.fx+=FX.length;if(FX.length>f.fxMax)f.fxMax=FX.length;};true`);
          await sleep(SEC * 1000);
          const q = await g.E(`(()=>{const f=__pf,t=(performance.now()-f.t0)/1000,d=f.dts.slice().sort((a,b)=>a-b),k=x=>d.length?+d[Math.min(d.length-1,Math.floor(d.length*x))].toFixed(1):0;
            const h=[0,0,0,0,0];for(const id of equippedIds())h[rarOf(SKILLS[id])]++;
            return {fps:+(f.n/t).toFixed(1),p95:k(.95),jsMs:+(f.js/f.n).toFixed(2),fxAvg:+(f.fx/f.n).toFixed(1),fxMax:f.fxMax,rar:h.join('/'),kills:S.kills};})()`);
          q.dir = dir; q.cls = cid; q.errs = g.errs.length; res.push(q); console.log(JSON.stringify(q));
          await g.E('clearInterval(__crI);true');
        } catch (e) { console.log('ПРОВАЛ', cid, dir, e.message); } finally { await g.ctx.close(); }
      }
      fs.writeFileSync(path.join(OUT, 'fps.json'), JSON.stringify(res, null, 1));
      for (const dir of ['tc-wt-rarfeel0', 'tc-wt-rarfeel']) { const a = res.filter(x => x.dir === dir); if (!a.length) continue; const m = k => (a.reduce((s, x) => s + x[k], 0) / a.length).toFixed(1); console.log(dir, 'FPS', m('fps'), 'p95', m('p95'), 'мс JS', m('jsMs'), 'FX', m('fxAvg')); }
    }
  });
})().catch(e => { console.error('ПРОВАЛ', e); process.exitCode = 1; });
