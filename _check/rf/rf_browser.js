#!/usr/bin/env node
// Браузерные замеры «Чувства редкости» (один браузер через замок D:/games/pw_gate.js, сервер над D:/games):
//   node rf_browser.js dps    — реальный урон одной формы в 4 редкостях и невозможной (стенд sim_page.js, поток толпы, ур. 30)
//   node rf_browser.js waves  — поздняя игра: билды «до эпических / с легендарными / +2 невозможные» против волн L, L+5, L+10
//   node rf_browser.js pb     — разбор силы в карточке против силы чары (с талантами)
// Версии: DIRS=tc-wt-rarfeel0,tc-wt-rarfeel (до, после). Итог — в _check/rf/<секция>.json и в консоль.
const fs = require('fs'), path = require('path');
const { withBrowser, openGame } = require('D:/games/_sc_check/lib.js');
const SECT = process.argv[2] || 'dps';
const DIRS = (process.env.DIRS || 'tc-wt-rarfeel0,tc-wt-rarfeel').split(',');
const OUT = path.join(__dirname, SECT + '.json');
const CLS = (process.env.CLS || 'pyro,necro,monk,hunter').split(',');
const T0 = Date.now(), TMAX = 9.5 * 60e3;
async function enter(g, cid) {
  await g.E(`__tc.sel('${cid}');true`); await g.p.evaluate(() => document.getElementById('selPlay').click()); await g.waitF("mode==='game'", 30000);
  for (let k = 0; k < 6; k++) { const o = await g.E('!$("#lvlup").hidden'); if (!o) break; await g.E('luQueue=0;closeLevelUp();true'); }
  await g.E('bookOpen=true;luQueue=0;S.lvl=1;S.xp=0;S.talents={};S.ranks={};S.mx=0;computeStats();recalcStats();true');
}
(async () => {
  const res = {};
  await withBrowser('rarfeel-' + SECT, async (b, BASE) => {
    for (const dir of DIRS) {
      const g = await openGame(b, BASE, dir, { seed: 777 });
      try {
        await enter(g, CLS[0]);
        await g.E(fs.readFileSync(path.join(__dirname, '..', 'sim_page.js'), 'utf8'));
        await g.E(fs.readFileSync(path.join(__dirname, 'rf_page.js'), 'utf8'));
        const R = res[dir] = {};
        if (SECT === 'dps') {
          const FORMS = (process.env.FORMS || 'bolt,nova,meteor,fan,beam,rain,aura,orbit,brand,doom').split(',');
          for (const cid of CLS) {
            // по форме — по одной чаре каждой ступени (ближе к середине ступени), невозможная — та же легендарная
            const pick = await g.E(`(()=>{CLS=CLASS_BY['${cid}'];const I=rarInfo(),o={};for(const f of ${JSON.stringify(FORMS)}){const ids=[...CLS.pool].filter(id=>SKILLS[id].F.id===f);if(!ids.length)continue;const t=[[],[],[],[]];
              for(const id of ids)t[I.map.get(id)|0].push(id);if(t.some(a=>!a.length))continue;o[f]=t.map(a=>{a.sort((x,y)=>I.B[x]-I.B[y]);return a[a.length>>1];});}return o;})()`);
            const rows = {};
            for (const f in pick) {
              const ids = pick[f], v = [];
              for (const id of ids) v.push((await g.E(`(()=>{S.imp=[];if(typeof IMP_OFFER!=='undefined')IMP_OFFER.clear();impDirty();return __sim.run({id:${id},scen:'flow',cls:'${cid}',seed:11,withK:true,lvl:30,T:20})})()`)).dps);
              v.push((await g.E(`(()=>{S.imp=[${ids[3]}];impDirty();const r=__sim.run({id:${ids[3]},scen:'flow',cls:'${cid}',seed:11,withK:true,lvl:30,T:20});S.imp=[];impDirty();return r;})()`)).dps);
              rows[f] = v.map(x => Math.round(x));
            }
            R[cid] = rows; console.log(dir, cid, Math.round((Date.now() - T0) / 1000) + 'с', JSON.stringify(rows));
            if (Date.now() - T0 > TMAX) break;
          }
        } else if (SECT === 'waves') {
          const LV = (process.env.LV || '40,80').split(',').map(Number), DS = (process.env.DS || '0,5,10').split(',').map(Number);
          const BUILDS = [['rare', 1, 0], ['epic', 2, 0], ['leg', 3, 0], ['leg+2imp', 3, 2]];
          for (const cid of CLS) for (const L of LV) for (const [nm, maxR, nImp] of BUILDS) {
            const bi = await g.E(`__rf.build({cls:'${cid}',L:${L},maxR:${maxR},nImp:${nImp},rank:5})`);
            const r = { build: bi };
            for (const d of DS) r['d' + d] = await g.E(`__rf.waves({d:${d},el:${process.env.EL || 0},n:${process.env.N || 12},waves:${process.env.WAVES || 2},T:40,seed:${4242 + d}})`);
            (R[cid] = R[cid] || {})[L + ':' + nm] = r;
            console.log(dir, cid, L, nm, Math.round((Date.now() - T0) / 1000) + 'с', 'сила', bi.pw, 'ред', bi.h.join('/'), DS.map(d => `+${d}: ${r['d' + d].t}с смертей ${r['d' + d].deaths} −${Math.round(r['d' + d].lost * 100)}%hp ост ${r['d' + d].left}`).join(' | '));
            if (Date.now() - T0 > TMAX) break;
          }
        } else if (SECT === 'pb') {
          for (const cid of CLS) { await g.E(`__rf.build({cls:'${cid}',L:30,maxR:3,nImp:0,rank:3})`); await g.E('(()=>{const B=__rf.B;S.active=B.a.slice();S.passive=B.p.slice();S.talents=B.talents;S.imp=B.imp;computeStats();recalcStats();onBuildChanged();return 1})()');
            R[cid] = await g.E('__rf.pbCheck()'); const bad = R[cid].filter(x => Math.abs(x.shown - x.pw) > 1); console.log(dir, cid, 'чар', R[cid].length, 'не сходится', bad.length, JSON.stringify(bad.slice(0, 3))); }
        }
        if (g.errs.length) console.log('ошибки страницы', dir, g.errs.slice(0, 5));
        R._errs = g.errs.slice(0, 10);
      } finally { await g.ctx.close(); }
    }
  });
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log('готово', Math.round((Date.now() - T0) / 1000) + 'с →', OUT);
})().catch(e => { console.error('ПРОВАЛ', e); process.exitCode = 1; });
