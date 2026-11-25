// Проверка правок после проверки int/v1331 (25.11): 1) имена героев в ленте выбора не обрезаны (440×956, 360×740);
// 2) подпись мини-карты не поверх открытой Книги (elementFromPoint в середине #mmL — внутри #book); 3) название края на мини-карте не обрезано;
// 4) окна на повышение уровня: подряд уровни 1→12 в бою — сколько баннеров по центру и плашек (цель: ≤ 1 окна на уровень, без баннера «открыт слот»).
// node fix_ui.js  → res/fix_ui.json, res/fix_ui_*.png
const fs=require('fs'),path=require('path');const {withBrowser,phone,openGame,FREEZE,sleep}=require('./lib.js');
const RES=path.join(__dirname,'res');fs.mkdirSync(RES,{recursive:true});
(async()=>{const out={};
  await withBrowser('int-fix-ui',async(b,BASE)=>{
    for(const [w,h] of [[440,956],[360,740]]){const tag=w+'x'+h;const ctx=await phone(b,w,h);const g=await openGame(ctx,BASE,'',{});
      out['names_'+tag]=await g.E(`(()=>{const bad=[];for(const n of document.querySelectorAll('#classes .cls .n')){const cut=n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1;if(cut)bad.push(n.textContent+' '+n.scrollWidth+'/'+n.clientWidth+' '+n.scrollHeight+'/'+n.clientHeight);}
        const strip=document.querySelector('#classes').getBoundingClientRect();return {n:document.querySelectorAll('#classes .cls .n').length,bad,stripH:Math.round(strip.height),pageX:document.documentElement.scrollWidth-innerWidth};})()`);
      await g.p.screenshot({path:path.join(RES,'fix_ui_sel_'+tag+'.png')});
      // бой: края 0..5 — подпись мини-карты
      await g.E(`(()=>{SAVE.chars={};selectClass('pyro');startGame();return 1;})()`);await g.waitF("mode==='game'",15000);await sleep(1500);
      const zl=[];for(const R of [15,46,73,110,175]){zl.push(await g.E(`(()=>{clearWorld();P.pos.set(Math.cos(1.4)*${R},0,Math.sin(1.4)*${R});P.prev.copy(P.pos);mmT=0;return 1;})()`));await sleep(900);
        zl.push(await g.E(`(()=>{const L=document.querySelector('#mmL b');if(!L)return {none:1};return {t:L.textContent,cut:L.scrollWidth>L.clientWidth+1,h:Math.round(L.getBoundingClientRect().height)};})()`));}
      out['mmL_'+tag]=zl.filter(x=>x!==1);
      await g.E(`(()=>{openBook('build');return 1;})()`);await sleep(700);
      out['book_'+tag]=await g.E(`(()=>{const L=document.querySelector('#mmL');const r=L.getBoundingClientRect();if(!r.width)return {mmL:'скрыта'};const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {top:e?(e.id||e.className||e.tagName):null,inBook:!!(e&&e.closest('#book')),inMM:!!(e&&e.closest('#mm'))};})()`);
      await g.p.screenshot({path:path.join(RES,'fix_ui_book_'+tag+'.png'),clip:{x:0,y:0,width:w,height:300}});
      await g.E(`(()=>{closeBook&&closeBook();return 1;})()`).catch(()=>{});
      if(w===440){// окна на повышение уровня: игра шагает без отрисовки, уровень за уровнем
        await g.E(`(()=>{try{closeBook()}catch(e){};S.autoLu=true;S.autoBest=true;S.autoRank=true;return 1;})()`);await g.E(FREEZE(0));
        await g.E(`(()=>{const P0=window.__pp={b:[],t:[]};const bo=$('#banner'),to=$('#toast');
          new MutationObserver(()=>{const on=bo.classList.contains('on');if(on&&!bo._on)P0.b.push(Math.round(time)+' '+$('#bannerB').textContent);bo._on=on;}).observe(bo,{attributes:true,attributeFilter:['class']});
          new MutationObserver(()=>{const on=to.classList.contains('on');if(on&&!to._on)P0.t.push(Math.round(time)+' '+to.textContent.slice(0,60));to._on=on;}).observe(to,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
          clearWorld();P.pos.set(Math.cos(1.4)*15,0,Math.sin(1.4)*15);P.prev.copy(P.pos);return 1;})()`);
        for(let i=0;i<11;i++){await g.E(`(()=>{gainXp(xpNeed(S.lvl)-S.xp+1);return 1;})()`);
          // настоящие часы для таймеров плашек: 4 с между уровнями, игра шагает
          for(let k=0;k<8;k++){await g.E(`(()=>{__step(.5);return 1;})()`);await sleep(500);}}
        await sleep(3500);
        out.levels=await g.E(`(()=>({lvl:S.lvl,slots:activeSlots()+' + '+passiveSlots(),banners:__pp.b,toasts:__pp.t}))()`);}
      out['errs_'+tag]=g.errs.slice(0,5);await g.p.close();await ctx.close();}});
  fs.writeFileSync(path.join(RES,'fix_ui.json'),JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1));})().catch(e=>{console.error('ПРОВАЛ',e);process.exit(1);});
