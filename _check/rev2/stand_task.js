// задача для fx.js: стенд проверяющего (r_stand2.js) — ветка класса 0 против полной, парные зёрна, среднее и разброс.
// env: CL (классы через запятую), L (160), T (длина боя, 24), SI (зёрна бессмертных), SK (зёрна «гибнут»), PER=1 — ещё «полная без таланта X» по каждому,
// EXTRA — JSON {класс:{имя:{талант:очки}}} доп. раскладки; OUT — json.
module.exports=async({ev,log,stand})=>{await stand();const L=+(process.env.L||160),T=+(process.env.T||24),SI=JSON.parse(process.env.SI||'[1,2,3,4]'),SK=JSON.parse(process.env.SK||'[3,4,5,6,7,8]');
  const CL=(process.env.CL||'pyro,cryo,storm,plague,necro,paladin,geo,windr,hemo,arcan,bers,dk,druid,hunter,assassin,shaman,monk,lock,inq,alch').split(','),EX=JSON.parse(process.env.EXTRA||'{}'),out={};
  for(const c of CL){await ev(`bookOpen=true;window.__rb=__rst.build('${c}',${L},${+(process.env.BSEED||31)});true`);
    const g=await ev(`(()=>{const g={};for(const t of TALENTS)g[t.id]=t.max;return g;})()`),br=await ev(`(()=>{const a={};for(const t of CT_TAL['${c}']||[])a[t.id]=t.max;return a;})()`);
    const run=async(tal,hp,seeds)=>{const r=[];for(const sd of seeds)r.push(await ev(`__rst.run({b:__rb,tal:${JSON.stringify(tal)},seed:${sd},T:${T},hp:${hp||0}})`));return r;};
    const avg=(r,k)=>r.reduce((s,x)=>s+x[k],0)/r.length;
    const cf={none:{},all:br};if(process.env.PER)for(const id in br){const o=Object.assign({},br);delete o[id];cf['-'+id]=o;}Object.assign(cf,EX[c]||{});
    const est=await ev(`(()=>{S.talents=${JSON.stringify(Object.assign({},g,br))};computeStats();const L=[];for(const id of S.active){if(id==null)continue;L.push(Math.log(ctTalPw(SKILLS[id])));}S.talents={};computeStats();return +Math.exp(L.reduce((a,b)=>a+b,0)/Math.max(1,L.length)).toFixed(3);})()`);
    const i0=await run(g,0,SI);const HP=Math.round(avg(i0,'dps')*+(process.env.HPK||.5));const k0=await run(g,HP,SK);const res={HP,est};
    for(const name in cf){const tal=Object.assign({},g,cf[name]);const ri=name==='none'?i0:await run(tal,0,SI),rk=name==='none'?k0:await run(tal,HP,SK);
      const pr={};for(const x of rk)for(const k in x.proc)pr[k]=(pr[k]||0)+x.proc[k];
      const rat=rk.map((x,i)=>x.dps/Math.max(1,k0[i].dps)),m=rat.reduce((s,x)=>s+x,0)/rat.length,sd=Math.sqrt(rat.reduce((s,x)=>s+(x-m)*(x-m),0)/rat.length);
      const ratI=ri.map((x,i)=>+(x.dps/Math.max(1,i0[i].dps)).toFixed(2));
      res[name]={ratI,imm:Math.round(avg(ri,'dps')),kill:Math.round(avg(rk,'dps')),gI:+(avg(ri,'dps')/avg(i0,'dps')).toFixed(3),gK:+(avg(rk,'dps')/avg(k0,'dps')).toFixed(3),sdK:+sd.toFixed(3),
        kpm:+avg(rk,'kpm').toFixed(1),frenzy:+avg(rk,'frenzy').toFixed(2),frenzyI:+avg(ri,'frenzy').toFixed(2),shadow:+avg(rk,'shadow').toFixed(2),series:+avg(rk,'series').toFixed(1),summ:+avg(rk,'summ').toFixed(1),minHp:+avg(rk,'minHp').toFixed(2),proc:pr};
      if(name!=='none')log(c,name,'×'+res[name].gK,'±'+res[name].sdK,'бессм ×'+res[name].gI,process.env.SHOWI?JSON.stringify(res[name].ratI):'',res[name].frenzy?'бешенство '+res[name].frenzy:'');}
    out[c]=res;}
  if(process.env.OUT)require('fs').writeFileSync(process.env.OUT,JSON.stringify(out,null,1));return Object.keys(out).length;};
