// Окна на повышение уровня (int/v1331, правка «три окна на уровень»): уровни 1→14 в бою подряд, каждые 4 с; пишет каждый вызов
// banner/bannerMinor/toast/toastShow и что реально было на экране. node fix_lv.js [shag=4] → res/fix_lv.json
const fs=require('fs'),path=require('path');const {withBrowser,phone,openGame,FREEZE,sleep}=require('./lib.js');
const GAP=+(process.argv[2]||4);
(async()=>{let out;
  await withBrowser('int-fix-lv',async(b,BASE)=>{const ctx=await phone(b,440,956);const g=await openGame(ctx,BASE,'',{});
    await g.E(`(()=>{SAVE.chars={};selectClass('geo');startGame();return 1;})()`);await g.waitF("mode==='game'",15000);await sleep(1200);
    await g.E(`(()=>{S.autoLu=true;S.autoBest=true;S.autoRank=true;return 1;})()`);await g.E(FREEZE(0));
    await g.E(`(()=>{const L=window.__L=[];const T=()=>Math.round(time*10)/10;
      const fmt=(n,a)=>T()+' '+n+': '+[...a].slice(0,2).map(x=>String(x).slice(0,55)).join(' | ');
      {const f=banner;banner=function(){L.push(fmt('banner',arguments));return f.apply(this,arguments);};}
      {const f=bannerMinor;bannerMinor=function(){L.push(fmt('bannerMinor',arguments));return f.apply(this,arguments);};}
      {const f=toastShow;toastShow=function(){L.push(fmt('toastShow',arguments));return f.apply(this,arguments);};}
      const P0=window.__pp={b:[],t:[]};const bo=$('#banner'),to=$('#toast');
      new MutationObserver(()=>{const on=bo.classList.contains('on');if(on&&!bo._on)P0.b.push(T()+' '+$('#bannerB').textContent);bo._on=on;}).observe(bo,{attributes:true,attributeFilter:['class']});
      new MutationObserver(()=>{const on=to.classList.contains('on');if(on&&!to._on)P0.t.push(T()+' '+to.textContent.slice(0,60));to._on=on;}).observe(to,{attributes:true,attributeFilter:['class']});
      clearWorld();P.pos.set(Math.cos(1.4)*15,0,Math.sin(1.4)*15);P.prev.copy(P.pos);return 1;})()`);
    for(let i=0;i<13;i++){await g.E(`(()=>{gainXp(xpNeed(S.lvl)-S.xp+1);return 1;})()`);
      for(let k=0;k<GAP*2;k++){await g.E(`(()=>{__step(.5);return 1;})()`);await sleep(500);}}
    await sleep(3500);
    out=await g.E(`(()=>({lvl:S.lvl,slots:activeSlots()+' + '+passiveSlots(),onScreenBanners:__pp.b,onScreenToasts:__pp.t,calls:__L}))()`);out.errs=g.errs.slice(0,5);
    await g.p.close();await ctx.close();});
  fs.writeFileSync(path.join(__dirname,'res','fix_lv.json'),JSON.stringify(out,null,1));console.log(JSON.stringify(out,null,1));})().catch(e=>{console.error('ПРОВАЛ',e);process.exit(1);});
