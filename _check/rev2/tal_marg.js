// Не стали ли таланты пустышкой: прирост силы чар от каждого таланта с потолком (talQ) и без него (TQ.raw=1).
// node tal_marg.js <корень> [L] [база: max|zero]
// max — от «всё на максимуме» убираем талант X; zero — у героя без талантов вкладываем только X на максимум.
const path=require('path');const {load}=require('./lib');const [root,Ls,base]=process.argv.slice(2);const L=+(Ls||160),B=base||'max';
const g=load(path.resolve(root));const TQ=g.G.get('TQ');const gm=a=>Math.exp(a.reduce((s,v)=>s+Math.log(v),0)/a.length);
const rows=[];const worstTarget=[];
for(const C of g.CLASSES){const full={...g.genMax(),...g.clsMax(C.id)};const ids=[...C.pool];
  const P=(tal,raw)=>{g.use(C.id,L,tal);TQ.raw=raw?1:0;const o={};for(const id of ids)o[id]=g.pw(id,1);TQ.raw=0;return o;};
  const tl=[...g.TALENTS,...(g.CT_TAL[C.id]||[])];
  for(const T of tl){let a,b;if(B==='max'){const lo=Object.assign({},full);delete lo[T.id];a=lo;b=full;}else{a={};b={[T.id]:T.max};}
    const c0=P(a,0),c1=P(b,0),u0=P(a,1),u1=P(b,1);
    const gc=ids.map(id=>c1[id]/c0[id]),gu=ids.map(id=>u1[id]/u0[id]);
    const gmu=gm(gu);const tgt=ids.filter((id,i)=>gu[i]>gmu*1.03);   // «свои» чары таланта: их таланту без потолка прибавка выше средней
    const tu=tgt.length?gm(tgt.map(id=>u1[id]/u0[id])):null,tc=tgt.length?gm(tgt.map(id=>c1[id]/c0[id])):null;
    rows.push({c:C.id,t:T.id,b:T.b,poolU:gmu,poolC:gm(gc),nT:tgt.length,tgtU:tu,tgtC:tc,minC:Math.min(...gc),maxC:Math.max(...gc)});}}
const f=x=>x==null?'—':x.toFixed(3);
// сводка: таланты, у которых на «своих» чарах потолок съедает больше половины прироста, и таланты с приростом пула < 1%
const eaten=rows.filter(r=>r.tgtU&&r.tgtU>1.05&&(r.tgtC-1)<.5*(r.tgtU-1));const empty=rows.filter(r=>r.poolU>1.01&&r.poolC<1.01&&(!r.tgtC||r.tgtC<1.01));const neg=rows.filter(r=>r.minC<.995);
console.log(`L=${L} база=${B}: талантов×классов ${rows.length}`);
console.log(`потолок съедает > половины прироста «своих» чар: ${eaten.length}`);for(const r of eaten.slice(0,40))console.log(`  ${r.c} ${r.t}: свои чары (${r.nT}) без потолка ×${f(r.tgtU)} → с потолком ×${f(r.tgtC)}; пул ×${f(r.poolU)} → ×${f(r.poolC)}`);
console.log(`прирост пула пропал (было > 1%, стало < 1%): ${empty.length}`);for(const r of empty)console.log(`  ${r.c} ${r.t}: пул ×${f(r.poolU)} → ×${f(r.poolC)}`);
console.log(`талант ОСЛАБЛЯЕТ какие-то чары (×<0,995): ${neg.length}`);for(const r of neg.slice(0,40))console.log(`  ${r.c} ${r.t}: мин ×${f(r.minC)} макс ×${f(r.maxC)}; пул ×${f(r.poolC)}`);
require('fs').writeFileSync(path.join(__dirname,`marg_${B}_${L}.json`),JSON.stringify(rows,null,0));
