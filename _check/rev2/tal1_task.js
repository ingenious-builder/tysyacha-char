// задача для fx.js: реальный прирост урона подозрительных чар от каждого общего таланта по отдельности (без особенности класса), и показанный
// env: IDS (JSON [[класс,id],...]), L, OUT
const fs=require('fs'),path=require('path');
module.exports=async({ev,log})=>{const IDS=JSON.parse(process.env.IDS),L=+(process.env.L||160);
  await ev(`bookOpen=true;selectClass('pyro');startGame();clearWorld();luQueue=0;true`);await ev(fs.readFileSync(path.join(__dirname,'sim_tal.js'),'utf8'));
  const TL=await ev(`TALENTS.map(t=>[t.id,t.max])`);const out={};
  for(const [c,id] of IDS){const r={};const run=async(tal)=>{const o={id,cls:c,lvl:L,ct:0,t:'x',tal};const a=await ev(`__simt.run(${JSON.stringify({...o,scen:'one'})})`),b=await ev(`__simt.run(${JSON.stringify({...o,scen:'flow',seed:11})})`);
      return {real:.35*a.dps+.65*b.dps,shown:a.shown,q:a.q};};
    const z=await run({});const all={};for(const [t,m] of TL)all[t]=m;const f=await run(all);r._all={real:+(f.real/z.real).toFixed(2),shown:+(f.shown/z.shown).toFixed(2),q:+f.q.toFixed(2)};
    for(const [t,m] of TL){const x=await run({[t]:m});const k=x.real/z.real,s=x.shown/z.shown;if(Math.abs(k-1)>.03||Math.abs(s-1)>.03)r[t]={real:+k.toFixed(2),shown:+s.toFixed(2),q:+x.q.toFixed(2)};}
    out[c+':'+id]=r;log(c,id,JSON.stringify(r));}
  if(process.env.OUT)fs.writeFileSync(process.env.OUT,JSON.stringify(out,null,1));return 1;};
