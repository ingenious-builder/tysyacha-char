// Задача для _check/rev3/fx.js: лист чары на текущей ширине — вылезает ли содержимое за карточку (обрезка справа) и видна ли «Сила» с пояснением.
// Сравнение новой и базовой страницы на одних и тех же чарах (id из ui_*.json). node _check/rev3/fx.js _check/rev3/v3_sheet_task.js <страница> W H
const path=require('path');
module.exports=async({ev,page,file,log})=>{const W=page.viewportSize().width,H=page.viewportSize().height,tag=(file.includes('base')?'base_':'')+W+'x'+H,out={};
  for(const [c,id] of [['hemo',1276],['cryo',285],['pyro',79],['bers',944]]){
    out[c]=await ev(`(()=>{selectClass('${c}');startGame();const R0=Math.random;Math.random=mpRng(77);try{clearWorld();runFresh(160);}finally{Math.random=R0;}S.talents={};computeStats();recalcStats();
      openBook('tal');showTab('tal');$('#tpAuto').click();showTab('lib');openSheet(${id});const sh=$('#sh'),R=sh.getBoundingClientRect();
      const kids=[...sh.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().width>0);let worst=0,we='';for(const e of kids){const r=e.getBoundingClientRect();const o=r.right-(R.right-1);if(o>worst){worst=o;we=(e.className||e.tagName)+':'+(e.textContent||'').slice(0,30);}}
      const sc=[sh,...sh.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return /auto|scroll/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+2;}).map(e=>(e.className||e.id)+' '+e.scrollHeight+'/'+e.clientHeight);
      const pb=sh.querySelector('.pwb');return {name:skName(SKILLS[${id}]),shW:Math.round(R.width),vw:innerWidth,overRight:Math.round(worst),worst:we,scrollers:sc,pwbBottom:pb?Math.round(pb.getBoundingClientRect().bottom):null,shBottom:Math.round(R.bottom),
        shStyle:getComputedStyle(sh).overflow+' '+getComputedStyle(sh).display};})()`);
    await page.screenshot({path:path.join(__dirname,`sheet_${tag}_${c}.png`)});log(c,JSON.stringify(out[c]));}
  return out;};
