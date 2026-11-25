// Код стенда для замера РЕАЛЬНОГО урона чар. Выполняется внутри игры через window.__ev (?debug):
// видит внутренние функции игры (cast, dealDamage, updateProj…) и гоняет бой с фиксированным шагом,
// без отрисовки (цикл игры заморожен bookOpen=true). Враги — манекены с огромным здоровьем.
// Сценарии (одни и те же для всех чар):
//   one   — один враг стоит в 2,2 м перед героем (босс рядом);
//   flow  — поток толпы: 6 врагов, каждый живёт 6 с: идёт к герою из 7 м со скоростью 2 м/с до своей точки
//           (4 ближника — 1–2 м, 2 стрелка — 4,5–6 м), стоит там, потом «умирает» и приходит новый
//           (статусы сбрасываются), направления — в передней полуплоскости ±100°;
//   для пассивок — flow плюс «повод»: brand — 2,5 чужих попадания/с, surge — 1 каст/с, revenge — удар по герою 1/с,
//           doom — убийство 0,5/с (ближайший к герою), trail — герой бегает по кругу r=2 м со скоростью 4 м/с.
// Множитель редкости выключен (o.withK — включить), крит выключен, резонанса нет, уровень 1, ранг 1, без талантов. Мана — по формуле игры: каст раз в skCycle(sk,true).
// Касты — по правилам автобоя (canCast), скачок и цепь — как ручное нажатие, щит — когда прошлый щит кончился.
// Враги стоят на своих точках (отбрасывание и притяжение не двигают их) — контроль идёт в «пользу», не в урон.
(function(){
if(window.__sim)return;
const SIM={};
const SC={flowN:6,flowFrom:7,flowLife:6,flowV:2,flowArc:100,oneD:2.2,brandRate:2.5,castRate:1,hitRate:1,killRate:.5,trailR:2,trailV:4};
SIM.SC=SC;
let DUM=[],rnd=null,simT=0;
const ORIG={gainXp,dropLoot};
function rngOf(seed){return mpRng(seed);}
function wipe(){
  clearWorld();while(ORBS.length){const o=ORBS.pop();scene.remove(o.g);}
  PASS={aura:[],brand:[],doom:[],revenge:[],orbit:[],trail:[],surge:[]};auraT.clear();revCd.clear();trailT.clear();
  BLEEDS.length=0;P.casts=0;P.moving=false;P.dashT=0;P.invulnT=0;P.shield=0;P.shieldSk=null;P.face=0;target=null;
  for(const k in P.cds)delete P.cds[k];DUM=[];}
function dummy(x,z){const en=spawnEnemy('goblin',x,z,1,{});en.maxHp=en.hp=1e9;en.stun=1e9;en.aggro=false;en.anc={x,z};DUM.push(en);return en;}
function clearSt(en){en.burnT=0;en.burnDps=0;en.poisT=0;en.poisN=0;en.poisDps=0;en.shredT=0;en.marks={};en.chill=0;en.chillT=0;en.blindT=0;en.frozenT=0;en.orbHit={};if(en.bleed){en.bleed.t=0;}}
// поток: у каждого врага свой угол и фаза; при «смерти» — новый угол
function flowNew(en,i,age){en.fa=(rnd()*2-1)*SC.flowArc*Math.PI/180;en.stop=i%3===2?4.5+rnd()*1.5:1+rnd();en.age=age||0;en.fd=Math.max(en.stop,SC.flowFrom-SC.flowV*en.age);en.fi=i;flowPos(en);}
function flowSetup(){const N=SC.flowN;for(let i=0;i<N;i++){const en=dummy(0,SC.flowFrom);flowNew(en,i,SC.flowLife*(i+rnd()*.5)/N);}}
function flowPos(en){en.anc.x=Math.sin(en.fa)*en.fd;en.anc.z=Math.cos(en.fa)*en.fd;}
function flowStep(dt){for(const en of DUM){if(en.dead||en.fi==null)continue;en.age+=dt;
    if(en.age>=SC.flowLife){clearSt(en);flowNew(en,en.fi,en.age-SC.flowLife);}else{en.fd=Math.max(en.stop,en.fd-SC.flowV*dt);flowPos(en);}}}
function pin(){for(const en of DUM){if(en.dead)continue;en.pos.set(en.anc.x,0,en.anc.z);en.kb.set(0,0,0);en.stun=1e9;}}
function dmgSum(){let s=0;for(const en of DUM)s+=en.maxHp-en.hp;return s;}
function stepWorld(dt){
  time+=dt;procBudget=40;pBudget=500;FDT=dt;FRK=dt>.0143?1:dt*60;spawnT=1e9;threat=0;
  P.invulnT-=dt;if(P.shield>0){P.shieldT-=dt;if(P.shieldT<=0)shieldBurst();}
  if(P.dashT>0){P.dashT-=dt;P.pos.addScaledVector(P.dashV,dt);}
  for(const k in P.cds)P.cds[k]-=dt;P.castT-=dt;P.swingT-=dt;P.hp=P.maxHp;P.mp=P.maxMp;
  updateLater(dt);updateEnemies(dt);updatePassives(dt);updateProj(dt);updateMeteors(dt);updateSummons(dt);updateWhirls(dt);updateRains(dt);updateTraps(dt);updateZones(dt);updateFx(dt);}
// один прогон: id чары, сценарий, класс (для призывов и маны), длительность
SIM.run=function(o){
  const sk=SKILLS[o.id],scen=o.scen,T=o.T||24,warm=o.warm||4,dt=1/30,keepCls=CLS;
  const R0=Math.random;rnd=rngOf(o.seed||12345);Math.random=rngOf((o.seed||12345)*7+1);
  if(o.cls)CLS=CLASS_BY[o.cls];
  gainXp=()=>{};dropLoot=()=>{};
  const keepK=rarK,keepL=S.lvl;if(!o.withK)rarK=()=>1;if(o.lvl)S.lvl=o.lvl;   // o.lvl — уровень героя (урон крупнее, меньше округлений)   // по умолчанию — без множителя редкости: меряем саму механику
  const keepCrit=ST.crit;ST.crit=0;const keepR=RESO.slice();RESO.fill(1);
  let res=null;
  try{
    wipe();time=0;P.pos.set(0,0,0);P.prev.set(0,0,0);
    if(scen==='one')dummy(0,SC.oneD);else flowSetup();
    pin();
    const act=sk.active,f=sk.F.id;let nextCast=0,lastCast=-9,drvT=0,drvN=0,d0=null;
    const cyc=act?skCycle(sk,true):0;
    if(!act){S.passive=[sk.id].concat(Array(41).fill(null));rebuildPassives();}
    for(simT=0;simT<T;simT+=dt){
      if(simT>=warm&&d0===null)d0=dmgSum()-drvN;
      if(act&&simT>=nextCast){P.cds[sk.id]=0;P.mp=P.maxMp;const tg=getTarget(30);if(tg)faceTo(tg.pos);
        const man=f==='blink'||f==='chain'||f==='barrier'&&P.shield<=0;if(canCast(sk,man)==='ok'){cast(sk);lastCast=simT;nextCast=simT+cyc;}}
      if(!act){drvT-=dt;
        if(f==='brand'&&drvT<=0){drvT+=1/SC.brandRate;const tg=nearest(P.pos,30);if(tg){dealDamage(tg,1,-1,{depth:0,noReact:true,noKnock:true});drvN++;}}
        if(f==='surge'&&drvT<=0){drvT+=1/SC.castRate;castProcs();}
        if(f==='revenge'&&drvT<=0){drvT+=1/SC.hitRate;P.invulnT=0;hurtPlayer(1,null,{});}
        if(f==='doom'&&drvT<=0&&simT>.5){drvT+=1/SC.killRate;let b=null,bd=1e9;for(const en of DUM){if(en.dead)continue;const d=Math.hypot(en.pos.x,en.pos.z);if(d<bd){bd=d;b=en;}}
          if(b){const fi=b.fi;b.fi=null;kill(b,0,-1);const n=dummy(0,SC.flowFrom);flowNew(n,fi,0);}}
        if(f==='trail'){const a=simT*SC.trailV/SC.trailR;P.pos.set(Math.cos(a)*SC.trailR,0,Math.sin(a)*SC.trailR);P.moving=true;}}
      stepWorld(dt);
      if(scen!=='one')flowStep(dt);
      pin();
      if(act&&P.dashT<=0&&simT-lastCast>.3){P.pos.set(0,0,0);P.prev.set(0,0,0);if(hero)hero.g.position.set(0,0,0);}
    }
    const tot=dmgSum()-drvN-(d0||0);
    res={id:o.id,scen,cls:CLS.id,dps:tot/(T-warm),cyc,casts:P.casts,tag:o.tag||undefined};
  }finally{
    rarK=keepK;S.lvl=keepL;gainXp=ORIG.gainXp;dropLoot=ORIG.dropLoot;ST.crit=keepCrit;for(let i=0;i<10;i++)RESO[i]=keepR[i];
    wipe();CLS=keepCls;Math.random=R0;
    S.passive=Array(42).fill(null);rebuildPassives();
  }
  return res;};
// оценка игры для той же чары (часть «урон», без пользы) — для сравнения
SIM.est=function(id,cls){const keep=CLS;if(cls)CLS=CLASS_BY[cls];try{return skParts(SKILLS[id],true).dps;}finally{CLS=keep;}};
SIM.batch=function(list){const out=[];for(const o of list)out.push(SIM.run(o));return out;};
window.__sim=SIM;
})();
