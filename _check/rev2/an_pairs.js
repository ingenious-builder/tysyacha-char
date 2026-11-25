// подробно о перевёрнутых парах реального урона: какие чары, показанная сила и замер с талантами/без, формы
const fs=require('fs'),path=require('path');const [pf,rf,root]=process.argv.slice(2);const PJ=JSON.parse(fs.readFileSync(pf,'utf8')),R=JSON.parse(fs.readFileSync(rf,'utf8'));
const {load}=require('./lib');const g=load(path.resolve(root||'../..'));const S=g.SKILLS;
const by={};for(const x of R.rows){if(x.err)continue;const k=x.cls+'|'+x.id+'|'+x.t,o=by[k]||(by[k]={});o[x.scen]=x.dps;o.shown=x.shown;o.q=x.q;}
const T1=PJ.mode==='gen'?'g1':'c1',T0=PJ.mode==='gen'?'g0':'c0';
const real=(c,id,t)=>{const o=by[c+'|'+id+'|'+t];if(!o)return null;return o.one!=null?.35*o.one+.65*o.flow:o.flow;};
const nm=id=>S[id].F.id+'/'+S[id].E.id+(S[id].M&&S[id].M.id?'/'+S[id].M.id:'');
const L=[];for(const c in PJ.sel)for(const p of PJ.sel[c]){const r=id=>real(c,id,T1),r0=id=>real(c,id,T0),sh=id=>by[c+'|'+id+'|'+T1].shown,q=id=>by[c+'|'+id+'|'+T1].q;
  const lo=p.lo.reduce((a,b)=>r(a)>r(b)?a:b),hi=p.hi.reduce((a,b)=>r(a)<r(b)?a:b);const m=r(hi)/r(lo),m0=r0(hi)/r0(lo);
  L.push({m,m0,c,act:p.act,r:p.r,lo,hi,txt:`${c} ${p.act?'акт':'пас'} ${p.r}→${p.r+1}: замер ×${m.toFixed(2)} (без талантов ×${m0.toFixed(2)}) | низшая ${nm(lo)} показ ${sh(lo).toFixed(0)} замер ${r(lo).toFixed(0)} (без тал. ${r0(lo).toFixed(0)}, прирост ×${(r(lo)/r0(lo)).toFixed(2)}, q ${q(lo).toFixed(2)}) | высшая ${nm(hi)} показ ${sh(hi).toFixed(0)} замер ${r(hi).toFixed(0)} (без тал. ${r0(hi).toFixed(0)}, прирост ×${(r(hi)/r0(hi)).toFixed(2)}, q ${q(hi).toFixed(2)})`});}
L.sort((a,b)=>a.m-b.m);const N=+(process.argv[5]||30);for(const x of L.slice(0,N))console.log(x.txt);
const onlyTal=L.filter(x=>x.m<1/1.1&&x.m0>=1/1.1);console.log('явно перевёрнуто только с талантами (без талантов порядок держался):',onlyTal.length);
