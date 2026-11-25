// распределение t (множитель талантов) по ступеням пула: у каждого класса — наименьший t ступени и чем он сложен (доля пользы ext)
const path=require('path');const {load}=require('../rev2/lib');const g=load(path.resolve(process.argv[2]||path.join(__dirname,'../..')));const L=+(process.argv[3]||160);
const TQ=g.G.get('TQ'),tqT=g.G.get('tqT'),rarOf=g.G.get('rarOf'),sp=g.G.get('skParts'),talQ=g.G.get('talQ');let lossSum=0,n=0;
for(const C of g.CLASSES){g.use(C.id,L,g.genMax());TQ.key=null;const ids=[...C.pool],t=tqT(ids);const rows=[];
  for(const act of [true,false]){const parts=[];for(let r=0;r<4;r++){const a=ids.map((id,i)=>[id,t[i]]).filter(([id])=>g.SKILLS[id].active===act&&(rarOf(g.SKILLS[id])|0)===r).sort((x,y)=>x[1]-y[1]);
      if(!a.length)continue;const [id,tm]=a[0],p=sp(g.SKILLS[id],false),med=a[a.length>>1][1];parts.push(`${r}: min ${tm.toFixed(2)} ${g.SKILLS[id].F.id}${p.ext>.2*p.pw?'(польза '+Math.round(p.ext/p.pw*100)+'%)':''} мед ${med.toFixed(2)}`);}
    rows.push((act?'акт ':'пас ')+parts.join(' | '));}
  let ls=0,k=0;for(const id of ids){const q=talQ(g.SKILLS[id]);ls+=Math.log(q);k++;}lossSum+=ls/k;n++;
  console.log(C.id,'средний q пула ×'+Math.exp(ls/k).toFixed(2)+'\n  '+rows.join('\n  '));}
console.log('средний q по классам ×'+Math.exp(lossSum/n).toFixed(3));
