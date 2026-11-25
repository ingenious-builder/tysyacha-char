const fs=require('fs');const R=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const by={};
for(const x of R.rows){if(x.err){console.log('ERR',x.cls,x.id,x.err);continue;}const k=x.cls+'|'+x.id+'|'+x.imp,o=by[k]||(by[k]={});o[x.scen]=x.dps;o.shown=x.shown;o.q=x.q;}
const real=k=>{const o=by[k];return o.one!=null?.35*o.one+.65*o.flow:o.flow;};const rs=[];
for(const c in R.sel)for(const p of R.sel[c]){const w=c+'|'+p.w+'|1',s=c+'|'+p.s+'|0';if(!by[w]||!by[s])continue;rs.push({c,act:p.act,real:real(w)/real(s),shown:by[w].shown/by[s].shown,qw:by[w].q,qs:by[s].q});}
rs.sort((a,b)=>a.real-b.real);console.log('пар',rs.length,'реальный урон: невозможная слабее сильнейшей легендарной (×<1):',rs.filter(r=>r.real<1).length,'(×<0,91:',rs.filter(r=>r.real<1/1.1).length+')','; показанная ×<1:',rs.filter(r=>r.shown<1).length);
console.log('худшие:',rs.slice(0,8).map(r=>`${r.c} ${r.act?'акт':'пас'} замер ×${r.real.toFixed(2)} показ ×${r.shown.toFixed(2)} (q ${r.qw.toFixed(2)}/${r.qs.toFixed(2)})`).join('; '));
console.log('показанная мин ×'+Math.min(...rs.map(r=>r.shown)).toFixed(3));
