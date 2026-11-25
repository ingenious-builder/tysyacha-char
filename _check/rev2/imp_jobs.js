// «Невозможная» против легендарной: у каждого класса слабейшая легендарная (по показанной силе с талантами) делается невозможной,
// против сильнейшей легендарной того же типа (акт/пас). node imp_jobs.js <корень> <выход> <L> <all|auto> [auto.json]
const fs=require('fs'),path=require('path');const {load}=require('./lib');const [root,out,Ls,mode,autoF]=process.argv.slice(2);const L=+Ls;
const g=load(path.resolve(root));const A=autoF?JSON.parse(fs.readFileSync(autoF,'utf8')):null;const jobs=[],sel={};
for(const C of g.CLASSES){const tal=mode==='auto'?A[C.id][L].tal:{...g.genMax(),...g.clsMax(C.id)};g.use(C.id,L,tal);const I=g.G.get('rarInfo')(),sp=g.G.get('skParts');
  const ok=id=>{const p=sp(g.SKILLS[id],false);return p.pw>0&&p.ext<.2*p.pw;};sel[C.id]=[];
  for(const act of [true,false]){const ids=[...C.pool].filter(id=>g.SKILLS[id].active===act&&ok(id)&&(I.map.get(id)|0)===3);if(ids.length<2)continue;const P={};for(const id of ids)P[id]=g.pw(id,1);
    ids.sort((a,b)=>P[a]-P[b]);const w=ids[0],s=ids[ids.length-1];sel[C.id].push({act,w,s});
    for(const [id,imp] of [[w,1],[s,0]]){const b={id,imp,cls:C.id,lvl:L,t:'c1',ct:1,tal};if(act){jobs.push({...b,scen:'one'});jobs.push({...b,scen:'flow',seed:11});}else jobs.push({...b,scen:'flow',seed:11,T:40});}}}
fs.writeFileSync(out,JSON.stringify({L,sel,jobs}));console.log('пар',Object.values(sel).reduce((a,b)=>a+b.length,0),'прогонов',jobs.length);
