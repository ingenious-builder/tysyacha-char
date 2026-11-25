#!/usr/bin/env node
// Проверка правок по замечаниям рецензий rev_rf1/rev_rf2 (один браузер через замок, ?test=1, логика без замера кадров):
//  1) пробуждение Невозможного на 45-м — свой баннер «imp» после баннера уровня;  2) кнопка «разжечь» до 45-го и после покупки;
//  3) кооп: удар гостя несёт r/im, хост ставит чёрное пламя по im, флаг 2048 у зеркала; облик каста напарника по r;
//  4) урон по герою — целым числом;  5) разбор силы: «поправка уровня» отдельно, произведение = сила;  6) кайма снаряда редкой,
//  кольцо под призванным; 7) облик площади на тиках — без тряски; 8) 20 с авто-боя с легендарными и невозможными — 0 ошибок.
const { withBrowser, openGame, sleep, FREEZE } = require('D:/games/_sc_check/lib.js');
(async () => {
  await withBrowser('rarfeel-fix2', async (b, BASE) => {
    const g = await openGame(b, BASE, 'tc-wt-rarfeel', { seed: 5 });
    const R = {};
    try {
      await g.E(`SAVE.chars={};selectClass('necro');true`); await g.p.evaluate(() => document.getElementById('selPlay').click()); await g.waitF("mode==='game'", 30000);
      // 1) пробуждение: до 44-го, затем через 45-й; окно выбора не открываем (авто), ждём 3,5 с игрового времени
      R.wake = await g.E(`(()=>{S.autoLu=true;S.autoBest=true;for(let i=0;i<43;i++)gainXp(xpNeed(S.lvl)-S.xp+1);gainXp(xpNeed(S.lvl)-S.xp+1);gainXp(xpNeed(S.lvl)-S.xp+1);
        return {lvl:S.lvl,ban0:$('#bannerB').textContent};})()`);
      await g.E(`luQueue=0;luOpen=false;$('#lvlup').hidden=true;syncPause();true`);
      const okB = await g.waitF(`$('#banner').classList.contains('imp')&&$('#banner').classList.contains('on')`, 9000);
      R.wake.imp = okB; R.wake.text = await g.E(`$('#bannerB').textContent+' | '+$('#bannerS').textContent+' | '+($('#banner').dataset.k||'')`);
      // 2) кнопка «разжечь Невозможное»
      R.buy = await g.E(`(()=>{const o={};LEARNED=new Set(CLS.pool);S.learned=[...LEARNED];applyBestBuild();for(const id of equippedIds())S.ranks[id]=5;onBuildChanged();
        S.ess=1e6;S.impAcc=0;S.impBuyN=0;S.impBuyL=0;const L0=S.lvl;S.lvl=30;updateRankBtn();o.l30=$('#rankBuild').textContent+' ['+$('#rankBuild').className+']';
        S.lvl=50;updateRankBtn();o.l50=$('#rankBuild').textContent;const e0=S.ess;impBuy();o.paid=e0-S.ess;updateRankBtn();o.after=$('#rankBuild').textContent+' ['+$('#rankBuild').className+']';
        const e1=S.ess;impBuy();o.paid2=e1-S.ess;S.lvl=60;S.impAcc=0;updateRankBtn();o.l60=$('#rankBuild').textContent;const e2=S.ess;impBuy();o.paid3=e2-S.ess;o.n=S.impBuyN;
        runFresh(1);o.reset=[S.impBuyN,S.impBuyL];S.lvl=L0;return o;})()`);
      // 3) кооп (логика): гость бьёт зеркало невозможной, хост принимает удар
      R.coop = await g.E(`(()=>{const o={};clearWorld();LEARNED=new Set(CLS.pool);S.learned=[...LEARNED];S.lvl=60;computeStats();applyBestBuild();
        const legs=[...CLS.pool].filter(id=>rarBase(SKILLS[id])>=3&&SKILLS[id].active);const id=legs[0];S.imp=[id];impDirty();onBuildChanged();const sk=SKILLS[id];
        MP.hitQ=MP.hitQ||[];MP.hitQ.length=0;const m0=spawnEnemy(Object.keys(MOBS).find(k=>!MOBS[k].boss),3,3,60);m0.remote=true;m0.uid=7771;
        dealDamage(m0,100,sk.e,{sk,depth:0});const h=MP.hitQ[MP.hitQ.length-1]||{};o.guestHit={r:h.r,im:h.im};removeEnemy(ENEMIES.indexOf(m0));
        S.imp=[];impDirty();const en=spawnEnemy(Object.keys(MOBS).find(k=>!MOBS[k].boss),4,4,60);en.uid=7772;en.maxHp=en.hp=1e7;
        mpHostHit({u:7772,d:100,el:sk.e,cr:0,sk:id,dp:0,rc:1,im:1,r:4});o.hostBurn=+(en.ibT||0).toFixed(2);o.hostIbDps=Math.round(en.ibDps||0);
        const en2=spawnEnemy(Object.keys(MOBS).find(k=>!MOBS[k].boss),5,5,60);en2.uid=7773;en2.maxHp=en2.hp=1e7;mpHostHit({u:7773,d:100,el:sk.e,cr:0,sk:id,dp:0,rc:1,r:3});o.hostNoImpBurn=en2.ibT||0;
        const fl=(en.moving?1:0)|(en.ibT>0?2048:0);const mir={tg:{x:0,z:0,f:0,jy:0,fl},pos:{x:0,z:0},flash:0};try{mpStepRemote(mir,.016);o.mirrorIbT=mir.ibT;}catch(e){o.mirrorErr=String(e).slice(0,120);}
        try{const fx0=FX.length;rarCastAt(3,0,0,sk.E.color,false);o.peerCastFx=FX.length-fx0;}catch(e){o.peerErr=String(e).slice(0,120);}
        clearWorld();return o;})()`);
      // 4) урон по герою — целым
      R.hurt = await g.E(`(()=>{P.invulnT=0;P.hp=P.maxHp=1e6;P.shield=0;const a=ST.armor;ST.armor=1;hurtPlayer(85.6000000000001,null,{});ST.armor=a;const f=FL[(flI-1+FL.length)%FL.length];return f.el.textContent;})()`);
      // 5) разбор силы
      R.pb = await g.E(`(()=>{S.lvl=30;computeStats();onBuildChanged();const ids=equippedIds();let bad=0,lv=0;for(const id of ids){const sk=SKILLS[id],b=powerBreak(sk),pw=pwr(sk);
        const prod=b.base*b.rank*b.imp*b.lvl*b.slotS*b.lvk*b.tal*b.aff*b.reso*b.react;if(Math.abs(prod/pw-1)>.01)bad++;if(pwBreakHtml(sk).includes('поправка уровня'))lv++;}return {n:ids.length,bad,withLvk:lv};})()`);
      // 6) кайма снаряда и кольцо призыва
      R.vis = await g.E(`(()=>{const o={};clearWorld();S.lvl=60;computeStats();const I=rarInfo();P.mp=P.maxMp=1e6;
        const bolt=[...CLS.pool].find(id=>SKILLS[id].F.id==='bolt'&&(I.map.get(id)|0)===1),sum=[...CLS.pool].find(id=>SKILLS[id].F.id==='summon'&&(I.map.get(id)|0)===3);
        const en=spawnEnemy(Object.keys(MOBS).find(k=>!MOBS[k].boss),0,6,60);en.maxHp=en.hp=1e9;en.stun=1e9;
        if(sum!=null){spawnSummon(SKILLS[sum]);const s=SUMMONS[SUMMONS.length-1];o.ring=s&&s.rings?s.rings.length:0;o.rr=s&&s.rr;clearWorld();o.ringBack=SRP.length;}
        SAVE.chars={};selectClass('pyro');startGame();clearWorld();S.lvl=60;computeStats();P.mp=P.maxMp=1e6;{const I=rarInfo(),bolt=[...CLS.pool].find(id=>SKILLS[id].F.id==='bolt'&&(I.map.get(id)|0)===1);const en=spawnEnemy(Object.keys(MOBS).find(k=>!MOBS[k].boss),0,6,60);en.maxHp=en.hp=1e9;en.stun=1e9;
        if(bolt!=null){cast(SKILLS[bolt]);const p=PROJ[PROJ.length-1];o.rim=p&&p.vis.rim?{vis:p.vis.rim.visible,sc:+p.vis.rim.scale.x.toFixed(2)}:null;}}
        // снаряд врага из пула не несёт каймы
        const v=takeProjVis('basic',new THREE.Color(0xffffff),.3);o.enemyRim=v.rim?v.rim.visible:false;dropProjVis(v);
        return o;})()`);
      // 8) авто-бой 20 с: легендарные + 2 невозможные
      await g.E(`(()=>{clearWorld();LEARNED=new Set(CLS.pool);S.learned=[...LEARNED];S.lvl=60;computeStats();recalcStats();applyBestBuild();
        const L=equippedIds().filter(id=>rarBase(SKILLS[id])>=3).sort((a,b)=>pwr(SKILLS[b])-pwr(SKILLS[a]));S.imp=L.slice(0,2);impDirty();onBuildChanged();rebuildPassives();
        if(window.__sp0)spawnPack=window.__sp0;S.auto=true;syncAuto();P.maxHp=P.hp=1e7;P.invulnT=0;return 1;})()`);
      await sleep(20000);
      R.fight = await g.E(`(()=>{let ib=0;for(const e of ENEMIES)if(e.ibT>0)ib++;return {kills:S.kills,ib,fx:FX.length,proj:PROJ.length,summ:SUMMONS.length};})()`);
      // 7) тики площадей без тряски: аура легендарной 5 с
      await g.E(`SAVE.chars={};selectClass('geo');startGame();true`); await sleep(500);
      await g.E(FREEZE(60));
      R.tick = await g.E(`(()=>{clearWorld();S.lvl=60;computeStats();let sh=0,n=0;const a=shk;shk=function(v,x,z){if(new Error().stack.includes('rarAoeFx'))sh++;a(v,x,z);};
        const C={c:0};const f=rarAoeFx;rarAoeFx=function(sk,p,R,d){const k=rarAoeN;f(sk,p,R,d);if(rarAoeN>k)C.c++;};
        for(let i=0;i<20;i++){const en=spawnEnemy(Object.keys(MOBS).find(k=>!MOBS[k].boss),Math.cos(i)*3,Math.sin(i)*3,60);en.maxHp=en.hp=1e9;en.stun=1e9;}
        const I=rarInfo();const au=[...CLS.pool].filter(id=>!SKILLS[id].active&&(I.map.get(id)|0)===3&&SKILLS[id].F.id==='aura');S.passive=Array(42).fill(null);au.slice(0,2).forEach((id,i)=>S.passive[i]=id);
        S.active=Array(8).fill(null);onBuildChanged();rebuildPassives();const t0=time;__step(5);
        shk=a;rarAoeFx=f;return {auras:au.length,aoeFx:C.c,rarShakes:sh,sec:+(time-t0).toFixed(1)};})()`);
      console.log(JSON.stringify(R, null, 1));
      console.log('ошибок страницы', g.errs.length, g.errs.slice(0, 5).join(' | '));
    } finally { await g.ctx.close(); }
  });
})().catch(e => { console.error('ПРОВАЛ', e); process.exitCode = 1; });
