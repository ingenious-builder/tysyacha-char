// подробно о явно перевёрнутых парах (поток — среднее по зёрнам): node an_detail.js <pairs> <real> [корень игры для имён]
const fs=require('fs'),path=require('path');const [pf,rf,root]=process.argv.slice(2);const PJ=JSON.parse(fs.readFileSync(pf,'utf8')),R=JSON.parse(fs.readFileSync(rf,'utf8'));
const {load}=require('../rev2/lib');const g=load(path.resolve(root||path.join(__dirname,'../..')));const S=g.SKILLS;
const by={};for(const x of R.rows){if(x.err)continue;const k=x.cls+'|'+x.id+'|'+x.t,o=by[k]||(by[k]={});if(x.scen==='flow'){o.fs=(o.fs||0)+x.dps;o.fn=(o.fn||0)+1;o.flow=o.fs/o.fn;}else o[x.scen]=x.dps;o.shown=x.shown;o.q=x.q;}
const T1={gen:'g1'}[PJ.mode]||'c1',T0={gen:'g0'}[PJ.mode]||'c0';
const real=(c,id,t)=>{const o=by[c+'|'+id+'|'+t];return o.one!=null?.35*o.one+.65*o.flow:o.flow;};
const nm=id=>S[id].F.id+'/'+S[id].E.id+'/'+(S[id].M.id||'');
for(const c in PJ.sel)for(const p of PJ.sel[c]){const lo=p.lo.reduce((a,b)=>real(c,a,T1)>real(c,b,T1)?a:b),hi=p.hi.reduce((a,b)=>real(c,a,T1)<real(c,b,T1)?a:b);const m=real(c,hi,T1)/real(c,lo,T1);if(m>=1/1.1)continue;
  const d=id=>{const a=by[c+'|'+id+'|'+T1],b=by[c+'|'+id+'|'+T0];return `${nm(id)} показ ${a.shown.toFixed(0)} (без ${b.shown.toFixed(0)}) замер ${real(c,id,T1).toFixed(0)} (без ${real(c,id,T0).toFixed(0)}) замер/показ ${(real(c,id,T1)/a.shown).toFixed(2)} (без ${(real(c,id,T0)/b.shown).toFixed(2)}) q ${a.q.toFixed(2)}`;};
  console.log(`${c} ${p.act?'акт':'пас'} ${p.r}→${p.r+1} ×${m.toFixed(2)}\n   низшая ${d(lo)}\n   высшая ${d(hi)}`);}
