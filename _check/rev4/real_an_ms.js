// Разбор реального урона критических пар (b_real_ms.js, поток — среднее по зёрнам): node real_an_ms.js <pairs.json> <real.json> [подпись] [потолки через запятую]
// реальная сила = 0,35 × «один враг» + 0,65 × «поток» у активных, «поток» у пассивных. Пара перевёрнута явно, если слабейшая из 2 чар
// редкости выше слабее сильнейшей из 2 чар редкости ниже больше чем на 10% (×<0,91). Потолки — «что если»: замер × q(потолок)/q(в замере).
const fs=require('fs'),path=require('path');const [pf,rf,tag,caps]=process.argv.slice(2);const PJ=JSON.parse(fs.readFileSync(pf,'utf8')),R=JSON.parse(fs.readFileSync(rf,'utf8'));
const by={};for(const x of R.rows){if(x.err)continue;const k=x.cls+'|'+x.id+'|'+x.t,o=by[k]||(by[k]={});if(x.scen==='flow'){o.fs=(o.fs||0)+x.dps;o.fn=(o.fn||0)+1;o.flow=o.fs/o.fn;}else o[x.scen]=x.dps;o.shown=x.shown;o.q=x.q;}
const real=(c,id,t)=>{const o=by[c+'|'+id+'|'+t];if(!o)return null;return o.one!=null?.35*o.one+.65*o.flow:o.flow;};
const T1={gen:'g1',gennc:'n1'}[PJ.mode]||'c1',T0={gen:'g0',gennc:'n0'}[PJ.mode]||'c0';
let qf=null;if(caps){const {load}=require('../rev2/lib');const g=load(path.resolve(process.env.ROOTG||path.join(__dirname,'../..')));qf={g,TQ:g.G.get('TQ'),talQ:g.G.get('talQ')};}
function count(cap){let n=0,inv=0,inv0=0,noisy=0,worst=[];const perC={};
  for(const c in PJ.sel){let qn=null;if(cap){const j=PJ.jobs.find(j=>j.cls===c&&j.t===T1);qf.g.use(c,PJ.L,j.tal||{});qf.TQ.c=cap;qf.TQ.key=null;qn={};}
    const rr=(id,t)=>{let v=real(c,id,t);if(cap&&t===T1){const o=by[c+'|'+id+'|'+t];if(qn[id]==null)qn[id]=qf.talQ(qf.g.SKILLS[id]);v*=qn[id]/o.q;}return v;};
    for(const p of PJ.sel[c]){n++;const lo=Math.max(...p.lo.map(i=>rr(i,T1))),hi=Math.min(...p.hi.map(i=>rr(i,T1))),m=hi/lo;
      const lo0=Math.max(...p.lo.map(i=>rr(i,T0))),hi0=Math.min(...p.hi.map(i=>rr(i,T0))),m0=hi0/lo0;
      if(m<1/1.1){inv++;perC[c]=(perC[c]||0)+1;}else if(m<1)noisy++;if(m0<1/1.1)inv0++;worst.push([m,m0,c,p.act?'акт':'пас',p.r]);}}
  if(qf){qf.TQ.c=qf.g.G.get('TAL_CAP');qf.TQ.key=null;}worst.sort((a,b)=>a[0]-b[0]);return {n,inv,inv0,noisy,worst:worst.slice(0,5),perC};}
const r=count(null);
console.log(`${tag||''} пар ${r.n}: явно перевёрнуто с талантами ${r.inv}, без талантов ${r.inv0}; в шуме (×0,91–1) с талантами ${r.noisy}; худшие: `+r.worst.map(w=>`${w[2]} ${w[3]} ${w[4]}→${w[4]+1} ×${w[0].toFixed(2)} (без ×${w[1].toFixed(2)})`).join('; '));
if(caps)for(const c of caps.split(',').map(Number)){const x=count(c);console.log(`   потолок ×${c}: явно перевёрнуто ${x.inv} (без талантов ${x.inv0})`);}
if(process.env.JSON_OUT)fs.writeFileSync(process.env.JSON_OUT,JSON.stringify(r));
