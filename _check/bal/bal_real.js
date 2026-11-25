// задача для fx.js: «реальный бой» как D:/games/_sc_check/balance.js — обычная выдача (авто с 1-го уровня до L),
// потом 30 с боя волнами по 10 врагов уровня L (здоровье ×6); убийства и урон. Каждый прогон — своё зерно (класс × зерно), порядок классов не влияет.
// env: CL, LV (через запятую), SEEDS (JSON, [1..6]), TAL ("none,auto": без талантов / «Авто» талантов как кнопка), OUT.
const {START,FREEZE}=require(require('path').join(__dirname,'lib.js'));
module.exports=async({ev,page,log})=>{const CL=(process.env.CL||'pyro,cryo,storm,plague,necro,paladin,geo,windr,hemo,arcan,bers,dk,druid,hunter,assassin,shaman,monk,lock,inq,alch').split(','),
  LV=(process.env.LV||'160').split(',').map(Number),SEEDS=JSON.parse(process.env.SEEDS||'[1,2,3,4,5,6]'),TM=(process.env.TAL||'none,auto').split(','),out={};
  const waitF=async(expr,ms)=>{const t=Date.now();while(Date.now()-t<(ms||20000)){try{if(await ev(expr))return true;}catch(e){}await new Promise(r=>setTimeout(r,100));}return false;};
  for(const L of LV)for(const tm of TM)for(const cid of CL){const rs=[];
    for(const sd of SEEDS){
      await ev(`(()=>{let s=${sd*7919+CL.indexOf(cid)*0+cid.split('').reduce((a,c)=>a*31+c.charCodeAt(0)&0xffff,7)};Math.random=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};return 1;})()`);
      await ev(START(cid,0,true));await waitF("mode==='game'",15000);await ev(FREEZE(0));
      const r=await ev(`(()=>{S.autoLu=true;S.autoBest=true;while(S.lvl<${L}){gainXp(xpNeed(S.lvl)-S.xp+1);luAutoRun(luQueue);}
        ${tm==='auto'?'S.talents={};autoTalents(S.lvl+2);computeStats();recalcStats();':''}
        P.maxHp=P.hp=1e8;P.mp=P.maxMp;S.auto=true;clearWorld();P.pos.set(0,0,0);P.prev.copy(P.pos);cfReset();
        let dmg=0;const d0=dealDamage;dealDamage=function(en,b,el,o){const h=en.hp;const x=d0.apply(this,arguments);dmg+=Math.max(0,h-Math.max(0,en.hp));return x;};
        const mobs=Object.keys(MOBS).filter(k=>!MOBS[k].boss&&!MOBS[k].as);const wave=()=>{for(let i=0;i<10;i++){const a=i/10*TAU;const en=spawnEnemy(mobs[i%3],P.pos.x+Math.cos(a)*(6+i%3*2),P.pos.z+Math.sin(a)*(6+i%3*2),${L});if(en){en.aggro=true;en.maxHp*=6;en.hp=en.maxHp;}}};
        const k0=S.kills;let fr=0,n=0;for(let t=0;t<10;t++){wave();for(let q=0;q<6;q++){__step(.5);n++;if(CLS.id==='bers'&&time<CT.frenzyT)fr++;}P.hp=P.maxHp;}dealDamage=d0;
        const tal=(CT_TAL[CLS.id]||[]).map(t=>S.talents[t.id]|0).join('');
        return {kills:S.kills-k0,dmg:Math.round(dmg),tal,fr:+(fr/n).toFixed(2)};})()`);
      rs.push(r);await ev(`S.auto=false;spawnPack=__sp0;spawnBoss=__sb0;toSelect();true`);await waitF("mode==='select'",10000);}
    const av=k=>+(rs.reduce((s,x)=>s+x[k],0)/rs.length).toFixed(k==='fr'?2:0);
    const o={kills:av('kills'),dmg:av('dmg'),fr:av('fr'),tal:rs[0].tal,each:rs.map(x=>x.kills)};((out[L]||(out[L]={}))[tm]||(out[L][tm]={}))[cid]=o;log(L,tm,cid,JSON.stringify(o));}
  if(process.env.OUT)require('fs').writeFileSync(process.env.OUT,JSON.stringify(out,null,1));return 1;};
