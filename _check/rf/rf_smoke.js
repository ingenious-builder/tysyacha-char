#!/usr/bin/env node
// Дымовая проверка живого цикла (?test=1): авто-бой 20 с с легендарными и невозможными (чёрное пламя, прыжки, облик редкости),
// выбор уровня (окно и авто), свиток, пробуждение Невозможного на 45-м, новый забег (невозможные → память). Ошибки страницы — 0.
const { withBrowser, openGame, sleep } = require('D:/games/_sc_check/lib.js');
(async () => {
  await withBrowser('rarfeel-smoke', async (b, BASE) => {
    const g = await openGame(b, BASE, 'tc-wt-rarfeel', { seed: 5 });
    try {
      await g.E(`SAVE.chars={};selectClass('necro');true`); await g.p.evaluate(() => document.getElementById('selPlay').click()); await g.waitF("mode==='game'", 30000);
      const r1 = await g.E(`(()=>{S.autoLu=false;S.autoBest=true;let ok=0;for(let i=0;i<43;i++){gainXp(xpNeed(S.lvl)-S.xp+1);} // до 44-го
        const before=S.lvl;gainXp(xpNeed(S.lvl)-S.xp+1);gainXp(xpNeed(S.lvl)-S.xp+1);   // пересекаем 45-й: тост пробуждения
        return {lvl:S.lvl,queue:luQueue,toast:$('#toast')?$('#toast').textContent.slice(0,120):''};})()`);
      // окно выбора уровня: открыть, взять первую карту
      const r2 = await g.E(`(()=>{luDelay=0;openLevelUp();const n=$('#luCards').children.length;const c=$('#luCards .card');if(c)c.click();return {cards:n,open:luOpen};})()`);
      const r3 = await g.E(`(()=>{luAutoRun(luQueue);for(let i=0;i<8;i++)learnRandom(i%3?'':'boss');
        const L=[...LEARNED].filter(id=>CLS.pool.has(id)&&rarBase(SKILLS[id])>=3);S.imp=L.slice(0,2);impDirty();onBuildChanged();applyBestBuild();
        const h=[0,0,0,0,0];for(const id of equippedIds())h[rarOf(SKILLS[id])]++;
        S.auto=true;syncAuto();P.maxHp=P.hp=1e7;return {learned:LEARNED.size,legs:L.length,imp:S.imp.length,rar:h.join('/')};})()`);
      await sleep(20000);
      const r4 = await g.E(`(()=>{let ib=0;for(const e of ENEMIES)if(e.ibT>0)ib++;return {kills:S.kills,ibNow:ib,fx:FX.length,lvl:S.lvl};})()`);
      // новый забег: невозможные уходят в память
      const r5 = await g.E(`(()=>{const k=S.imp.slice();runFresh(1);return {impRun:S.imp.length,book:(S.impBook||[]).length,had:k.length,lvl:S.lvl};})()`);
      console.log(JSON.stringify({ r1, r2, r3, r4, r5 }));
      console.log('ошибок страницы', g.errs.length, g.errs.slice(0, 5).join(' | '));
    } finally { await g.ctx.close(); }
  });
})().catch(e => { console.error('ПРОВАЛ', e); process.exitCode = 1; });
