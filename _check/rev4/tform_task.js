// задача для fx.js: оценка против замера ПРИРОСТА от общих талантов по видам чар (без особенности класса).
// У каждого класса на каждый вид чар пула — одна чара (медиана показанной силы вида), стенд __simt (rev2/sim_tal.js):
// таланты {} / каждый талант X на максимуме / все общие на максимуме. env: L (160), CL, TL (таланты через запятую), OUT.
const fs=require('fs'),path=require('path');
module.exports=async({ev,log})=>{const L=+(process.env.L||160),TL=(process.env.TL||'power,cdr,mana,wrath,summ,luck,cascade,orbit').split(',');
  await ev(`bookOpen=true;selectClass('pyro');startGame();clearWorld();luQueue=0;true`);await ev(fs.readFileSync(path.join(__dirname,'../rev2/sim_tal.js'),'utf8'));
  const CL=process.env.CL?process.env.CL.split(','):await ev(`CLASSES.map(c=>c.id)`);
  const gen=await ev(`(()=>{const a={};for(const t of TALENTS)a[t.id]=t.max;return a;})()`),mx=await ev(`(()=>{const a={};for(const t of TALENTS)a[t.id]=t.max;return a;})()`);
  const rows=[];
  for(const c of CL){
    const pick=await ev(`(()=>{const C=CLASS_BY['${c}'],keep=CLS;CLS=C;S.lvl=${L};S.talents={};S.ranks={};computeStats();PWC=new Map();const by={};
      try{for(const id of C.pool){const sk=SKILLS[id],p=skParts(sk,false);if(!(p.pw>0)||p.ext>.2*p.pw)continue;(by[sk.F.id]=by[sk.F.id]||[]).push([id,p.pw]);}}finally{CLS=keep;}
      return Object.values(by).map(a=>{a.sort((x,y)=>x[1]-y[1]);return a[a.length>>1][0];});})()`);
    const cfgs=[['0',{}],['all',gen],...TL.map(t=>[t,{[t]:mx[t]}])];const jobs=[];
    for(const id of pick)for(const [nm,tal] of cfgs){const act=await ev(`SKILLS[${id}].active`);const b={id,cls:c,lvl:L,t:nm,ct:0,tal};
      const SD=JSON.parse(process.env.SEEDS||'[11]');if(act)jobs.push({...b,scen:'one'});for(const seed of SD){if(act)jobs.push({...b,scen:'flow',seed});else jobs.push({...b,scen:'flow',seed,T:40});}}
    for(let i=0;i<jobs.length;i+=12)rows.push(...await ev('__simt.batch('+JSON.stringify(jobs.slice(i,i+12))+')'));
    log(c,pick.length,'чар',jobs.length,'прогонов');}
  const meta=await ev(`(()=>{const o={};for(const r of ${JSON.stringify([...new Set(rows.map(r=>r.id))])}){const s=SKILLS[r];o[r]={f:s.F.id,e:s.E.id,m:s.M.id||'',act:s.active,nm:skName(s)};}return o;})()`);
  if(process.env.OUT)fs.writeFileSync(process.env.OUT,JSON.stringify({L,TL,rows,meta}));return rows.length;};
