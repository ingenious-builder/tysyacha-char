// Независимый стенд проверяющего: бой «толпа, которая умирает» (в отличие от стенда разработчика — враги гибнут и заменяются,
// поэтому видны таланты «при убийстве»: заражение, скелеты, святой взрыв, бесы, тень, порча). Фиксированный шаг без отрисовки.
(function(){
if(window.__rst)return 'есть';   // копия r_stand.js: таймеры особенности (CT) — от time=0, хвост later() прошлого прогона убран
let DUM=[],rnd=null,HP=1e9,N=7;const PROC={};
const ORIG={gainXp,dropLoot,ctProc};
function wipe(){clearWorld();for(const s of SUMMONS.slice())killSummon(s,true);for(const a of NFS.pa||[])nfPassDrop(a);NFS.pa=[];NFS.pn=[];
  P.casts=0;P.moving=false;P.dashT=0;P.invulnT=0;P.shield=0;P.shieldSk=null;P.face=0;target=null;for(const k in P.cds)delete P.cds[k];DUM=[];}
function spawn1(){const a=rnd()*Math.PI*2,d=2+rnd()*5,x=Math.sin(a)*d,z=Math.cos(a)*d;const en=spawnEnemy('goblin',x,z,S.lvl,{});
  en.maxHp=en.hp=HP;en.stun=0;en.spd=0;en.aggro=false;en.anc={x,z};DUM.push(en);return en;}
function pin(){for(const en of DUM){if(en.dead)continue;en.pos.set(en.anc.x,0,en.anc.z);en.kb.set(0,0,0);en.atkCd=99;en.skillCd=99;}}
function dmg(){let s=0;for(const en of DUM)s+=en.maxHp-Math.max(0,en.hp);return s;}
function hurtTick(dt,st){st.h-=dt;if(st.h<=0){st.h+=.8;P.invulnT=0;hurtPlayer(P.maxHp*.06/Math.max(.2,ST.armor),null,{});if(P.hp<P.maxHp*.4&&!P.dead)P.hp=P.maxHp*.4;}}
function step(dt){time+=dt;procBudget=40;pBudget=500;FDT=dt;FRK=dt>.0143?1:dt*60;spawnT=1e9;threat=0;
  P.invulnT-=dt;if(P.shield>0){P.shieldT-=dt;if(P.shieldT<=0)shieldBurst();}
  if(P.dashT>0){P.dashT-=dt;P.pos.addScaledVector(P.dashV,dt);}
  for(const k in P.cds)P.cds[k]-=dt;P.castT-=dt;P.swingT-=dt;P.atkCd-=dt;P.mp=Math.min(P.maxMp,P.mp+P.mpRegen*dt);P.hp=Math.min(P.maxHp,P.hp+P.hpRegen*dt);
  NFS.sa=activeSlots();NFS.sp=passiveSlots();NFS.lv=S.lvl;
  updateLater(dt);updateEnemies(dt);updatePassives(dt);updateProj(dt);updateMeteors(dt);updateSummons(dt);updateWhirls(dt);updateRains(dt);updateTraps(dt);updateZones(dt);updateFx(dt);
  cfTick(dt);nfTick(dt);}
const R={};
R.build=function(cls,L,seed){selectClass(cls);startGame();const R0=Math.random;Math.random=mpRng(seed||777);try{clearWorld();runFresh(L);}finally{Math.random=R0;}
  S.talents={};computeStats();recalcStats();EQUIPPED=new Set(equippedIds());rebuildPassives();
  return {a:S.active.slice(),p:S.passive.slice(),ranks:JSON.parse(JSON.stringify(S.ranks)),learned:S.learned.slice(),lvl:S.lvl};};
// o: {b, tal, seed, T, hp (null = бессмертные), n}
R.run=function(o){const dt=1/30,T=o.T||16,warm=2,B=o.b;HP=o.hp||1e9;N=o.n||7;for(const k in PROC)delete PROC[k];
  const R0=Math.random;rnd=mpRng(o.seed||12345);Math.random=mpRng((o.seed||12345)*7+1);gainXp=()=>{};dropLoot=()=>{};
  ctProc=function(p,txt,c,r){const k=String(txt).replace(/[\s×+\-−]*[\d.,]+.*$/,'').trim();PROC[k]=(PROC[k]||0)+1;return ORIG.ctProc.apply(this,arguments);};
  const keepCrit=ST.crit;let res=null;
  try{S.lvl=B.lvl;S.active=B.a.slice();S.passive=B.p.slice();S.ranks=JSON.parse(JSON.stringify(B.ranks));S.learned=B.learned.slice();LEARNED=new Set(S.learned);
    S.talents=Object.assign({},o.tal||{});computeStats();recalcStats();EQUIPPED=new Set(equippedIds());PWC=new Map();WKC=null;
    wipe();time=0;cfReset();rebuildPassives();nfReset();LATER.length=0;P.pos.set(0,0,0);P.prev.set(0,0,0);P.hp=P.maxHp;P.mp=P.maxMp;P.atkCd=0;
    for(let i=0;i<N;i++)spawn1();pin();
    const n=activeSlots(),st={h:.4};let d0=null,k0=0,lastCast=-9,ms=0,steps=0,frz=0,shd=0,sumn=0,ser=0,fr=0,minHp=1;
    for(let t=0;t<T;t+=dt){if(t>=warm&&d0===null){d0=dmg();k0=DUM.filter(e=>e.dead).length;}
      const t0=performance.now();
      const tg=getTarget(30);if(tg)faceTo(tg.pos);
      for(let i=0;i<n;i++){const id=S.active[i];if(id==null)continue;const sk=SKILLS[id];if((P.cds[id]||0)>0)continue;if(canCast(sk,false)==='ok'){cast(sk);lastCast=t;break;}}
      if(P.atkCd<=0&&tg)basicAttack();
      hurtTick(dt,st);step(dt);
      let alive=0;for(const en of DUM)if(!en.dead)alive++;while(alive<N){spawn1();alive++;}
      pin();
      if(P.dashT<=0&&t-lastCast>.3){P.pos.set(0,0,0);P.prev.set(0,0,0);if(hero)hero.g.position.set(0,0,0);}
      ms+=performance.now()-t0;
      if(t>=warm){steps++;if(CLS.id==='bers'&&time<CT.frenzyT)fr++;if(CLS.id==='assassin'&&time<CT.shadowT)shd++;
        if(CLS.id==='monk')ser+=CT.series;sumn+=SUMMONS.filter(s=>!s.ghost&&!s.dying).length;
        for(const en of DUM)if(!en.dead&&en.frozenT>0){frz++;break;}minHp=Math.min(minHp,P.hp/P.maxHp);}}
    const tot=dmg()-(d0||0),kills=DUM.filter(e=>e.dead).length-k0;
    res={dps:Math.round(tot/(T-warm)),cast:P.casts,kpm:+(kills/(T-warm)*60).toFixed(1),casts:P.casts,msStep:+(ms/(T/dt)).toFixed(2),
      frenzy:+(fr/steps).toFixed(2),shadow:+(shd/steps).toFixed(2),series:+(ser/steps).toFixed(1),summ:+(sumn/steps).toFixed(1),minHp:+minHp.toFixed(2),proc:Object.assign({},PROC)};
  }finally{ST.crit=keepCrit;gainXp=ORIG.gainXp;dropLoot=ORIG.dropLoot;ctProc=ORIG.ctProc;wipe();Math.random=R0;}
  return res;};
window.__rst=R;
})();
'ok';
