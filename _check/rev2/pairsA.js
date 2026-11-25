// Пары для замера реального урона (как rar/pairs.js), но раскладка талантов — из «Авто» (b_auto.js) или все на максимуме.
// node pairsA.js <корень> <выход.json> <L> <all|gen|auto> [auto.json]
// all — все таланты на максимуме + особенность; gen — общие на максимуме, без особенности; auto — раскладка «Авто» уровня L + особенность.
const fs=require('fs'),path=require('path');const {load}=require('./lib');
const [rootArg,outArg,Ls,mode,autoF]=process.argv.slice(2);const L=+Ls;const AUTO=autoF?JSON.parse(fs.readFileSync(autoF,'utf8')):null;
const g=load(path.resolve(rootArg));const jobs=[],sel={};
for(const C of g.CLASSES){let tal;if(mode==='gen')tal=g.genMax();else if(mode==='auto'||mode==='autogen'){const lay=AUTO[C.id]&&AUTO[C.id][L];if(!lay)continue;tal=lay.tal;if(mode==='autogen'){const gi=new Set(g.TALENTS.map(t=>t.id));tal=Object.fromEntries(Object.entries(tal).filter(([k])=>gi.has(k)));}}else tal={...g.genMax(),...g.clsMax(C.id)};
  g.use(C.id,L,tal);const I=g.G.get('rarInfo')(),sp=g.G.get('skParts');const ok=id=>{const p=sp(g.SKILLS[id],false);return p.pw>0&&p.ext<.2*p.pw;};sel[C.id]=[];
  const G=mode==='gen'||mode==='autogen';const t1=G?'g1':'c1',t0=G?'g0':'c0',ct=G?0:1;
  for(const act of [true,false]){const ids=[...C.pool].filter(id=>g.SKILLS[id].active===act&&ok(id));const P={};for(const id of ids)P[id]=g.pw(id,1);
    for(let r=0;r<3;r++){const lo=ids.filter(id=>(I.map.get(id)|0)===r).sort((a,b)=>P[b]-P[a]).slice(0,2),hi=ids.filter(id=>(I.map.get(id)|0)===r+1).sort((a,b)=>P[a]-P[b]).slice(0,2);
      if(!lo.length||!hi.length)continue;sel[C.id].push({act,r,lo,hi,shown:{lo:lo.map(i=>P[i]),hi:hi.map(i=>P[i])}});
      for(const id of [...lo,...hi])for(const [t,tl] of [[t1,tal],[t0,{}]]){const b={id,cls:C.id,lvl:L,t,ct,tal:tl};
        if(act){jobs.push({...b,scen:'one'});jobs.push({...b,scen:'flow',seed:11});}else jobs.push({...b,scen:'flow',seed:11,T:40});}}}}
fs.writeFileSync(outArg,JSON.stringify({L,mode:(mode==='gen'||mode==='autogen')?'gen':'all',sel,jobs}));console.log(mode,L,'пар',Object.values(sel).reduce((a,b)=>a+b.length,0),'прогонов',jobs.length);
