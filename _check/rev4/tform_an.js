// разбор tform_task: по видам чар — замер/оценка прироста от каждого таланта (медиана по классам). node tform_an.js <out.json>
const fs=require('fs');const J=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const by={};
for(const r of J.rows){if(r.err)continue;const k=r.cls+'|'+r.id+'|'+r.t,o=by[k]||(by[k]={});if(r.scen==='flow'){o.fs=(o.fs||0)+r.dps;o.fn=(o.fn||0)+1;o.flow=o.fs/o.fn;}else o[r.scen]=r.dps;o.sh=r.shown;o.q=r.q;}
const real=(c,id,t)=>{const o=by[c+'|'+id+'|'+t];if(!o)return null;return o.one!=null?.35*o.one+.65*o.flow:o.flow;};
const F={};const ids=new Set(J.rows.map(r=>r.cls+'|'+r.id));
for(const ci of ids){const [c,id]=ci.split('|');const m=J.meta[id],r0=real(c,id,'0'),s0=by[ci+'|0'].sh;if(!(r0>0))continue;
  for(const t of ['all',...J.TL]){const o=by[ci+'|'+t];if(!o)continue;const rg=real(c,id,t)/r0,sg=o.sh/s0;(F[m.f]=F[m.f]||{})[t]=(F[m.f][t]||[]);F[m.f][t].push({c,id,rg,sg,d:rg/sg});}}
const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1];};
const out={};for(const f of Object.keys(F).sort()){const line=[];out[f]={};for(const t of ['all',...J.TL]){const a=F[f][t];if(!a)continue;const d=med(a.map(x=>x.d)),rg=med(a.map(x=>x.rg)),sg=med(a.map(x=>x.sg));out[f][t]={d,rg,sg,n:a.length};
    if(t==='all'||Math.abs(rg-1)>.03||Math.abs(sg-1)>.03)line.push(`${t} ${rg.toFixed(2)}/${sg.toFixed(2)}${Math.abs(d-1)>.12?(d>1?'↑':'↓'):''}`);}
  console.log(f.padEnd(13),'(n='+F[f].all.length+')',line.join(' | '));}
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(out,null,1));
