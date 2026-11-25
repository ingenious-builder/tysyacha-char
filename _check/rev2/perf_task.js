// задача для fx.js: цена пересчёта потолка талантов в игре (после повышения уровня и после смены таланта), без замедления и с замедлением процессора ×4 (как телефон)
module.exports=async({ev,page,log})=>{const res={};
  const meas=async tag=>{res[tag]=await ev(`(()=>{const out={};for(const c of ['pyro','necro','monk','alch','shaman']){selectClass(c);startGame();clearWorld();luQueue=0;
      const R0=Math.random;Math.random=mpRng(5);try{runFresh(120);}finally{Math.random=R0;}S.talents={};computeStats();talSmart(S.lvl-1,S.lvl+2);computeStats();recalcStats();EQUIPPED=new Set(equippedIds());
      const eq=S.active.filter(x=>x!=null).map(id=>SKILLS[id]);const hit=()=>{let s=0;for(const sk of eq)s+=skDmg(sk);return s;};hit();
      const t1=[],t2=[],t3=[];for(let k=0;k<3;k++){S.lvl++;computeStats();recalcStats();let a=performance.now();hit();t1.push(performance.now()-a);
        const id=TALENTS[k].id;S.talents[id]=Math.max(0,(S.talents[id]|0)-1);computeStats();a=performance.now();hit();t2.push(performance.now()-a);
        a=performance.now();for(const sk of eq)skParts(sk,false);t3.push(performance.now()-a);}
      out[c]={lvlUp:Math.round(Math.max(...t1)),talent:Math.round(Math.max(...t2)),warm:+Math.max(...t3).toFixed(1)};}return out;})()`);log(tag,JSON.stringify(res[tag]));};
  await meas('ПК');const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await meas('×4');await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
  if(process.env.OUT)require('fs').writeFileSync(process.env.OUT,JSON.stringify(res,null,1));return 1;};
