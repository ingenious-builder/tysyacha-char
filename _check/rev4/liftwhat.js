// «что если» подтяжка (доля пула TQ.lift) и потолок TQ.c: средний q пула, порядок редкостей (тот же ранг и 5-й против 1-го), таланты билда «Авто»
const fs=require('fs'),path=require('path');const {load}=require('../rev2/lib');const g=load(path.resolve(__dirname,'../..'));const A=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const TQ=g.G.get('TQ'),talQ=g.G.get('talQ'),tqT=g.G.get('tqT'),rarOf=g.G.get('rarOf');
for(const lift of (process.argv[3]||'-1,0,.1,.25,.5').split(',').map(Number))for(const L of [50,160]){TQ.lift=lift<0?NaN:lift;let lq=0,n=0,bt=0,bn=0,inv1=0,inv5=0,tot=0,lqT=0;
  for(const C of g.CLASSES){const lay=A[C.id][L];g.use(C.id,L,lay.tal);TQ.key=null;const ids=[...C.pool],t=tqT(ids),q=ids.map(id=>talQ(g.SKILLS[id]));
    ids.forEach((id,i)=>{lq+=Math.log(q[i]);lqT+=Math.log(t[i]*q[i]);n++;});for(const id of lay.a.concat(lay.p)){const i=ids.indexOf(id);if(i>=0){bt+=Math.log(t[i]*q[i]);bn++;}}
    const p1={},p5={};for(const id of ids){p1[id]=g.pw(id,1);p5[id]=g.pw(id,5);}
    for(const act of [true,false])for(let r=0;r<3;r++){const lo=ids.filter(id=>g.SKILLS[id].active===act&&(rarOf(g.SKILLS[id])|0)===r),hi=ids.filter(id=>g.SKILLS[id].active===act&&(rarOf(g.SKILLS[id])|0)===r+1);if(!lo.length||!hi.length)continue;tot++;
      if(Math.max(...lo.map(i=>p1[i]))>Math.min(...hi.map(i=>p1[i])))inv1++;if(Math.max(...lo.map(i=>p5[i]))>Math.min(...hi.map(i=>p1[i])))inv5++;}}
  console.log(`подтяжка ${lift<0?'нет':lift} ур.${L}: средний q пула ×${Math.exp(lq/n).toFixed(3)}, таланты пула ×${Math.exp(lqT/n).toFixed(2)}, чар билда «Авто» ×${Math.exp(bt/bn).toFixed(2)}; тот же ранг перевёрнуто ${inv1}/${tot}, 5-й против 1-го ${inv5}/${tot}`);}
