// Задача для _check/rev3/fx.js: чары с «Силой 0» в листе (разбивка ×0 уровень) — у всех классов, новая и базовая страница.
module.exports=async({ev,log})=>{const r=await ev(`(()=>{const out=[];for(const c of CLASSES.map(x=>x.id)){selectClass(c);startGame();const R0=Math.random;Math.random=mpRng(77);try{clearWorld();runFresh(160);}finally{Math.random=R0;}
    S.talents={};computeStats();recalcStats();onBuildChanged();openBook('tal');showTab('tal');$('#tpAuto').click();
    for(const id of CLS.pool){const sk=SKILLS[id];const p=skParts(sk,false);if(!(p.pw>0)){const b=powerBreak(sk);out.push(c+':'+skName(sk)+' pw='+p.pw+' lvl='+b.lvl+' tal='+b.tal+(typeof talQ==='function'?' q='+talQ(sk).toFixed(3):''));}}}
  return out;})()`);log('чар с силой 0:',r.length);r.slice(0,30).forEach(x=>log(' ',x));return r.length;};
