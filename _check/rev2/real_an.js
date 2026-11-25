// Разбор реального урона критических пар (b_real.js): node _check/rar/real_an.js <pairs.json> <real.json> [подпись]
// реальная сила чары = 0,35 × «один враг» + 0,65 × «поток» у активных (как power_check), «поток» у пассивных.
// Пара перевёрнута, если слабейшая (по замеру) из 2 чар редкости выше слабее сильнейшей из 2 чар редкости ниже.
// Допуск шума: отношение < 1/1,10 — «явно», 1/1,10…1 — «в пределах шума» (оценка против замера у видов чар — до ±15%, power_check).
const fs=require('fs');const [pf,rf,tag]=process.argv.slice(2);const PJ=JSON.parse(fs.readFileSync(pf,'utf8')),R=JSON.parse(fs.readFileSync(rf,'utf8'));
const by={};for(const x of R.rows){if(x.err)continue;const k=x.cls+'|'+x.id+'|'+x.t,o=by[k]||(by[k]={});o[x.scen]=x.dps;o.shown=x.shown;o.q=x.q;}
const real=(c,id,t)=>{const o=by[c+'|'+id+'|'+t];if(!o)return null;return o.one!=null?.35*o.one+.65*o.flow:o.flow;};
const T1={gen:'g1',gennc:'n1'}[PJ.mode]||'c1',T0={gen:'g0',gennc:'n0'}[PJ.mode]||'c0';let n=0,inv={tal:0,none:0},noisy={tal:0,none:0},worst=[],kr=[];const perC={};
for(const c in PJ.sel)for(const p of PJ.sel[c]){n++;const pc=perC[c]||(perC[c]={n:0,tal:0,none:0});pc.n++;
  for(const t of ['tal','none']){const tt=t==='tal'?T1:T0;const lo=Math.max(...p.lo.map(i=>real(c,i,tt))),hi=Math.min(...p.hi.map(i=>real(c,i,tt))),m=hi/lo;
    if(m<1/1.1){inv[t]++;pc[t]++;}else if(m<1)noisy[t]++;if(t==='tal')worst.push([m,c,p.act?'акт':'пас',p.r]);}
  for(const id of [...p.lo,...p.hi]){const a=by[c+'|'+id+'|'+T1],b=by[c+'|'+id+'|'+T0];if(!a||!b)continue;const rk=real(c,id,T1)/real(c,id,T0),sk=a.shown/b.shown;kr.push({c,id,rk,sk,d:rk/sk});}}
worst.sort((a,b)=>a[0]-b[0]);
const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1];};
const dr=kr.map(x=>x.d);const far=kr.filter(x=>x.d>1.15||x.d<1/1.15);
console.log(`${tag||''} пар ${n}: перевёрнуто явно (×<0,91) с талантами ${inv.tal}, без талантов ${inv.none}; в пределах шума (×0,91–1) с талантами ${noisy.tal}, без ${noisy.none}`);
console.log('самые тесные пары с талантами:',worst.slice(0,6).map(w=>`${w[1]} ${w[2]} ${w[3]}→${w[3]+1} ×${w[0].toFixed(2)}`).join('; '));
console.log(`множитель талантов: замер / показанный — медиана ×${med(dr).toFixed(2)}, вне ±15%: ${far.length} из ${kr.length}`+(far.length?' ('+[...new Set(far.map(x=>x.c))].map(c=>c+' '+far.filter(x=>x.c===c).length).join(', ')+')':''));
console.log('по классам (явно перевёрнуто с талантами / без):',Object.entries(perC).filter(([c,v])=>v.tal||v.none).map(([c,v])=>`${c} ${v.tal}/${v.none} из ${v.n}`).join(', ')||'нет');
if(process.argv[5])fs.writeFileSync(process.argv[5],JSON.stringify({n,inv,noisy,worst:worst.slice(0,20),perC,kr},null,1));
