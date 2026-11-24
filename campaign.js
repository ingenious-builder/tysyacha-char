// «Тысяча чар» — кооперативная кампания на двоих (8 уровней) и крючки для комнаты.
// Файл подключается обычным <script src> ДО основного скрипта. Основной скрипт после сборки вызывает
// window.TCCF(X), передавая нужные функции и доступ к состоянию, и получает объект TCC.
// Сеть: один лёгкий тип сообщения {t:'camp',k:...}; снимки врагов и героев не затрагиваются.
(function(){
'use strict';
window.TCCF=function(X){
const THREE=X.THREE,clamp=X.clamp,rand=X.rand,TAU=X.TAU;
const $=s=>document.querySelector(s);
const TEST=/[?&]test=1/.test(location.search);   // только для проверок: быстрые таймеры и хлипкие враги
const HPM=TEST?.04:1,TT=TEST?.12:1,SPD=TEST?3:1;
const MPm=X.MP;
const r2=x=>Math.round(x*100)/100;
const lerpN=(a,b,t)=>a+(b-a)*t;
const RANGEDAI=new Set(['ranged','caster','sniper','blinker','necro','spitter','icer','imp','shroom']);

// ---------------------------------------------------------------- уровни
const LV=[
 {k:1,key:'breach',name:'Прорыв',th:1,L:170,lv:2,n:4,par:170,goal:'Пройди через 3 засады до выхода'},
 {k:2,key:'altar',name:'Алтарь',th:2,L:150,lv:4,n:4,par:150,goal:'Удержи алтарь 90 секунд'},
 {k:3,key:'crystal',name:'Кристалл',th:4,L:200,lv:6,n:4,par:175,goal:'Проводи кристалл до цели'},
 {k:4,key:'plates',name:'Две плиты',th:3,L:190,lv:8,n:4,par:210,goal:'Откройте ворота и сойдитесь'},
 {k:5,key:'guard',name:'Страж',th:9,L:150,lv:10,n:4,par:180,goal:'Победите стража'},
 {k:6,key:'escape',name:'Побег',th:11,L:230,lv:12,n:4,par:130,goal:'Бегите к порталу от стены тьмы'},
 {k:7,key:'hunt',name:'Охота',th:8,L:150,lv:14,n:4,par:140,goal:'Убей 6 элитных врагов за 120 с'},
 {k:8,key:'final',name:'Финал',th:12,L:170,lv:17,n:5,par:240,goal:'Победите хранителя сердца'},
];

let CS=null;       // общее состояние цели (хост пишет, гость получает)
let H=null;        // служебное состояние хоста
let R=null;        // визуальные объекты
let peerProg=null; // прогресс хоста, который видит гость
let sendT=0,uiKey='';

function newCS(k){return {k,el:0,ph:0,c:0,cn:0,tm:-1,ek:'',ex:0,ez:0,eh:0,em:0,gt:[],sg:0,pl:null,po:[-1,-1],pp:0,wz:-99,sh:0,shc:0,shn:3,cr:null,dn:0,done:0,fail:0,win:0};}

// ---------------------------------------------------------------- прогресс (в сохранении хоста, поле SAVE.camp)
function cleanSave(c){const o={v:1,d:{}};if(c&&typeof c==='object'&&c.d&&typeof c.d==='object'){for(let k=1;k<=8;k++){const e=c.d[k];if(e&&typeof e==='object'){o.d[k]={s:clamp(e.s|0,1,3),t:Math.max(0,e.t|0)};}}}return o;}
function ownProg(){const S0=X.SAVE;if(!S0.camp||!S0.camp.d)S0.camp=cleanSave(S0.camp);return S0.camp;}
function progD(){return MPm.role==='guest'?(peerProg||{}):ownProg().d;}
function unlocked(k){if(k<=1)return true;if(X.S&&X.S.sandbox&&MPm.role!=='guest')return true;return !!progD()[k-1];}
function progList(){const d=progD(),a=[];for(let k=1;k<=8;k++)a.push(d[k]?d[k].s:0);return a;}
function sendProg(){if(MPm.role==='host')X.mpSend({t:'camp',k:'prog',d:progList()});}
function stars(n){return '★'.repeat(n)+'☆'.repeat(3-n);}
function fmtT(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}

// ---------------------------------------------------------------- вспомогательное
const Zf=()=>X.GZ;
function lpos(off,z){return X.toWorld(X.gcx(z)+off,z);}
function heroes(){const a=[];if(!X.P.dead)a.push({id:0,p:X.P.pos});const pr=MPm.peer;if(pr&&pr.on&&!pr.dead&&pr.hero)a.push({id:1,p:pr.pos});return a;}
function hLocal(h){return X.toLocal(h.p.x,h.p.z);}
function leadZ(){let z=-9;for(const h of heroes())z=Math.max(z,hLocal(h).z);return z;}
function bn(b,s,red){X.banner(b,s,!!red);if(X.MPH)X.mpSend({t:'bn',b,s,r:red?1:0});}
function hn(text,sec){X.hint(text,sec);if(X.MPH)X.mpSend({t:'camp',k:'hn',x:text,s:sec});}
function sendNow(){if(!X.MPH||!CS)return;X.mpSend({t:'camp',k:'st',s:CS});sendT=.2;}
function pickPool(kind){const Z=Zf();return X.pickW(Z.th.m[kind]||Z.th.m.norm);}
function spawnAt(tid,off,lz,o){const Z=Zf();lz=clamp(lz,2,Z.z1-1.2);const w=lpos(off,lz);
  return X.spawnMob(tid,w.x,w.z,Z.lv+(Math.random()<.25?1:0),Object.assign({gorge:true,aggro:true,noPack:true,hpMul:HPM},o));}
function killLeft(filter){for(const en of X.ENEMIES){if(!en.dead&&!en.boss&&(!filter||filter(en)))X.kill(en,0,-1,{noReward:true});}}
function alive(list){return !!(list&&list.some(e=>!e.dead));}
function mkEnc(Z,i,z,kind,elite){Z.enc.push({z,i,done:false,elite:!!elite,kind:kind.split('+')[0],next:kind.split('+')[1]||null,units:[],second:false});Z.arenas.push({z:z+4,len:9,w:Z.th.aw});}
function encCleared(e){return e.done&&(!e.next||e.second)&&e.units.length>0&&e.units.every(u=>u.dead);}
function barsTick(){const Z=Zf();for(let i=0;i<Z.enc.length;i++){if(!CS.gt[i]&&encCleared(Z.enc[i]))openBar(i,i<Z.enc.length-1?['Засада разбита','Проход открыт']:null);}}
function rearZ(){let z=1e9;for(const h of heroes())z=Math.min(z,hLocal(h).z);return z;}
function addBar(Z,z){Z.cb.push({z});return Z.cb.length-1;}
function applyBars(){const Z=Zf();if(!Z||!Z.cb||!CS)return;let z1=Z.L+1;for(let i=0;i<Z.cb.length;i++){if(!CS.gt[i]&&Z.cb[i].z-.7<z1)z1=Z.cb[i].z-.7;}Z.z1=z1;}
function openBar(i,text){if(CS.gt[i])return;CS.gt[i]=1;sendNow();if(text)bn(text[0],text[1]);}
function setDone(text){if(CS.done)return;CS.done=1;sendNow();bn(text[0],text[1]);if(X.MPH&&!MPm.chest)H.chestT=1.4;}
function nearPortal(p){const Z=Zf();return Math.hypot(p.x-Z.portal.w.x,p.z-Z.portal.w.z);}

// ---------------------------------------------------------------- цели врагов (алтарь, кристалл)
const GP={pos:new THREE.Vector3(),vel:new THREE.Vector3(),dead:false};
function goal(en){
  if(!CS||!en.cg||!CS.ek||CS.eh<=0)return null;
  let md=1e9;for(const h of heroes())md=Math.min(md,Math.hypot(h.p.x-en.pos.x,h.p.z-en.pos.z));
  if(md<6.5)return null;
  const w=lpos(CS.ex,CS.ez);GP.pos.set(w.x,0,w.z);return GP;}
function entDmg(dt){
  const e=lpos(CS.ex,CS.ez);let dps=0,n=0;
  for(const en of X.ENEMIES){if(en.dead||!en.cg)continue;const d=Math.hypot(en.pos.x-e.x,en.pos.z-e.z);
    if(d<(RANGEDAI.has(en.t.ai)?9:2.5+en.r)){dps+=en.dmg*.3;n++;}}
  dps=Math.min(dps,CS.em*.12);
  if(dps>0){CS.eh=Math.max(0,CS.eh-dps*dt);H.ft-=dt;if(H.ft<=0){H.ft=.7;X.float({x:e.x,y:2.8,z:e.z},'−'+Math.max(1,Math.round(dps*.7)),'#ff8a8a',15);X.colBurst(X.RED,e.x,1.2,e.z,6,3,.3,2);}}
  return n;}
function entRegen(dt,rate){const hs=heroes();if(hs.length<2)return;const e=lpos(CS.ex,CS.ez);
  if(hs.every(h=>Math.hypot(h.p.x-e.x,h.p.z-e.z)<9))CS.eh=Math.min(CS.em,CS.eh+CS.em*rate*dt);}
function wave(n,mix,lzFn,offR,extra){for(let i=0;i<n;i++){const kind=mix[i%mix.length];
  for(const en of spawnAt(pickPool(kind),rand(-offR,offR),lzFn(i),extra)){en.cg=true;}}}

// ---------------------------------------------------------------- боссы: общее
function bossSpawn(tid,hpm,sub){
  const Z=Zf(),lz=Z.bossZ+5,w=lpos(0,lz);
  const B=X.spawnEnemy(tid,w.x,w.z,Z.lv+1,{gorge:true,aggro:true,hpMul:hpm*HPM});B.skillCd=2.5;X.setBOSS(B);H.B=B;H.bsp=true;
  $('#bossName').textContent=B.t.name+' · ур. '+B.lv;X.banner(B.t.name,sub,true);X.shake(.6);X.fxPillar(w.x,w.z,2.5,10,X.RED,1);return B;}
function shieldOn(thr,kind){CS.sh=kind;CS.shc=0;H.lock=thr;H.shT=kind===2?40:60;H.lastCombo=MPm.combo|0;sendNow();}
function shieldOff(text){CS.sh=0;sendNow();const B=X.BOSS;if(B){B.shredT=5;B.stun=2.2;B.busy=0;}bn(text[0],text[1]);}
function addsAround(B,tids,n){const out=[];for(let i=0;i<n;i++){const a=rand(0,TAU),d=rand(4,8);
  const l=X.spawnMob(tids[i%tids.length],B.pos.x+Math.cos(a)*d,B.pos.z+Math.sin(a)*d,Zf().lv,{gorge:true,aggro:true,noPack:true,hpMul:HPM});
  for(const e of l)out.push(e);}return out;}
function holdShield(){const B=X.BOSS;if(CS.sh&&B&&!B.dead)B.hp=Math.max(B.hp,B.maxHp*H.lock);}

// ---------------------------------------------------------------- описание каждого уровня
const LVL={};

// 1. Прорыв: три засады
LVL[1]={
 shape(Z){mkEnc(Z,0,38,'norm');mkEnc(Z,1,82,'ambush');mkEnc(Z,2,126,'swarm+heavy',true);for(const e of Z.enc)addBar(Z,e.z+18);},
 begin(){CS.cn=3;},
 tick(dt){const Z=Zf();let c=0;
  for(let i=0;i<Z.enc.length;i++){if(encCleared(Z.enc[i])){c++;if(!CS.gt[i])openBar(i,i<2?['Засада разбита','Проход открыт']:null);}}
  if(c!==CS.c){CS.c=c;sendNow();}
  if(c>=3)setDone(['Путь свободен','Идите к порталу в конце ущелья']);},
 hud(){const n=CS.c;return {g:CS.done?'Идите к порталу':'Засады: '+n+' / 3',s:CS.done?'Войдите в портал вдвоём':'Пока засада жива, проход закрыт',f:CS.done?1:n/3};}
};

// 2. Алтарь: удержать 90 секунд
const ALT_Z=70,ALT_T=90;
LVL[2]={
 shape(Z){Z.arenas.push({z:ALT_Z,len:24,w:17});addBar(Z,ALT_Z+28);},
 begin(){CS.ek='altar';CS.ex=0;CS.ez=ALT_Z;CS.em=Math.round(700+Zf().lv*100);CS.eh=CS.em;H.wt=2;H.ft=0;},
 tick(dt){
  if(CS.ph===0){if(leadZ()>ALT_Z-20){CS.ph=1;CS.tm=ALT_T*TT;H.dur=ALT_T*TT;H.wt=1.5;sendNow();bn('Держите алтарь!','Волны идут с двух сторон. Не дайте им разрушить алтарь',true);}return;}
  if(CS.ph!==1)return;
  CS.tm-=dt;const prog=clamp(1-CS.tm/H.dur,0,1);
  H.wt-=dt;
  if(H.wt<=0&&CS.tm>3){H.wt=lerpN(9,5.5,prog)*(TEST?.5:1);const nn=Math.min(7,2+Math.floor(prog*4)+(Zf().lv>8?1:0));H.side=(H.side|0)+1;
   const front=H.side%3!==0,back=H.side%3!==1;
   const mix=prog<.35?['norm','norm','swarm']:prog<.7?['norm','ranged','swarm','heavy']:['heavy','ranged','swarm','norm'];
   if(front)wave(Math.ceil(nn*(back?.55:1)),mix,()=>ALT_Z+rand(24,27),5);
   if(back)wave(Math.ceil(nn*(front?.55:1)),mix,()=>ALT_Z-rand(24,28),5);
   if(prog>.7&&!H.elite){H.elite=1;for(const en of spawnAt(pickPool('heavy'),0,ALT_Z+25,{elite:true,hpMul:.5*HPM}))en.cg=true;}}
  entDmg(dt);entRegen(dt,.012);
  if(CS.eh<=0){fail('Алтарь разрушен. Враги дошли до него — держитесь рядом и бейте тех, кто идёт к алтарю.');return;}
  if(CS.tm<=0){CS.tm=0;CS.ph=2;killLeft(e=>e.cg);openBar(0);setDone(['Алтарь выстоял','Путь открыт — идите к порталу']);}},
 hud(){if(CS.ph===0)return {g:'Дойдите до алтаря',s:'Когда вы подойдёте, начнётся оборона',f:0};
  const hp=Math.round(100*CS.eh/Math.max(1,CS.em));
  if(CS.done)return {g:'Алтарь выстоял',s:'Идите к порталу вдвоём',f:1};
  return {g:'Держите алтарь: '+Math.ceil(Math.max(0,CS.tm))+' с',s:'Прочность алтаря '+hp+'%'+(CS.eh<CS.em*.3?' — срочно помогите!':''),f:CS.eh/Math.max(1,CS.em),b:CS.eh<CS.em*.3};}
};

// 3. Кристалл-караван
const CRY_START=8;
LVL[3]={
 shape(Z){for(const z of [60,110,160])Z.arenas.push({z,len:9,w:Z.th.aw});},
 begin(){const Z=Zf();CS.ek='crystal';CS.ex=0;CS.ez=CRY_START;CS.em=Math.round(750+Z.lv*90);CS.eh=CS.em;CS.ph=1;H.wt=6;H.ft=0;H.gz=Z.L-16;H.hintT=0;},
 tick(dt){
  if(CS.ph!==1)return;
  const e=lpos(CS.ex,CS.ez);let near=false;for(const h of heroes())if(Math.hypot(h.p.x-e.x,h.p.z-e.z)<14)near=true;
  let siege=false;for(const en of X.ENEMIES)if(!en.dead&&en.cg&&Math.hypot(en.pos.x-e.x,en.pos.z-e.z)<5.5){siege=true;break;}
  if(near){CS.ez=Math.min(H.gz,CS.ez+1.7*SPD*(siege?.35:1)*dt);}
  else{H.hintT-=dt;if(H.hintT<=0){H.hintT=6;hn('Кристалл ждёт: подойдите к нему ближе',3);}}
  const prog=clamp((CS.ez-CRY_START)/(H.gz-CRY_START),0,1);
  H.wt-=dt;
  if(H.wt<=0&&prog<.93){H.wt=lerpN(11,7.5,prog)/(TEST?2:1);const nn=Math.min(7,2+Math.floor(prog*4));H.side=(H.side|0)+1;const mix=prog<.4?['norm','swarm','ranged']:['norm','ranged','heavy','swarm'];
   wave(nn,mix,()=>CS.ez+rand(22,29),4);if(H.side%2===0)wave(Math.max(2,nn-2),['norm','swarm'],()=>CS.ez-rand(14,19),4);}
  entDmg(dt);entRegen(dt,.004);
  if(CS.eh<=0){fail('Кристалл разбит. Держитесь рядом с ним и не пускайте врагов к нему.');return;}
  if(CS.ez>=H.gz-.01){CS.ph=2;killLeft(e=>e.cg);setDone(['Кристалл доставлен','Идите к порталу']);}},
 hud(){if(CS.done)return {g:'Кристалл доставлен',s:'Идите к порталу вдвоём',f:1};
  const gz=(Zf()?Zf().L:200)-16,prog=clamp((CS.ez-CRY_START)/(gz-CRY_START),0,1);
  return {g:'Проводи кристалл: '+Math.round(prog*100)+'%',s:'Прочность кристалла '+Math.round(100*CS.eh/Math.max(1,CS.em))+'%',f:prog,b:CS.eh<CS.em*.3};}
};

// 4. Две плиты
const P4={p1:60,g1:70,w0:76,w1:128,p2:124,g2:132,e3:150,g3:166};
LVL[4]={
 shape(Z){const c=P4;mkEnc(Z,0,30,'norm');mkEnc(Z,1,c.e3,'swarm+heavy',true);Z.arenas.push({z:c.p1,len:8,w:10});Z.arenas.push({z:103,len:32,w:13});
  addBar(Z,c.g1);addBar(Z,c.g2);addBar(Z,c.g3);
  for(let z=c.w0;z<=c.w1;z+=2.2)Z.obs.push({x:X.gcx(z),z,r:1.35});},
 begin(){CS.sg=0;CS.cn=4;setPlates([[-3.2,P4.p1],[3.2,P4.p1]]);H.pk=[0,0];},
 tick(dt){const Z=Zf();
  if(CS.sg===0||CS.sg===2){const ok=platesTick(dt);
   if(ok){if(CS.sg===0){CS.sg=1;CS.c=1;setPlates(null);openBar(0,['Ворота открыты','Разойдитесь по коридорам — каждый в свой']);}
          else{CS.sg=3;CS.c=3;setPlates(null);openBar(1,['Ворота открыты','Сойдитесь: впереди мини-засада']);}}}
  else if(CS.sg===1){
   const l=leadZ(),hs=heroes();
   if(!H.pk[0]&&l>P4.w0+4){H.pk[0]=1;corridorPack(86);}
   if(!H.pk[1]&&l>P4.w0+22){H.pk[1]=1;corridorPack(106);}
   if(hs.length>=1&&hs.every(h=>hLocal(h).z>P4.p2-16)&&H.pk[1]&&!alive(H.cp)){CS.sg=2;CS.c=2;setPlates([[-5.2,P4.p2],[5.2,P4.p2]]);bn('Две плиты','Встаньте на плиты — по одному в каждом коридоре');}}
  else if(CS.sg===3){const e=Z.enc[1];
   if(encCleared(e)){CS.sg=4;CS.c=4;openBar(2);setDone(['Путь свободен','Идите к порталу вдвоём']);}}},
 hud(){const sg=Math.min(4,CS.sg|0);
  const t=['Встаньте на две плиты','Разойдитесь по коридорам','Встаньте на плиты в коридорах','Отбейте мини-засаду','Идите к порталу'][sg];
  const s=['По одному на каждую плиту — ворота откроются сами','Через стену не пройти: в каждом коридоре свои враги','Удерживайте обе плиты, пока ворота не откроются','Победите всех врагов — проход откроется','Войдите в портал вдвоём'][sg];
  const f=(sg===0||sg===2)&&CS.pp>0?CS.pp:sg/4;return {g:t+' ('+Math.min(4,sg+1)+'/4)',s,f};}
};
function corridorPack(z){H.cp=H.cp||[];for(const side of [-1,1]){const off=side*(X.ghw(z)*.5+.6);
  for(let i=0;i<3;i++){const tid=pickPool(i===0?'ranged':'norm');for(const en of spawnAt(tid,off+rand(-1.2,1.2),z+rand(-5,5)))H.cp.push(en);}}}
function setPlates(pl){CS.pl=pl;CS.pp=0;CS.po=[-1,-1];sendNow();}
function platesTick(dt){
  const hs=heroes();let o=[-1,-1];
  for(let i=0;i<2;i++){const pp=CS.pl[i],w=lpos(pp[0],pp[1]);for(const h of hs){if(Math.hypot(h.p.x-w.x,h.p.z-w.z)<2){o[i]=h.id;break;}}}
  CS.po=o;const ok=o[0]>=0&&o[1]>=0&&o[0]!==o[1];
  if(ok)CS.pp=Math.min(1,CS.pp+dt/2.2);else CS.pp=Math.max(0,CS.pp-dt/1.6);
  if(hs.length<2){H.pnT=(H.pnT||0)-dt;if(H.pnT<=0){H.pnT=9;hn('Для плит нужны двое. Напарник вернётся — подождите.',4);}}
  return CS.pp>=1;}

// 5. Страж: мини-босс с тремя фазами
LVL[5]={
 shape(Z){mkEnc(Z,0,30,'norm');mkEnc(Z,1,62,'ranged');for(const e of Z.enc)addBar(Z,e.z+18);Z.arenas.push({z:Z.bossZ+4,len:22,w:16});},
 begin(){CS.ph=0;CS.cn=3;},
 tick(dt){const Z=Zf();holdShield();
  if(!H.bsp){barsTick();if(leadZ()>Z.bossZ-16&&(rearZ()>Z.bossZ-40||leadZ()>Z.bossZ-6)){bossSpawn('bonelord',.4,'Страж ущелья «'+Z.th.n+'»');CS.ph=1;sendNow();}return;}
  const B=X.BOSS;
  if(!B){if(!CS.done){CS.ph=4;killLeft();setDone(['Страж повержен','Откройте сундук вдвоём и входите в портал']);}return;}
  const f=B.hp/B.maxHp;
  if(CS.ph===1&&f<=.66){CS.ph=2;shieldOn(.655,1);H.adds=addsAround(B,['skeleton','skeleton','wraith'],4);B.stun=1.5;holdShield();bn('Костяной щит','Убейте прислужников — щит спадёт',true);}
  else if(CS.ph===2&&CS.sh&&!alive(H.adds)){shieldOff(['Щит пал','Бейте стража!']);}
  else if(CS.ph===2&&!CS.sh&&f<=.33){CS.ph=3;B.spd*=1.25;B.dmg=Math.round(B.dmg*1.15);shieldOn(.325,1);H.adds=addsAround(B,['skeleton','wraith','necro'],5);B.stun=1.5;holdShield();bn('Ярость стража','Прислужники вернулись. Щит снова на нём!',true);}
  else if(CS.ph===3&&CS.sh&&!alive(H.adds)){shieldOff(['Щит пал','Добейте стража!']);}},
 hud(){if(CS.done)return {g:'Страж повержен',s:'Откройте сундук и входите в портал',f:1};
  const B=X.BOSS;const f=B?clamp(B.hp/B.maxHp,0,1):CS.ph?0:1;
  if(CS.ph===0)return {g:'Дойдите до стража',s:'Впереди арена',f:0};
  return {g:'Страж: фаза '+Math.min(3,Math.max(1,CS.ph))+' из 3',s:CS.sh?'Щит! Убейте прислужников':'Бейте стража',f,b:!!CS.sh};}
};

// 6. Побег
LVL[6]={
 shape(Z){const kinds=['swarm','ranged','heavy','swarm+norm','ranged+heavy','swarm'];for(let i=0;i<6;i++)mkEnc(Z,i,34+i*30,kinds[i],i===3);},
 begin(){CS.wz=-34;CS.done=1;H.pullT=0;H.hT=0;H.chestT=1.2;},
 tick(dt){CS.wz+=wallSpeed()*dt;
  if(CS.wz>Zf().L-6)CS.wz=Zf().L-6;
  const hs=heroes();
  if(hs.length===2){const a=hLocal(hs[0]).z,b=hLocal(hs[1]).z;H.hT-=dt;
   if(Math.abs(a-b)>14&&H.hT<=0){H.hT=12;hn('Отставшего можно подтянуть нитью: кнопка «Подтянуть» или клавиша F',4);}}},
 hud(){const Z=Zf();const my=X.toLocal(X.P.pos.x,X.P.pos.z).z,gap=my-CS.wz;
  const prog=clamp(my/((Z?Z.L:230)-2),0,1);
  return {g:'Бегите к порталу: '+Math.round(prog*100)+'%',s:gap<8?'Тьма рядом! Бегом!':'До стены тьмы '+Math.round(gap)+' м',f:prog,b:gap<8};}
};
function wallSpeed(){return (2.5+Math.min(1.4,CS.el*.011))*(TEST?.6:1);}

// 7. Охота
const HUNT_T=120;
LVL[7]={
 shape(Z){Z.arenas.push({z:64,len:46,w:20});},
 begin(){CS.cn=6;H.el=[];H.sp=0;},
 tick(dt){
  if(CS.ph===0){if(leadZ()>24){CS.ph=1;CS.tm=HUNT_T*(TEST?3:1);for(let i=0;i<3;i++)huntSpawn(i);sendNow();bn('Охота началась','Убей 6 элитных врагов за 2 минуты',true);}return;}
  if(CS.ph!==1)return;
  CS.tm-=dt;let c=0,al=0;for(const e of H.el){if(e.dead)c++;else al++;}
  if(c!==CS.c){CS.c=c;sendNow();}
  if(al<3&&H.sp<6){huntSpawn(H.sp);}
  if(c>=6){CS.ph=2;killLeft();setDone(['Охота окончена','Идите к порталу']);return;}
  if(CS.tm<=0){fail('Время вышло: убито элитных врагов — '+c+' из 6. Не тратьте время на мелочь и идите на элитных.');}},
 hud(){if(CS.done)return {g:'Охота окончена',s:'Идите к порталу вдвоём',f:1};
  if(CS.ph===0)return {g:'Охота: убей 6 элитных за 120 с',s:'Таймер пойдёт, когда вы зайдёте в туман',f:0};
  let best=1e9,dir='';const P0=X.P,lm=X.toLocal(P0.pos.x,P0.pos.z);
  for(const en of X.ENEMIES){if(en.dead||!en.elite||en.boss)continue;const d=Math.hypot(en.pos.x-P0.pos.x,en.pos.z-P0.pos.z);if(d<best){best=d;dir=X.toLocal(en.pos.x,en.pos.z).z>lm.z?'впереди':'позади';}}
  return {g:'Элитные: '+CS.c+' / 6 · '+Math.ceil(Math.max(0,CS.tm))+' с',s:best<1e8?'Ближайший: '+Math.round(best)+' м '+dir:'Ищите элитных врагов',f:CS.c/6,b:CS.tm<25};}
};
function huntSpawn(i){H.sp++;const l=leadZ();let z=0;
  for(let t=0;t<8;t++){z=rand(34,108);if(Math.abs(z-l)>16)break;}
  const pools=['heavy','ranged','norm'],tid=pickPool(pools[(H.sp+i)%3]);
  for(const en of spawnAt(tid,rand(-7,7),z,{elite:true,hpMul:.5*HPM}))H.el.push(en);
  for(let j=0;j<2;j++)spawnAt(pickPool('norm'),rand(-7,7),z+rand(-3,3));}

// 8. Финал
LVL[8]={
 shape(Z){mkEnc(Z,0,28,'swarm');mkEnc(Z,1,56,'ranged');mkEnc(Z,2,84,'heavy',true);for(const e of Z.enc)addBar(Z,e.z+18);Z.arenas.push({z:Z.bossZ+4,len:24,w:18});},
 begin(){CS.ph=0;CS.cn=3;H.cT=8;H.aT=18;H.lastCombo=0;},
 tick(dt){const Z=Zf();holdShield();
  if(!H.bsp){barsTick();if(leadZ()>Z.bossZ-16&&(rearZ()>Z.bossZ-40||leadZ()>Z.bossZ-6)){bossSpawn('heart',.8,'Последний бой «'+Z.th.n+'»');CS.ph=1;sendNow();}return;}
  const B=X.BOSS;
  if(!B){if(!CS.done){CS.ph=4;CS.cr=null;killLeft();setDone(['Хранитель повержен','Откройте сундук вдвоём и входите в портал']);}return;}
  const f=B.hp/B.maxHp,hs=heroes();
  if(CS.ph===1&&f<=.70){CS.ph=2;shieldOn(.695,2);H.cT=6;bn('Щит стихий','Нужно 3 общих реакции стихий: бейте одного врага разными стихиями вдвоём',true);B.stun=1.2;holdShield();}
  if(CS.sh===2){const c=MPm.combo|0;if(c>H.lastCombo)CS.shc+=c-H.lastCombo;H.lastCombo=c;H.shT-=dt;
   if(CS.shc>=CS.shn){shieldOff(['Щит разбит','Реакция вдвоём сработала. Бейте!']);}
   else if(H.shT<=0){shieldOff(['Щит треснул','Бейте хранителя!']);}}
  if(CS.ph===2&&!CS.sh&&f<=.35){CS.ph=3;B.spd*=1.2;B.dmg=Math.round(B.dmg*1.12);H.cT=5;bn('Сердце в ярости','Круги света вспыхивают всё быстрее',true);}
  if(CS.ph>=2){circleTick(dt,B,hs);
   if(CS.ph===3){H.aT-=dt;if(H.aT<=0){H.aT=22;H.adds=addsAround(B,['wraith','mage','elemental'],3);}}}},
 hud(){if(CS.done)return {g:'Хранитель повержен',s:'Откройте сундук и входите в портал',f:1};
  const B=X.BOSS;const f=B?clamp(B.hp/B.maxHp,0,1):1;
  if(CS.ph===0)return {g:'Дойдите до арены хранителя',s:'Враги по пути держат ворота',f:0};
  const s=CS.sh===2?'Щит стихий: общие реакции '+Math.min(CS.shn,CS.shc|0)+' / '+CS.shn:(CS.cr?'Сойдитесь в круге света!':(CS.ph>=2?'Ждите круг света':'Бейте хранителя'));
  return {g:'Хранитель сердца: фаза '+Math.min(3,Math.max(1,CS.ph))+' из 3',s,f,b:!!CS.cr};}
};
function circleTick(dt,B,hs){
  if(!CS.cr){H.cT-=dt;if(H.cT<=0&&hs.length&&!X.MP.pl){
    let mx=0,mz=0;for(const h of hs){mx+=h.p.x;mz+=h.p.z;}mx/=hs.length;mz/=hs.length;
    const a=rand(0,TAU),l=X.toLocal(mx+Math.cos(a)*6,mz+Math.sin(a)*6),Z=Zf();
    const lz=clamp(l.z,Z.bossZ-12,Z.L-14),hw=Math.max(1,X.ghw(lz)-3.5),w=lpos(clamp(l.x-X.gcx(lz),-hw,hw),lz);
    CS.cr=[r2(w.x),r2(w.z),3.6,4.2];sendNow();bn('Круг света','Сойдитесь в круге, пока он не вспыхнул!');}
   return;}
  CS.cr[3]-=dt;if(CS.cr[3]>0)return;
  const cx=CS.cr[0],cz=CS.cr[1],r=CS.cr[2];let all=true;
  const dmg=Math.round(B.dmg*1.6);
  for(const h of hs){const inside=Math.hypot(h.p.x-cx,h.p.z-cz)<r;if(!inside){all=false;
    if(h.id===0)X.hurtPlayer(dmg,B);else X.mpSend({t:'hurt',d:dmg,b:0,f:0,s:0,dt:0});}}
  X.fxRing(cx,cz,.6,r+2,X.GOLD,.7);X.colBurst(X.GOLD,cx,1.2,cz,40,6,.8,2);
  if(all&&hs.length>=1){B.stun=3.5;B.busy=0;B.shredT=7;bn('Свет сошёлся','Хранитель оглушён — бейте!');}
  else bn('Свет вспыхнул','Вы не успели сойтись в круге',true);
  CS.cr=null;H.cT=CS.ph>=3?10:15;sendNow();}

// ---------------------------------------------------------------- старт, победа, поражение
function begin(c){
  clearAll();
  CS=newCS(c.k);H={chestT:0,ft:0,pd:[false,false]};
  const Z=Zf();Z.open=false;
  buildVisuals();
  LVL[c.k].begin();
  applyBars();
  $('#campBox').hidden=false;$('#mpHud').classList.add('camp');
  $('#campPull').hidden=c.k!==6;
  X.banner('Уровень '+c.k+' · '+c.name,c.goal);
  if(X.MPH)sendNow();
}
function shape(Z,c){
  Z.camp=c;Z.lv=c.lv;Z.bossZ=c.L-30;Z.arenas=[];Z.enc=[];Z.cb=[];
  LVL[c.k].shape(Z);}
function clearAll(){
  if(R){for(const d of R.disp){try{d.dispose&&d.dispose();}catch(e){}}if(R.rootL&&R.rootL.parent)R.rootL.parent.remove(R.rootL);if(R.rootW)X.scene.remove(R.rootW);R=null;}
  CS=null;H=null;uiKey='';
  const b=$('#campBox');if(b){b.hidden=true;b._f=null;}const h=$('#mpHud');if(h)h.classList.remove('camp');const pb=$('#campPull');if(pb)pb.hidden=true;}
function fail(text){
  if(!CS||CS.fail)return;CS.fail=1;sendNow();
  if(X.MPH)X.mpSend({t:'camp',k:'fail',r:text});
  failLocal(text);}
function failLocal(text){
  const Z=Zf();if(!Z||!CS)return;Z.failText=text;CS.fail=1;
  if(X.P.dead&&!X.MP.down&&!$('#dead').hidden)return;
  X.MP.down=false;X.dieFull();
  $('#reviveBtn').textContent=(X.MPH||!X.MPon)?'Заново':'Ждём хозяина комнаты…';}
function calcStars(){const c=LV[CS.k-1];let s=1;if(CS.dn===0){s=2;if(CS.el<=c.par)s=3;}return s;}
function finish(){
  if(!CS||CS.win)return;const Z=Zf();CS.win=1;Z.won=true;
  const st=calcStars(),k=CS.k,d=ownProg().d,prev=d[k],first=!prev,el=Math.round(CS.el);
  if(!prev||st>prev.s||(st===prev.s&&el<prev.t))d[k]={s:st,t:el};
  X.save();
  const m={t:'camp',k:'win',st,el,dn:CS.dn,fs:first?1:0};
  if(X.MPH)X.mpSend(m);
  winLocal(m);sendProg();}
function winLocal(m){
  const Z=Zf();if(!Z||!CS)return;Z.won=true;CS.win=1;
  const k=CS.k,c=LV[k-1],first=!!m.fs;
  const xp=Math.round(X.xpNeed(Math.max(1,X.S.lvl))*(first?.55:.25)*(1+.08*k)),ess=Math.round(40*k+(first?55*k:0)),sc=(first?2:1)+(first&&k===8?1:0);
  X.gainXp(xp);X.S.ess+=ess;for(let i=0;i<sc;i++)X.learnRandom();X.save();
  $('#winTitle').textContent=k===8?'Кампания пройдена!':'Уровень '+k+' «'+c.name+'» пройден';
  let tx='Оценка '+stars(m.st)+' · время '+fmtT(m.el)+' · падений: '+m.dn+(m.st<3?(m.dn?' (★★ — без падений)':' (★★★ — быстрее '+fmtT(c.par)+')'):'')+'. Награда каждому: +'+xp+' опыта, +'+ess+' эссенции, свитков чар: '+sc+(first?' (за первое прохождение)':'')+'.';
  const host=X.MPH||!X.MPon;
  if(!host)tx+=' Дальше выбирает хозяин комнаты.';
  $('#winTxt').textContent=tx;
  $('#banner').classList.remove('on');$('#toast').classList.remove('on');
  $('#winNext').hidden=!(host&&k<8);if(k<8)$('#winNext').textContent='Уровень '+(k+1)+' «'+LV[k].name+'»';
  $('#winWorld').hidden=!host;$('#winWorld').textContent='К выбору уровня';
  $('#win').hidden=false;X.fxPillar(X.P.pos.x,X.P.pos.z,1.5,10,X.GOLD,1.2);X.syncPause();}
function portal(){
  const Z=Zf();if(!CS||CS.win||Z.won)return;
  if(X.MPG){if(X.time-(MPm.cpH||-9)>3){MPm.cpH=X.time;X.hint('Войдите в портал вместе — ведёт хозяин комнаты',3);}return;}
  if(!CS.done)return;
  const pr=MPm.peer;
  if(!X.MPon||!pr||!pr.on||pr.dead||nearPortal(pr.pos)<9){finish();return;}
  if(X.time-(H.gh||-9)>3){H.gh=X.time;X.hint('Дождись напарника: в портал входят вдвоём',3);}}
function next(){const k=CS?CS.k:0;if(!(X.MPH||!X.MPon))return;if(k>=1&&k<8)X.mpHostStart('camp',k+1);}
function toLevels(){X.toSelect();if(MPm.role==='host'){MPm.status='lobby';X.mpOpenLobby();}}
function resync(){ // гость вернулся посреди уровня: полное состояние цели и позиция хоста
  if(!X.MPH||!CS)return;
  X.mpSend({t:'camp',k:'st',s:CS,rj:1,hx:r2(X.P.pos.x),hz:r2(X.P.pos.z)});sendProg();
  if(CS.win)X.mpSend({t:'camp',k:'win',st:calcStars(),el:Math.round(CS.el),dn:CS.dn,fs:0});}
function onMsg(m){
  switch(m.k){
   case 'st':{if(X.MPH||!CS||!m.s||m.s.k!==CS.k)return;const keep=CS.win,was=CS.gt.slice();Object.assign(CS,m.s);if(keep)CS.win=1;
     if(m.rj&&m.hx!=null){X.P.pos.set(m.hx+1.3,0,m.hz);X.P.prev.copy(X.P.pos);}
     if(R)for(let i=0;i<CS.gt.length;i++)if(CS.gt[i]&&!was[i])R.barFx(i);
     break;}
   case 'win':winLocal(m);break;
   case 'fail':failLocal(m.r);break;
   case 'prog':{peerProg={};(m.d||[]).forEach((s,i)=>{if(s>0&&i<8)peerProg[i+1]={s:clamp(s|0,1,3),t:0};});if(!$('#coop').hidden)X.mpRenderLobby();break;}
   case 'hn':X.hint(m.x,m.s);break;
   case 'pull':onPull(m);break;
  }}

// ---------------------------------------------------------------- подтяжка нитью (уровень «Побег»)
function dashTo(x,z,maxD){const P=X.P,dx=x-P.pos.x,dz=z-P.pos.z,d=Math.hypot(dx,dz)||1;const m=Math.max(0,Math.min(d-2.2,maxD));if(m<1)return;
  P.dashT=.45;P.dashV.set(dx/d*m/.45,0,dz/d*m/.45);P.invulnT=Math.max(P.invulnT,.7);
  X.fxRing(P.pos.x,P.pos.z,.4,3,X.GOLD,.4);X.colBurst(X.GOLD,P.pos.x,1,P.pos.z,16,4,.4,0);}
function onPull(m){if(!CS||CS.k!==6||X.P.dead)return;dashTo(m.x,m.z,13);X.hint('Нить подтянула тебя к напарнику',2);}
function pullAction(){
  if(!CS||CS.k!==6||X.mode!=='game'||X.paused||X.P.dead||!H)return;
  const pr=MPm.peer;if(!pr||!pr.on||pr.dead){X.hint('Напарник не рядом',2);return;}
  if(X.time<(H.pullT||0)){X.hint('Нить ещё не готова',1.2);return;}
  const me=X.toLocal(X.P.pos.x,X.P.pos.z).z,he=X.toLocal(pr.pos.x,pr.pos.z).z,d=Math.hypot(pr.pos.x-X.P.pos.x,pr.pos.z-X.P.pos.z);
  if(d>30){X.hint('Нить слишком натянута — сойдитесь ближе',2);return;}
  if(d<5){X.hint('Вы и так рядом',1.2);return;}
  H.pullT=X.time+7;
  if(he>me+2)dashTo(pr.pos.x,pr.pos.z,13);                              // напарник впереди: рывок к нему
  else X.mpSend({t:'camp',k:'pull',x:r2(X.P.pos.x),z:r2(X.P.pos.z)});    // я впереди: тяну его к себе
}

// ---------------------------------------------------------------- кадровое обновление игры
function update(dt){
  if(!CS)return;const Z=Zf();if(!Z||!Z.camp)return;
  applyBars();
  if(Z.open!==!!CS.done){Z.open=!!CS.done;if(Z.open&&Z.portal)Z.portal.ringM.color.set(Z.th.glow);}
  if(X.MPG){ // между сообщениями хоста плавно продолжаем таймеры
    if(CS.tm>0)CS.tm=Math.max(0,CS.tm-dt);CS.el+=dt;if(CS.k===6&&CS.wz>-90&&CS.wz<Z.L-6)CS.wz+=wallSpeed()*dt;}
  localEffects(dt);
  if(X.MPG||CS.win||CS.fail)return;
  CS.el+=dt;
  const dd=[X.P.dead,MPm.peer&&MPm.peer.on?MPm.peer.dead:false];
  for(let i=0;i<2;i++){if(dd[i]&&!H.pd[i])CS.dn++;H.pd[i]=dd[i];}
  LVL[CS.k].tick(dt);
  if(H.chestT>0){H.chestT-=dt;if(H.chestT<=0&&X.MPon&&!MPm.chest)X.mpChestSpawn();}
  sendT-=dt;if(sendT<=0&&X.MPH){sendT=.2;X.mpSend({t:'camp',k:'st',s:CS});}}
function localEffects(dt){
  if(CS.k===6&&CS.wz>-90&&!X.P.dead){const l=X.toLocal(X.P.pos.x,X.P.pos.z);
    if(l.z<CS.wz+1){X.P.slowT=Math.max(X.P.slowT,.35);H.dkT=(H.dkT||0)-dt;if(H.dkT<=0){H.dkT=.5;X.hurtPlayer(Math.max(6,X.P.maxHp*.06),null,{dot:true});X.shake(.15);}}}}

// ---------------------------------------------------------------- визуальная часть
function buildVisuals(){
  const Z=Zf(),disp=[];
  const rootL=new THREE.Group(),rootW=new THREE.Group();
  X.gorgeGroup.add(rootL);X.scene.add(rootW);
  R={rootL,rootW,disp,bars:[],ent:null,plates:[],circle:null,shield:null,wallM:[],wallEdge:null,barFx:()=>{}};
  for(let i=0;i<Z.cb.length;i++){const z=Z.cb[i].z,w=X.ghw(z)*2+4;
    const geo=new THREE.PlaneGeometry(w,5),mat=new THREE.MeshBasicMaterial({color:0xff6a4a,transparent:true,opacity:.3,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const m=new THREE.Mesh(geo,mat);m.position.set(X.gcx(z),2.5,z);rootL.add(m);disp.push(geo,mat);
    const lm=new THREE.MeshBasicMaterial({color:0xffb090,transparent:true,opacity:.7,depthWrite:false});const lg=new THREE.PlaneGeometry(w,.84);
    const l1=new THREE.Mesh(lg,lm);l1.position.set(X.gcx(z),.12,z);l1.rotation.x=-Math.PI/2;rootL.add(l1);disp.push(lg,lm);
    const sp=X.glowSprite(0xff6a4a,3,.7);sp.position.set(X.gcx(z)-w/2+1,2,z);rootL.add(sp);const sp2=X.glowSprite(0xff6a4a,3,.7);sp2.position.set(X.gcx(z)+w/2-1,2,z);rootL.add(sp2);disp.push(sp.material,sp2.material);
    R.bars.push({m,l1,sp,sp2,mat});}
  if(CS.k===4){const g=new THREE.BoxGeometry(2.7,3.6,2.9),mt=new THREE.MeshLambertMaterial({color:0x4a4256});disp.push(g,mt);
    for(let z=P4.w0;z<=P4.w1;z+=2.2){const m=new THREE.Mesh(g,mt);m.position.set(X.gcx(z),1.7,z);m.rotation.y=(z*3.1)%1;m.castShadow=true;rootL.add(m);}
    for(let i=0;i<2;i++){const rm=new THREE.MeshBasicMaterial({color:0xb28cff,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}),dm=new THREE.MeshBasicMaterial({color:0xb28cff,transparent:true,opacity:.3,depthWrite:false,blending:THREE.AdditiveBlending});
      const ring=new THREE.Mesh(X.FXG.ring,rm),disc=new THREE.Mesh(X.FXG.disc,dm);ring.position.y=disc.position.y=.1;ring.visible=disc.visible=false;rootL.add(ring,disc);disp.push(rm,dm);R.plates.push({ring,disc,rm,dm});}}
  if(CS.ek){const g=new THREE.Group(),altar=CS.ek==='altar',col=altar?0xffd890:0x7fe7ff;
    const baseG=new THREE.CylinderGeometry(1.5,1.9,.6,10),baseM=new THREE.MeshLambertMaterial({color:0x6c6670});const base=new THREE.Mesh(baseG,baseM);base.position.y=.3;g.add(base);disp.push(baseG,baseM);
    const crG=new THREE.OctahedronGeometry(altar?.8:1.0,0),crM=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.92});const cr=new THREE.Mesh(crG,crM);cr.scale.set(.8,1.5,.8);cr.position.y=altar?1.9:2.2;g.add(cr);disp.push(crG,crM);
    const gl=X.glowSprite(col,6,.7);gl.position.y=altar?1.9:2.2;g.add(gl);disp.push(gl.material);
    const rg=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending});const ring=new THREE.Mesh(X.FXG.ring,rg);ring.scale.set(altar?9:4.5,1,altar?9:4.5);ring.position.y=.07;g.add(ring);disp.push(rg);
    const bgG=new THREE.PlaneGeometry(3.4,.4),bgM=new THREE.MeshBasicMaterial({color:0x201018,transparent:true,opacity:.8,depthTest:false}),fG=new THREE.PlaneGeometry(1,.3),fM=new THREE.MeshBasicMaterial({color:0x7dff8a,depthTest:false});
    const bar=new THREE.Group(),bb=new THREE.Mesh(bgG,bgM),ff=new THREE.Mesh(fG,fM);ff.position.z=.01;ff.renderOrder=41;bb.renderOrder=40;bar.add(bb,ff);bar.position.y=4.1;g.add(bar);disp.push(bgG,bgM,fG,fM);
    rootW.add(g);R.ent={g,cr,gl,ring,bar,ff,fM,altar,hpv:1,rz:CS.ez};}
  if(CS.k===6){const cv=document.createElement('canvas');cv.width=8;cv.height=128;const x=cv.getContext('2d'),gr=x.createLinearGradient(0,0,0,128);gr.addColorStop(0,'rgba(10,0,16,0)');gr.addColorStop(.35,'rgba(14,0,20,.85)');gr.addColorStop(1,'rgba(40,0,0,1)');x.fillStyle=gr;x.fillRect(0,0,8,128);
    const tex=new THREE.CanvasTexture(cv);disp.push(tex);
    R.wallM=[0,1,2].map(i=>{const geo=new THREE.PlaneGeometry(80,12),mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.9-i*.2,depthWrite:false,side:THREE.DoubleSide});const m=new THREE.Mesh(geo,mat);m.position.y=5.5;m.visible=false;rootL.add(m);disp.push(geo,mat);return m;});
    const eg=new THREE.PlaneGeometry(80,1.6),em=new THREE.MeshBasicMaterial({color:0xff5a2a,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
    const edge=new THREE.Mesh(eg,em);edge.rotation.x=-Math.PI/2;edge.position.y=.12;edge.visible=false;rootL.add(edge);disp.push(eg,em);R.wallEdge=edge;}
  if(CS.k===8){const rm=new THREE.MeshBasicMaterial({color:0x7dff8a,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}),dm=new THREE.MeshBasicMaterial({color:0xf2e6a0,transparent:true,opacity:.28,depthWrite:false,blending:THREE.AdditiveBlending});
    const ring=new THREE.Mesh(X.FXG.ring,rm),disc=new THREE.Mesh(X.FXG.disc,dm);ring.position.y=disc.position.y=.11;ring.visible=disc.visible=false;rootW.add(ring,disc);disp.push(rm,dm);R.circle={ring,disc,rm,dm};}
  {const sg=new THREE.SphereGeometry(1,16,12),sm=new THREE.MeshBasicMaterial({color:0x9fd8ff,transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});const sh=new THREE.Mesh(sg,sm);sh.visible=false;rootW.add(sh);disp.push(sg,sm);R.shield=sh;}
  R.barFx=i=>{const b=Z.cb[i];if(!b)return;const w=lpos(0,b.z);X.fxRing(w.x,w.z,1,10,X.GOLD,.6);X.colBurst(X.GOLD,w.x,1.5,w.z,26,6,.7,0);};
}
function visualUpdate(dt){
  if(!CS||!R)return;const Z=Zf();if(!Z)return;
  const t=X.time;
  for(let i=0;i<R.bars.length;i++){const b=R.bars[i],open=!!CS.gt[i];b.m.visible=b.l1.visible=b.sp.visible=b.sp2.visible=!open;if(!open)b.mat.opacity=.25+.1*Math.sin(t*4+i);}
  const e=R.ent;
  if(e){e.rz+=(CS.ez-e.rz)*Math.min(1,dt*6);const w=lpos(CS.ex,e.rz);e.g.position.set(w.x,0,w.z);
    e.cr.rotation.y=t*1.2;e.cr.position.y=(e.altar?1.9:2.2)+Math.sin(t*2)*.15;e.gl.material.opacity=.5+.2*Math.sin(t*3);
    const f=clamp(CS.eh/Math.max(1,CS.em),0,1);e.hpv+=(f-e.hpv)*Math.min(1,dt*8);
    e.ff.scale.x=Math.max(.001,e.hpv*3.3);e.ff.position.x=-1.65+e.hpv*1.65;e.fM.color.setHex(f>.5?0x7dff8a:f>.25?0xf2c46b:0xff5a4a);
    e.bar.quaternion.copy(X.camera.quaternion);e.ring.rotation.y=-t*.4;e.cr.material.color.setHex(f>.25?(e.altar?0xffd890:0x7fe7ff):0xff6a5a);}
  if(R.plates.length){for(let i=0;i<2;i++){const p=R.plates[i],pl=CS.pl&&CS.pl[i];p.ring.visible=p.disc.visible=!!pl;if(pl){p.ring.position.x=p.disc.position.x=X.gcx(pl[1])+pl[0];p.ring.position.z=p.disc.position.z=pl[1];
      p.ring.scale.set(2.1,1,2.1);p.disc.scale.set(2.05,1,2.05);const occ=CS.po[i]>=0,c=occ?(CS.pp>0?0x7dff8a:0xf2c46b):0xb28cff;p.rm.color.setHex(c);p.dm.color.setHex(c);p.rm.opacity=.6+.3*Math.sin(t*6+i);}}}
  if(R.wallM.length){const on=CS.wz>-90;for(let i=0;i<R.wallM.length;i++){const m=R.wallM[i];m.visible=on;if(on){m.position.set(X.gcx(CS.wz),5.5,CS.wz-i*1.4);m.material.opacity=(.92-i*.22)*(.85+.15*Math.sin(t*5+i));}}
    if(R.wallEdge){R.wallEdge.visible=on;if(on){R.wallEdge.position.set(X.gcx(CS.wz),.12,CS.wz+.8);R.wallEdge.material.opacity=.4+.2*Math.sin(t*7);}}
    if(on&&!X.paused&&Math.random()<.9){const z=CS.wz+rand(-1,2),x=X.gcx(z)+rand(-12,12),w=X.toWorld(x,z);X.emit(X.SPARK,w.x,rand(.2,3),w.z,0,rand(1,3),0,X.RED,rand(.5,1),-1,1);}}
  if(R.circle){const c=R.circle,cr=CS.cr;c.ring.visible=c.disc.visible=!!cr;if(cr){c.ring.position.x=c.disc.position.x=cr[0];c.ring.position.z=c.disc.position.z=cr[1];const k=.5+.5*(1-clamp(cr[3]/4.2,0,1));c.ring.scale.set(cr[2],1,cr[2]);c.disc.scale.set(cr[2]*k,1,cr[2]*k);c.rm.opacity=.6+.35*Math.sin(t*10);}}
  if(R.shield){const B=X.BOSS,on=!!CS.sh&&B&&!B.dead;R.shield.visible=!!on;if(on){R.shield.position.set(B.pos.x,B.hy*.5,B.pos.z);R.shield.scale.setScalar(B.r*1.6+1.2);R.shield.rotation.y=t;R.shield.material.opacity=.18+.08*Math.sin(t*6);}}
}
function hudUpdate(){
  const box=$('#campBox');if(!box)return;
  if(!CS||!X.GZ||!X.GZ.camp||X.mode!=='game'){if(!box.hidden)box.hidden=true;return;}
  box.hidden=false;const gp=$('#gprog');if(gp&&!gp.hidden)gp.hidden=true;
  const c=LV[CS.k-1],h=LVL[CS.k].hud();
  const key=c.k+'|'+h.g+'|'+h.s+'|'+(h.b?1:0);
  if(key!==uiKey){uiKey=key;$('#cbT').textContent='Уровень '+c.k+' · '+c.name;$('#cbG').textContent=h.g;$('#cbS').textContent=h.s||'';box.classList.toggle('warn',!!h.b);}
  const f=clamp(h.f||0,0,1).toFixed(3);if(box._f!==f){box._f=f;$('#cbI').style.transform='scaleX('+f+')';}
}
let lastVT=performance.now(),visErr=false;
X.WORLD_ANIM.push(()=>{const n=performance.now(),dt=Math.min(.1,(n-lastVT)/1000);lastVT=n;try{visualUpdate(dt);hudUpdate();}catch(e){if(!visErr){visErr=true;console.error('camp vis',e);}}});

// ---------------------------------------------------------------- интерфейс: стили, плашка, выбор уровня, комната
const css=document.createElement('style');css.textContent=`
#campBox{width:100%;display:grid;gap:3px;justify-items:center;text-align:center;font:500 11px/1.2 var(--f-ui);color:var(--text);background:var(--panel);border:1px solid rgba(242,196,107,.45);border-radius:10px;padding:5px 9px 6px;pointer-events:none}
#campBox[hidden]{display:none}
#campBox b{font:700 11px var(--f-ui);color:var(--gold);letter-spacing:.02em}
#campBox #cbG{font:700 13px/1.15 var(--f-ui);color:var(--text)}
#campBox #cbS{color:var(--muted);font-size:11px;min-height:1.2em}
#campBox .bar{width:100%;height:5px}
#campBox .bar i{background:var(--gold)}
#campBox.warn{border-color:rgba(255,120,100,.7)}
#campBox.warn .bar i{background:#ff7a5a}
#mpHud.camp #mpCombo{top:calc(var(--m) + var(--sat) + 100px)}
@media (orientation:portrait){#mpHud.camp #mpCard{top:calc(var(--sat) + 168px)}#mpHud.camp #mpCombo{top:calc(var(--sat) + 172px)}}
#campPull{position:absolute;left:50%;bottom:calc(var(--sab) + 18px);transform:translateX(-50%);pointer-events:auto;height:40px;padding:0 16px;border-radius:20px;border:1px solid rgba(242,196,107,.6);background:var(--panel);color:var(--gold);font:700 14px var(--f-ui);touch-action:manipulation}
#campPull[hidden]{display:none}
@media (orientation:portrait) and (max-width:600px){#campPull{left:calc(var(--m) + var(--sal));bottom:calc(var(--m) + var(--sab) + 116px);transform:none}}
#campSel{z-index:30;background:rgba(9,12,24,.97)}
#campSel .ov-card{max-width:760px}
.camp-strip{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--muted)}
.camp-strip i{font-style:normal;min-width:30px;padding:3px 5px;border-radius:8px;border:1px solid var(--line);background:var(--panel-solid);color:var(--muted);font-size:12px}
.camp-strip i.d{color:var(--gold);border-color:rgba(242,196,107,.5)}
.grow .cstars{color:var(--gold);letter-spacing:1px}
.grow .clock{margin-left:auto;font-size:18px;opacity:.7}
.grow.nxt{border-color:rgba(125,255,138,.55)}
@media (max-height:460px){#campBox #cbS{display:none}}
`;
document.head.appendChild(css);
{const top=$('#topc');if(top&&!$('#campBox')){const d=document.createElement('div');d.id='campBox';d.hidden=true;d.innerHTML='<b id="cbT"></b><span id="cbG"></span><div class="bar"><i id="cbI"></i></div><span id="cbS"></span>';top.insertBefore(d,top.firstChild);}
 const hud=$('#mpHud');if(hud&&!$('#campPull')){const b=document.createElement('button');b.id='campPull';b.type='button';b.hidden=true;b.textContent='Подтянуть (F)';hud.appendChild(b);
  b.addEventListener('click',pullAction);}
 const ov=document.createElement('div');ov.id='campSel';ov.className='ov';ov.hidden=true;ov.innerHTML='<div class="ov-card"><h1>Прохождение</h1><p id="csSub"></p><div class="glist" id="csList"></div><button class="ghost" id="csBack" type="button">Назад в комнату</button></div>';
 const app=$('#app');if(app)app.appendChild(ov);}
window.addEventListener('keydown',e=>{if(e.code==='KeyF'&&CS&&CS.k===6&&!e.repeat&&e.target.tagName!=='INPUT')pullAction();});

function openSelect(){
  const d=progD(),list=$('#csList');let h='';let done=0,st=0,nxt=0;
  for(let k=1;k<=8;k++)if(d[k]){done++;st+=d[k].s;}
  for(let k=1;k<=8;k++)if(!d[k]){nxt=k;break;}
  for(const c of LV){const e=d[c.k],open=unlocked(c.k);
    h+=`<button type="button" class="grow${e?' done':''}${c.k===nxt?' nxt':''}" data-k="${c.k}" ${open?'':'disabled'}><b>${e?'✓':c.k}</b><span>${c.name}<small>${c.goal} · враги ${c.lv} ур.</small><small>${e?'<span class="cstars">'+stars(e.s)+'</span> · лучшее время '+fmtT(e.t):open?(c.k===nxt?'следующий — открыт':'открыт'):'закрыт — сначала пройди предыдущий'}</small></span>${open?'':'<span class="clock">🔒</span>'}</button>`;}
  list.innerHTML=h;$('#csSub').textContent='Пройдено: '+done+' из 8, звёзд: '+st+' из 24. ★ — пройден, ★★ — без падений, ★★★ — ещё и быстро. Уровень открывается после предыдущего.';
  $('#campSel').hidden=false;}
$('#csList').addEventListener('click',e=>{const b=e.target.closest('.grow');if(!b||b.disabled)return;if(MPm.role!=='host')return;$('#campSel').hidden=true;X.mpHostStart('camp',+b.dataset.k);});
$('#csBack').addEventListener('click',()=>{$('#campSel').hidden=true;X.mpOpenLobby();});

function lobbyStrip(){
  const d=progList();let done=0,st=0;for(const s of d){if(s){done++;st+=s;}}
  const pills=d.map((s,i)=>`<i class="${s?'d':''}">${i+1}${s?' '+'★'.repeat(s):''}</i>`).join('');
  const who=MPm.role==='guest'?'Прогресс хозяина комнаты':'Прогресс прохождения';
  return `<div class="camp-strip"><span>${who}: ${done}/8 · ★ ${st}</span>${pills}</div>`;}

const TCC={LV,cleanSave,shape,begin,update,goal,portal,next,toLevels,resync,onMsg,sendProg,openSelect,lobbyStrip,clear:clearAll,
  start(k){const c=LV[clamp(k|0,1,8)-1];X.startGorge(c.th,c);},
  dbg:{CS:()=>CS,H:()=>H,killAll:()=>killLeft(),finish:()=>{if(CS&&!X.MPG){CS.done=1;finish();}},fail:t=>fail(t||'тест'),pull:pullAction,hud:()=>CS&&LVL[CS.k].hud(),dn:v=>{if(CS)CS.dn=v;}}};
return TCC;
};
})();
