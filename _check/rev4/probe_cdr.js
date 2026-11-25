// задача для fx.js: почему у прыжка и «Костра» урон падает от «Перегрева» — касты и урон за каст на стенде
const fs=require('fs'),path=require('path');
module.exports=async({ev,log})=>{await ev(`bookOpen=true;selectClass('pyro');startGame();clearWorld();luQueue=0;true`);await ev(fs.readFileSync(path.join(__dirname,'../rev2/sim_tal.js'),'utf8'));
  await ev(`(()=>{const c0=cast;window.__nc=0;cast=function(sk){window.__nc++;return c0.apply(this,arguments);};return 1;})()`);
  const out=[];for(const [c,id] of [['paladin',2486],['bers',2484],['inq',8367],['inq',2362],['necro',2387]])for(const cd of [0,5])for(const scen of ['one','flow']){
    await ev('window.__nc=0;true');const r=await ev(`__simt.run(${JSON.stringify({id,cls:c,lvl:160,t:'x',ct:0,tal:cd?{cdr:cd}:{},scen,seed:11})})`);const n=await ev('window.__nc');
    out.push(`${c} ${id} ${scen} cdr${cd}: dps ${Math.round(r.dps)} cyc ${r.cyc.toFixed(2)} кастов ${n}`);}
  out.forEach(x=>log(x));return 1;};
