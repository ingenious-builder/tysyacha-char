// задача для fx.js: из чего сложен урон на стенде (r_stand2.js, 160-й, общие на максимуме): герой / призывы / особенность (ctx) / DoT. Ветка 0 и полная.
module.exports=async({ev,log,stand})=>{await stand();const L=+(process.env.L||160),T=+(process.env.T||16),SK=JSON.parse(process.env.SK||'[3,4,5,6]'),HPm=process.env.HPM||'kill';
  const CL=(process.env.CL||'pyro,cryo,storm,plague,necro,paladin,geo,windr,hemo,arcan,bers,dk,druid,hunter,assassin,shaman,monk,lock,inq,alch').split(','),out={};
  await ev(`window.__shr=null;if(!window.__dd0){window.__dd0=dealDamage;dealDamage=function(en,b,el,o){const h=en.hp;const x=__dd0.apply(this,arguments);if(window.__shr){const d=Math.max(0,Math.min(h,1e15)-Math.max(0,en.hp));const k=o.fromS?'summ':o.ctx?'ct':o.dot?'dot':o.basic?'basic':'cast';__shr[k]=(__shr[k]||0)+d;}return x;};}true`);
  for(const c of CL){await ev(`bookOpen=true;window.__rb=__rst.build('${c}',${L},31);true`);
    const g=await ev(`(()=>{const g={};for(const t of TALENTS)g[t.id]=t.max;return g;})()`),br=await ev(`(()=>{const a={};for(const t of CT_TAL['${c}']||[])a[t.id]=t.max;return a;})()`);
    const i0=await ev(`__rst.run({b:__rb,tal:${JSON.stringify(g)},seed:1,T:${T},hp:0})`);const HP=HPm==='kill'?Math.round(i0.dps*.5):0;const res={};
    for(const [nm,tal] of [['none',g],['all',Object.assign({},g,br)]]){await ev(`window.__shr={};true`);let n=0;for(const sd of SK){await ev(`__rst.run({b:__rb,tal:${JSON.stringify(tal)},seed:${sd},T:${T},hp:${HP}})`);n++;}
      const s=await ev(`(()=>{const s=__shr;window.__shr=null;return s;})()`);const tot=Object.values(s).reduce((a,b)=>a+b,0);const o={tot:Math.round(tot/n)};for(const k in s)o[k]=+(s[k]/tot).toFixed(2);res[nm]=o;}
    out[c]=res;log(c,JSON.stringify(res));}
  if(process.env.OUT)require('fs').writeFileSync(process.env.OUT,JSON.stringify(out,null,1));return 1;};
