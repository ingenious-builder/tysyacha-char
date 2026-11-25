// «Что если» потолок другой: реальный урон чар пар (замер b_real при потолке 1,45) × q(новый)/q(1,45) → сколько пар перевернуто в реальном уроне
// и сколько в показанной силе (5-й против 1-го и тот же ранг). node capwhatif.js <pairs.json> <real.json> [потолки]
const fs=require('fs'),path=require('path');const {load}=require('./lib');const [pf,rf,cs]=process.argv.slice(2);const PJ=JSON.parse(fs.readFileSync(pf,'utf8')),R=JSON.parse(fs.readFileSync(rf,'utf8'));
const g=load(path.resolve(__dirname,'../..'));const TQ=g.G.get('TQ'),SK=g.SKILLS,talQ=g.G.get('talQ');
const by={};for(const x of R.rows){if(x.err)continue;const k=x.cls+'|'+x.id+'|'+x.t,o=by[k]||(by[k]={});o[x.scen]=x.dps;o.q=x.q;}
const T1=PJ.mode==='gen'?'g1':'c1',T0=PJ.mode==='gen'?'g0':'c0';const real=(c,id,t)=>{const o=by[c+'|'+id+'|'+t];return o.one!=null?.35*o.one+.65*o.flow:o.flow;};
const tal0=c=>{const j=PJ.jobs.find(j=>j.cls===c&&j.t===T1);return j.tal||(PJ.mode==='gen'?g.genMax():{...g.genMax(),...g.clsMax(c)});};
for(const cap of (cs||'1.45,1.35,1.25,1.15,1.0').split(',').map(Number)){let inv=0,inv0=0,poolK=[],n=0;
  for(const c in PJ.sel){g.use(c,PJ.L,tal0(c));TQ.lc=Math.log(cap);TQ.key=null;const qn={};const q=id=>qn[id]!=null?qn[id]:(qn[id]=talQ(SK[id]));
    for(const p of PJ.sel[c]){n++;const r=id=>real(c,id,T1)*q(id)/by[c+'|'+id+'|'+T1].q;const lo=Math.max(...p.lo.map(r)),hi=Math.min(...p.hi.map(r));if(hi/lo<1/1.1)inv++;
      const lo0=Math.max(...p.lo.map(id=>real(c,id,T0))),hi0=Math.min(...p.hi.map(id=>real(c,id,T0)));if(hi0/lo0<1/1.1)inv0++;
      for(const id of [...p.lo,...p.hi])poolK.push(r(id)/real(c,id,T0));}}
  const gm=Math.exp(poolK.reduce((s,v)=>s+Math.log(v),0)/poolK.length);
  console.log(`потолок ×${cap}: реальный урон — явно перевёрнуто ${inv} из ${n} (без талантов ${inv0}); средний реальный прирост от талантов у этих чар ×${gm.toFixed(2)}`);}
TQ.lc=Math.log(1.45);
