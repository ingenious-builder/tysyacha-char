// Стенд реального урона чары С ТАЛАНТАМИ и особенностью класса (по образцу _check/sim_page.js): множитель редкости включён,
// таланты — o.tal, частота кастов — как у героя (skCycle с талантами: перезарядка и мана), крит выключен, резонанса нет,
// надбавка слотов выключена (общий множитель), ранг 1. Возвращает урон в секунду и показанную силу той же чары в том же состоянии.
(function(){
if(window.__simt)return;
const SIM={},SC={flowN:6,flowFrom:7,flowLife:6,flowV:2,flowArc:100,oneD:2.2,brandRate:2.5,castRate:1,hitRate:1,killRate:.5,trailR:2,trailV:4};
let DUM=[],rnd=null;const ORIG={gainXp,dropLoot};
function wipe(){clearWorld();while(ORBS.length){const o=ORBS.pop();scene.remove(o.g);}
  PASS={aura:[],brand:[],doom:[],revenge:[],orbit:[],trail:[],surge:[]};auraT.clear();revCd.clear();trailT.clear();
  for(const a of NFS.pa||[])nfPassDrop(a);NFS.pa=[];NFS.pn=[];for(const s of SUMMONS.slice())killSummon(s,true);
  BLEEDS.length=0;P.casts=0;P.moving=false;P.dashT=0;P.invulnT=0;P.shield=0;P.shieldSk=null;P.face=0;target=null;for(const k in P.cds)delete P.cds[k];DUM=[];}
function dummy(x,z){const en=spawnEnemy('goblin',x,z,S.lvl,{});en.maxHp=en.hp=1e12;en.stun=1e9;en.aggro=false;en.anc={x,z};DUM.push(en);return en;}
function clearSt(en){en.burnT=0;en.burnDps=0;en.poisT=0;en.poisN=0;en.poisDps=0;en.shredT=0;en.marks={};en.chill=0;en.chillT=0;en.blindT=0;en.frozenT=0;en.orbHit={};if(en.bleed){en.bleed.t=0;}en.ctHeat=0;}
function flowNew(en,i,age){en.fa=(rnd()*2-1)*SC.flowArc*Math.PI/180;en.stop=i%3===2?4.5+rnd()*1.5:1+rnd();en.age=age||0;en.fd=Math.max(en.stop,SC.flowFrom-SC.flowV*en.age);en.fi=i;flowPos(en);}
function flowPos(en){en.anc.x=Math.sin(en.fa)*en.fd;en.anc.z=Math.cos(en.fa)*en.fd;}
function flowSetup(){for(let i=0;i<SC.flowN;i++){const en=dummy(0,SC.flowFrom);flowNew(en,i,SC.flowLife*(i+rnd()*.5)/SC.flowN);}}
function flowStep(dt){for(const en of DUM){if(en.dead||en.fi==null)continue;en.age+=dt;if(en.age>=SC.flowLife){clearSt(en);flowNew(en,en.fi,en.age-SC.flowLife);}else{en.fd=Math.max(en.stop,en.fd-SC.flowV*dt);flowPos(en);}}}
function pin(){for(const en of DUM){if(en.dead)continue;en.pos.set(en.anc.x,0,en.anc.z);en.kb.set(0,0,0);en.stun=1e9;}}
function dmgSum(){let s=0;for(const en of DUM)s+=en.maxHp-en.hp;return s;}
function stepWorld(dt){time+=dt;procBudget=40;pBudget=500;FDT=dt;FRK=dt>.0143?1:dt*60;spawnT=1e9;threat=0;
  P.invulnT-=dt;if(P.shield>0){P.shieldT-=dt;if(P.shieldT<=0)shieldBurst();}if(P.dashT>0){P.dashT-=dt;P.pos.addScaledVector(P.dashV,dt);}
  for(const k in P.cds)P.cds[k]-=dt;P.castT-=dt;P.swingT-=dt;P.hp=P.maxHp;P.mp=P.maxMp;NFS.sa=activeSlots();NFS.sp=passiveSlots();NFS.lv=S.lvl;
  updateLater(dt);updateEnemies(dt);updatePassives(dt);updateProj(dt);updateMeteors(dt);updateSummons(dt);updateWhirls(dt);updateRains(dt);updateTraps(dt);updateZones(dt);updateFx(dt);
  if(CT_ON){try{cfTick(dt);}catch(e){}}}
SIM.run=function(o){const sk=SKILLS[o.id],scen=o.scen,warm=4,dt=1/30,keepCls=CLS;let T=o.T||24;
  const R0=Math.random;rnd=mpRng(o.seed||12345);Math.random=mpRng((o.seed||12345)*7+1);
  CLS=CLASS_BY[o.cls];gainXp=()=>{};dropLoot=()=>{};const keepL=S.lvl,keepT=S.talents,keepR=S.ranks,keepCT=CT_ON,keepSB=SB_OFF,keepRe=RESO.slice();
  S.lvl=o.lvl;S.ranks={};S.talents=Object.assign({},o.tal||{});CT_ON=o.ct?1:0;SB_OFF=true;RESO.fill(1);computeStats();recalcStats();cfReset();PWC=new Map();
  const keepCrit=ST.crit;ST.crit=0;let res=null;
  try{wipe();time=0;P.pos.set(0,0,0);P.prev.set(0,0,0);if(scen==='one')dummy(0,SC.oneD);else flowSetup();pin();
    const act=sk.active,f=sk.F.id;let nextCast=0,lastCast=-9,d0=null,drvN=0;
    const hk=(!act&&NFP[f])||{},DH=f==='brand'||!!hk.hit,DC=f==='surge'||!!hk.cast,DU=f==='revenge'||!!hk.dmgIn,DK=f==='doom'||!!hk.kill;
    const CSK=SKILLS[sid(sk.E.id,'blink','swift')];let tH=0,tC=0,tU=0,tK=0;const shown=skParts(sk,false),cyc=act?skCycle(sk,false):0,q=typeof talQ==='function'?talQ(sk):1;
    // окно — целое число циклов от каста в установившемся бою (иначе у долгих перезарядок 3 или 4 каста в окне дают ±30%)
    let w0=warm;if(act){const k=Math.max(2,Math.ceil(16/cyc));w0=Math.ceil(warm/cyc-1e-9)*cyc;T=w0+k*cyc;}
    if(!act){S.passive=[sk.id].concat(Array(41).fill(null));rebuildPassives();}
    for(let t=0;t<T;t+=dt){if(t>=w0-1e-9&&d0===null)d0=dmgSum()-drvN;
      if(act&&t>=nextCast){P.cds[sk.id]=0;P.mp=P.maxMp;const tg=getTarget(30);if(tg)faceTo(tg.pos);
        const man=f==='blink'||f==='chain'||f==='barrier'&&P.shield<=0;if(canCast(sk,man)==='ok'){cast(sk);lastCast=t;nextCast=t+cyc;}}
      if(!act){tH-=dt;tC-=dt;tU-=dt;tK-=dt;
        if(DH&&tH<=0){tH+=1/SC.brandRate;const tg=nearest(P.pos,30);if(tg){dealDamage(tg,1,f==='brand'?-1:sk.e,{depth:0,noReact:true,noKnock:true});drvN++;}}
        if(DC&&tC<=0){tC+=1/SC.castRate;castProcs();nfOnCast(CSK,null);}
        if(DU&&tU<=0){tU+=1/SC.hitRate;P.invulnT=0;hurtPlayer(1,null,{});}
        if(DK&&tK<=0&&t>.5){tK+=1/SC.killRate;let b=null,bd=1e9;for(const en of DUM){if(en.dead)continue;const d=Math.hypot(en.pos.x,en.pos.z);if(d<bd){bd=d;b=en;}}
          if(b){const fi=b.fi;b.fi=null;kill(b,0,f==='doom'?-1:sk.e);const n=dummy(0,SC.flowFrom);flowNew(n,fi,0);}}
        if(f==='trail'){const a=t*SC.trailV/SC.trailR;P.pos.set(Math.cos(a)*SC.trailR,0,Math.sin(a)*SC.trailR);P.moving=true;}}
      stepWorld(dt);if(scen!=='one')flowStep(dt);pin();
      if(act&&P.dashT<=0&&t-lastCast>.3){P.pos.set(0,0,0);P.prev.set(0,0,0);if(hero)hero.g.position.set(0,0,0);}}
    res={id:o.id,scen,cls:CLS.id,t:o.t,dps:(dmgSum()-drvN-(d0||0))/(T-w0),shown:shown.pw,sdps:shown.dps,q,cyc};
  }finally{ST.crit=keepCrit;wipe();S.passive=Array(42).fill(null);rebuildPassives();S.lvl=keepL;S.talents=keepT;S.ranks=keepR;CT_ON=keepCT;SB_OFF=keepSB;for(let i=0;i<10;i++)RESO[i]=keepRe[i];
    CLS=keepCls;computeStats();recalcStats();PWC=new Map();gainXp=ORIG.gainXp;dropLoot=ORIG.dropLoot;Math.random=R0;}
  return res;};
SIM.batch=function(list){const out=[];for(const o of list){try{out.push(SIM.run(o));}catch(e){out.push({id:o.id,cls:o.cls,t:o.t,err:String(e.message).slice(0,120)});}}return out;};
window.__simt=SIM;})();
'ok';
