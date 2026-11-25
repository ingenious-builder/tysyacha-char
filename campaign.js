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
 {k:1,key:'breach',name:'Прорыв',th:1,L:190,lv:2,n:4,par:300,goal:'Пройди через 3 засады до выхода'},
 {k:2,key:'altar',name:'Алтарь',th:2,L:150,lv:4,n:4,par:300,goal:'Удержи алтарь 2,5 минуты'},
 {k:3,key:'crystal',name:'Кристалл',th:4,L:200,lv:6,n:4,par:330,goal:'Проводи кристалл до цели'},
 {k:4,key:'plates',name:'Две плиты',th:3,L:190,lv:8,n:4,par:330,goal:'Откройте ворота и сойдитесь'},
 {k:5,key:'guard',name:'Страж',th:9,L:170,lv:10,n:4,par:360,goal:'Победите стража'},
 {k:6,key:'escape',name:'Побег',th:11,L:260,lv:12,n:4,par:150,goal:'Бегите к порталу от стены тьмы'},
 {k:7,key:'hunt',name:'Охота',th:8,L:150,lv:14,n:4,par:270,goal:'Убей 6 элитных врагов за 4 минуты'},
 {k:8,key:'final',name:'Финал',th:12,L:190,lv:17,n:5,par:480,goal:'Победите хранителя сердца'},
];
// 25.11 (Артём: «слишком много месива… нужно, чтобы врагов было немного, но они были живучими; танк танкует, маг за спиной»):
// враги кампании идут небольшими отрядами с ролями. hp — к здоровью (сверх ×2,2 обычного врага и ×1,6 вдвоём), dmg — к урону,
// xp — к опыту (врагов меньше, опыт за каждого больше). «Гончая» быстрая и бежит к хрупкому герою (меньше жизни),
// пока у неё на пути не встанет напарник; «громила» медленный и толстый — его держит танк; стрелки бьют издали.
const ROLE={
 grunt:  {pool:'norm',  hp:5.5,dmg:1.6, xp:1.4},
 brute:  {pool:'heavy', hp:7,  dmg:1.7, xp:1.7,spd:.85},
 shooter:{pool:'ranged',hp:4.2,dmg:1.6, xp:1.3},
 hound:  {pool:'swarm', hp:4,  dmg:1.4, xp:1.2,spd:1.3,hound:true},
 champ:  {pool:'heavy', hp:3.2,dmg:1.5, xp:1.2,elite:true,champ:true},   // элита ×3,5 и чемпион ×2 — уже в spawnEnemy
};
// запас здоровья по уровням кампании: первый — без особых правил, там враги толще; остальные держит сама цель уровня
const LVHP=[0,1.6,1,1,1.3,1.6,1,1.4,1.3];
// сила героя с уровнем растёт быстрее, чем линейная формула врагов ущелий (таланты, ранги, слоты): на 20-м уровне страж падал
// за 15 с. Как в свободном мире — множитель «враг своего уровня» FOE_K (та же таблица): здоровье ×(1+0,65·(K−1)), урон — треть этой прибавки
const CK=[[1,1],[4,1],[10,1.9],[16,3],[25,3.8],[40,4.2],[50,5.5],[60,7.5],[70,8.5],[100,9.5]];
function campK(l){const T=CK;let k=T[T.length-1][1];if(l<=T[0][0])k=T[0][1];else for(let i=1;i<T.length;i++)if(l<=T[i][0]){const a=T[i-1],b=T[i];k=a[1]*Math.pow(b[1]/a[1],(l-a[0])/(b[0]-a[0]));break;}return 1+(k-1)*.65;}
const dmgK=K=>1+(K-1)*.35;
// уровень врагов кампании растёт вместе с героями (как в коопе: 3/4 сильнейшего + 1/4 второго), но не ниже уровня ущелья:
// раньше герои за уровень вырастали на 4–5 уровней, а враги оставались прежними — к концу всё таяло с одного удара
function heroLv(){const a=(X.S&&X.S.lvl)|0||1,pr=MPm.peer,b=pr&&pr.on&&pr.lvl||a;return Math.max(1,Math.round(Math.max(a,b)*.75+Math.min(a,b)*.25));}
// герои ниже уровня ущелья (зашли на уровень сразу, без прошлых) — враги не больше чем на 1 выше них
function foeLv(){const Z=Zf(),h=heroLv();return Math.max(h,Math.min(Z?Z.lv:1,h+1));}


let CS=null;       // общее состояние цели (хост пишет, гость получает)
let H=null;        // служебное состояние хоста
let R=null;        // визуальные объекты
let peerProg=null; // прогресс хоста, который видит гость
let sendT=0,uiKey='';

function newCS(k){return {k,lf:0,cs:0,ch:null,el:0,ph:0,c:0,cn:0,tm:-1,ek:'',ex:0,ez:0,eh:0,em:0,gt:[],sg:0,pl:null,po:[-1,-1],pp:0,wz:-99,sh:0,shc:0,shn:3,cr:null,dn:0,done:0,fail:0,win:0};}

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
function heroes(){const a=[];if(!X.P.dead)a.push({id:0,p:X.P.pos});const pr=MPm.peer;if(pr&&pr.on&&!pr.dead&&pr.hero&&peerOk(pr))a.push({id:1,p:pr.pos});return a;}
// 25.11 (Артём: «после босса сундука нет, ворота закрыты»): в первые секунды уровня хост ещё видит напарника там, где тот стоял
// на прошлом уровне (у портала, z≈170–230). По этой старой точке сразу появлялся босс и срабатывали засады, а ворота
// перед ними так и оставались закрытыми. Теперь напарник учитывается, только когда его свежая позиция пришла к старту
// (через 1,5 с и ближе 40 м от начала), и никогда — за закрытыми воротами (туда не пройти, значит позиция старая)
function peerOk(pr){if(!H||!CS)return true;const Z=Zf();if(!Z)return false;const l=X.toLocal(pr.pos.x,pr.pos.z);
  if(!H.peerOk){if(X.time-H.t0>1.5&&l.z<40)H.peerOk=true;else return false;}
  return l.z<=(Z.z1||1e9)+4;}
function resetPeer(){const pr=MPm.peer;if(!pr||!pr.pos)return;const p=X.P.pos;pr.pos.set(p.x+(X.MPG?-2.6:2.6),0,p.z);pr.tx=pr.pos.x;pr.tz=pr.pos.z;
  if(pr.ib&&pr.ib.b){pr.ib.b.length=0;pr.ib.off=null;}}
function hLocal(h){return X.toLocal(h.p.x,h.p.z);}
function leadZ(){let z=-9;for(const h of heroes())z=Math.max(z,hLocal(h).z);return z;}
function bn(b,s,red){X.banner(b,s,!!red);if(X.MPH)X.mpSend({t:'bn',b,s,r:red?1:0});}
function hn(text,sec){X.hint(text,sec);if(X.MPH)X.mpSend({t:'camp',k:'hn',x:text,s:sec});}
function sendNow(){if(!X.MPH||!CS)return;X.mpSend({t:'camp',k:'st',s:CS});sendT=.2;}
function pickPool(kind){const Z=Zf();return X.pickW(Z.th.m[kind]||Z.th.m.norm);}
function spawnAt(tid,off,lz,o){const Z=Zf();lz=clamp(lz,2,Z.z1-1.2);const w=lpos(off,lz),lv=foeLv()+(Math.random()<.25?1:0),K=campK(lv);
  const op=Object.assign({gorge:true,aggro:true,noPack:true,hpMul:HPM},o);op.hpMul*=K;
  const l=X.spawnMob(tid,w.x,w.z,lv,op);for(const en of l)en.dmg=Math.max(1,Math.round(en.dmg*dmgK(K)));return l;}
function killLeft(filter){for(const en of X.ENEMIES){if(!en.dead&&!en.boss&&(!filter||filter(en)))X.kill(en,0,-1,{noReward:true});}}
// живой = не убит и ещё в игре (враг, убранный из списка без смерти, не должен навсегда держать ворота)
function alive(list){return !!(list&&list.some(e=>!e.dead&&X.ENEMIES.indexOf(e)>=0));}
function aliveN(list){let n=0;if(list)for(const e of list)if(!e.dead&&X.ENEMIES.indexOf(e)>=0)n++;return n;}
// отряд: 'hound2 grunt shooter' — роли с числом; спереди (по ходу) или сзади (засада)
function parseW(s){const out=[];for(const t of String(s).trim().split(/\s+/)){const m=/^([a-z]+)(\d*)$/.exec(t);if(m&&ROLE[m[1]])for(let i=0;i<(+m[2]||1);i++)out.push(m[1]);}return out;}
function tune(en,R){en.dmg=Math.max(1,Math.round(en.dmg*R.dmg));if(R.spd)en.spd*=R.spd;if(R.hound){en.hd=1;en.cg=true;}en.cmp=1;}
// гончая — из быстрых (волк, летучая мышь, призрак, бес, паук, гоблин, скелет); в ущельях без быстрых — волк
const FAST=new Set(['wolf','bat','wraith','imp','spider','goblin','skeleton','voidwraith','stormwraith','voidimp']);
function pickRole(R){if(!R.hound)return pickPool(R.pool);for(let i=0;i<8;i++){const t=pickPool(i<4?'swarm':'norm');if(FAST.has(t))return t;}return 'wolf';}
function unit(role,off,lz,o){const R=ROLE[role];const hk=o&&o.hk||1;if(o)delete o.hk;const l=spawnAt(pickRole(R),off,lz,Object.assign({hpMul:R.hp*hk*(LVHP[CS?CS.k:0]||1)*HPM,rw:R.xp,elite:!!R.elite,champ:!!R.champ},o||{}));for(const en of l)tune(en,R);return l;}
function squad(spec,lz,o){o=o||{};const Z=Zf(),out=[];
  parseW(spec).forEach(role=>{const sh=ROLE[role].pool==='ranged',d=sh?rand(4,7):rand(0,3),z=clamp(o.back?lz-d:lz+d,2,Z.L-3),hw=Math.max(1.5,X.ghw(z)-2);
    const off=o.off!=null?o.off+rand(-1,1):rand(-hw,hw)*.8;for(const en of unit(role,off,z,o.aggro===false?{aggro:false}:null))out.push(en);});
  if(o.cg)for(const en of out)en.cg=true;return out;}
// засада: отряды по очереди (следующий — когда прошлый разбит); первый стоит на месте и заметит героев сам (~18 м)
function mkEnc(Z,z,waves,o){const e=Object.assign({z,waves,wi:-1,all:[],units:[],done:false,wt:0,ft:0},o||{});Z.ce.push(e);Z.arenas.push({z:z+4,len:9,w:Z.th.aw});if(e.bar!==false)e.bi=addBar(Z,z+18);return e;}
function encWave(e){e.wi++;const w=e.waves[e.wi],back=/@back/.test(w),spec=w.replace('@back','');
  const lz=back?Math.max(4,rearZ()-rand(9,12)):e.z+rand(0,3);
  e.units=squad(spec,lz,{back,aggro:back||e.wi>0?undefined:false});e.all=e.all.concat(e.units);
  if(!H.hh&&e.units.some(u=>u.hd)){H.hh=1;hn('Гончие бегут к тому, у кого меньше жизни. Танк — встань у них на пути',4.5);}
  if(back)bn('Засада!','Враги позади вас — разворачивайтесь',true);}
function encTick(dt){const Z=Zf();if(!Z.ce)return;const lead=leadZ();
  for(const e of Z.ce){
    if(e.wi<0){if(lead>e.z-(e.trig||22)){e.done=true;encWave(e);}continue;}
    if(e.wi<e.waves.length-1&&!alive(e.units)){e.wt+=dt;if(e.wt>=1.8){e.wt=0;encWave(e);}}
    stragglers(e.all,e,dt);if(e.bi!=null||e.gate)cornered(e.units,e.cs||(e.cs={}),dt);}}
function encCleared(e){return e.wi>=e.waves.length-1&&e.all.length>0&&!alive(e.all);}
function encLeft(){const Z=Zf();let n=0;if(Z&&Z.ce)for(const e of Z.ce)if(e.done&&!encCleared(e)){n+=aliveN(e.all);for(let j=e.wi+1;j<e.waves.length;j++)n+=parseW(e.waves[j].replace('@back','')).length;}return n;}
// отставшие: если живые враги нужной группы 25 с далеко от обоих героев (застряли за камнем, ушли назад) — выходят вперёд к героям
function stragglers(list,st,dt){if(!list||!list.length)return;const hs=heroes();if(!hs.length)return;let any=false;
  for(const u of list){if(u.dead)continue;any=true;for(const h of hs){if(Math.hypot(h.p.x-u.pos.x,h.p.z-u.pos.z)<32){st.ft=0;return;}}}
  if(!any){st.ft=0;return;}st.ft=(st.ft||0)+dt;if(st.ft<25)return;st.ft=0;
  const lz=clamp(leadZ()+8,2,Zf().z1-1.5);for(const u of list){if(u.dead)continue;const w=lpos(rand(-2,2),lz);u.pos.set(w.x,0,w.z);u.aggro=true;X.colBurst(X.RED,w.x,1,w.z,14,4,.4,0);}}
// загнанные: если от нужной группы осталось 1–2 врага и 35 с никто не погиб (стрелок убегает от бойца, враг застрял на камне)
// — они оказываются рядом с ближайшим героем и на миг оглушены. Иначе ворота могли держаться бесконечно
function cornered(list,st,dt){const n=aliveN(list);if(n!==st.cn){st.cn=n;st.ct=0;return;}if(!n||n>2)return;st.ct=(st.ct||0)+dt;if(st.ct<35)return;st.ct=0;
  const hs=heroes();if(!hs.length)return;let moved=false;
  for(const u of list){if(u.dead||X.ENEMIES.indexOf(u)<0)continue;let b=null,bd=1e9;for(const h of hs){const d=Math.hypot(h.p.x-u.pos.x,h.p.z-u.pos.z);if(d<bd){bd=d;b=h;}}
    if(!b||bd<5)continue;const a=rand(0,TAU),r=rand(2.5,4);u.pos.set(b.p.x+Math.cos(a)*r,0,b.p.z+Math.sin(a)*r);u.stun=Math.max(u.stun||0,1.4);u.aggro=true;X.colBurst(X.RED,u.pos.x,1,u.pos.z,14,4,.4,0);moved=true;}
  if(moved)hn('Последний враг загнан — добейте его',3);}
function barsTick(){const Z=Zf();if(!Z.ce)return;for(let i=0;i<Z.ce.length;i++){const e=Z.ce[i];if(e.bi!=null&&!CS.gt[e.bi]&&encCleared(e))openBar(e.bi,i<Z.ce.length-1?['Засада разбита','Проход открыт']:null);}}
function rearZ(){let z=1e9;for(const h of heroes())z=Math.min(z,hLocal(h).z);return z;}
function addBar(Z,z){Z.cb.push({z});return Z.cb.length-1;}
function applyBars(){const Z=Zf();if(!Z||!Z.cb||!CS)return;let z1=Z.L+1;for(let i=0;i<Z.cb.length;i++){if(!CS.gt[i]&&Z.cb[i].z-.7<z1)z1=Z.cb[i].z-.7;}Z.z1=z1;}
function openBar(i,text){if(CS.gt[i])return;CS.gt[i]=1;sendNow();if(text)bn(text[0],text[1]);}
function setDone(text){if(CS.done)return;CS.done=1;const Z=Zf();if(Z&&Z.cb)for(let i=0;i<Z.cb.length;i++)CS.gt[i]=1;sendNow();bn(text[0],text[1]);if(X.MPH&&!MPm.chest)H.chestT=1.4;}
function nearPortal(p){const Z=Zf();return Math.hypot(p.x-Z.portal.w.x,p.z-Z.portal.w.z);}

// ---------------------------------------------------------------- цели врагов (алтарь, кристалл)
const GP={pos:new THREE.Vector3(),vel:new THREE.Vector3(),dead:false};
function goal(en){
  if(!CS)return null;
  if(en.hd)return hunt(en);
  if(!en.cg||!CS.ek||CS.eh<=0)return null;
  let md=1e9;for(const h of heroes())md=Math.min(md,Math.hypot(h.p.x-en.pos.x,h.p.z-en.pos.z));
  if(md<6.5)return null;
  const w=lpos(CS.ex,CS.ez);GP.pos.set(w.x,0,w.z);return GP;}
// гончая бежит к хрупкому герою (меньше запас жизни) и бьёт его; кто встал у неё на пути (ближе 2,6 м) — того она и кусает 2 с.
// Под насмешкой танка (tauntS) — идёт за танком. Если герой один — обычная цель
function hunt(en){
  if(en.tauntS)return null;const P=X.P,pr=MPm.peer;if(P.dead||!(pr&&pr.on&&!pr.dead&&pr.hero))return null;
  const t=X.time;if(en.hbT>t&&en.hb)return en.hb;
  for(const h of [P,pr]){if(h!==en.hq&&Math.hypot(h.pos.x-en.pos.x,h.pos.z-en.pos.z)<2.6+en.r){en.hb=h;en.hbT=t+2;return h;}}
  if(!(en.hqT>t)||!en.hq){const a=P.maxHp||1,b=pr.maxHp||a;en.hq=a<b*.88?P:b<a*.88?pr:(P.hp/a<=pr.hp/b?P:pr);en.hqT=t+3;}
  return en.hq;}
function entDmg(dt){
  const e=lpos(CS.ex,CS.ez);let dps=0,n=0;
  for(const en of X.ENEMIES){if(en.dead||!en.cg||en.hd)continue;const d=Math.hypot(en.pos.x-e.x,en.pos.z-e.z);
    if(d<(RANGEDAI.has(en.t.ai)?9:2.5+en.r)){dps+=en.dmg*.3;n++;}}
  dps=Math.min(dps,CS.em*.12);
  if(dps>0){CS.eh=Math.max(0,CS.eh-dps*dt);H.ft-=dt;if(H.ft<=0){H.ft=.7;X.float({x:e.x,y:2.8,z:e.z},'−'+Math.max(1,Math.round(dps*.7)),'#ff8a8a',15);X.colBurst(X.RED,e.x,1.2,e.z,6,3,.3,2);}}
  return n;}
function entRegen(dt,rate){const hs=heroes();if(hs.length<2)return;const e=lpos(CS.ex,CS.ez);
  if(hs.every(h=>Math.hypot(h.p.x-e.x,h.p.z-e.z)<9))CS.eh=Math.min(CS.em,CS.eh+CS.em*rate*dt);}
// волна к цели (алтарь, кристалл): роли по очереди из набора; все, кроме гончих, идут бить цель
function wave(n,mix,lzFn,offR,o){const out=[];for(let i=0;i<n;i++){const role=mix[i%mix.length];
  for(const en of unit(role,rand(-offR,offR),lzFn(i),o)){en.cg=true;out.push(en);}}return out;}

// ---------------------------------------------------------------- боссы: общее
// pt — пороги фаз босса под фазы уровня (полоса и смена приёмов совпадают со щитами); баннеры фаз даёт сам уровень
function bossSpawn(tid,hpm,sub,pt){
  const Z=Zf(),lz=Z.bossZ+5,w=lpos(0,lz);
  const lv=foeLv()+1,K=campK(lv);
  const B=X.spawnEnemy(tid,w.x,w.z,lv,{gorge:true,aggro:true,hpMul:hpm*K*HPM,bsub:sub,phT:pt,phQ:true});B.skillCd=2.5;X.setBOSS(B);B.dmg=Math.round(B.dmg*dmgK(K));H.B=B;H.bsp=true;
  X.bossIntro(B);return B;}
function shieldOn(thr,kind){CS.sh=kind;CS.shc=0;H.lock=thr;H.shT=kind===2?40:60;H.lastCombo=MPm.combo|0;sendNow();}
function shieldOff(text){CS.sh=0;sendNow();const B=X.BOSS;if(B){B.shredT=5;B.stun=2.2;B.busy=0;}bn(text[0],text[1]);}
function addsAround(B,tids,n,hm){const out=[];const lv=foeLv(),K=campK(lv);for(let i=0;i<n;i++){const a=rand(0,TAU),d=rand(4,8);
  const l=X.spawnMob(tids[i%tids.length],B.pos.x+Math.cos(a)*d,B.pos.z+Math.sin(a)*d,lv,{gorge:true,aggro:true,noPack:true,hpMul:(hm||1)*K*HPM,rw:1.3});
  for(const e of l){tune(e,{dmg:1.4*dmgK(K)});out.push(e);}}return out;}
function holdShield(){const B=X.BOSS;if(CS.sh&&B&&!B.dead)B.hp=Math.max(B.hp,B.maxHp*H.lock);}

// ---------------------------------------------------------------- описание каждого уровня
const LVL={};

// 1. Прорыв: три засады. Сначала пара гончих («волки пробегают»), потом отряд, засада сзади, в конце чемпион со стрелками
LVL[1]={
 shape(Z){mkEnc(Z,34,['hound2','grunt2 shooter']);mkEnc(Z,86,['brute grunt shooter@back','hound grunt shooter']);mkEnc(Z,136,['champ shooter2','hound2 brute']);},
 begin(){CS.cn=3;},
 tick(dt){const Z=Zf();encTick(dt);barsTick();let c=0;for(const e of Z.ce)if(encCleared(e))c++;
  if(c!==CS.c){CS.c=c;sendNow();}
  if(c>=3)setDone(['Путь свободен','Откройте сундук вдвоём и входите в портал']);},
 hud(){const n=CS.c;return {g:CS.done?'Идите к порталу':'Засады: '+n+' / 3',s:CS.done?'Сундук — вдвоём, потом портал':CS.lf?'Врагов в засаде: '+CS.lf+' — пока они живы, проход закрыт':'Впереди засада — держитесь вместе',f:CS.done?1:n/3};}
};

// 2. Алтарь: удержать 150 секунд. Враги идут небольшими отрядами то спереди, то сзади; посередине и под конец — чемпионы
const ALT_Z=70,ALT_T=150;
LVL[2]={
 shape(Z){mkEnc(Z,34,['hound grunt'],{bar:false});Z.arenas.push({z:ALT_Z,len:24,w:17});addBar(Z,ALT_Z+28);},
 begin(){CS.ek='altar';CS.ex=0;CS.ez=ALT_Z;CS.em=Math.round(1200+foeLv()*150);CS.eh=CS.em;H.wt=2;H.ft=0;},
 tick(dt){encTick(dt);
  if(CS.ph===0){if(leadZ()>ALT_Z-20){CS.ph=1;CS.tm=ALT_T*TT;H.dur=ALT_T*TT;H.wt=3;sendNow();bn('Держите алтарь!','Враги идут к алтарю с двух сторон. Танк встречает, стрелок бьёт из-за спины',true);}return;}
  if(CS.ph!==1)return;
  CS.tm-=dt;const prog=clamp(1-CS.tm/H.dur,0,1);
  H.wt-=dt;
  let al=0;for(const en of X.ENEMIES)if(!en.dead&&en.cmp)al++;
  if(H.wt<=0&&CS.tm>6&&al<=3){H.wt=lerpN(17,12,prog)*(TEST?.5:1);H.side=(H.side|0)+1;const nn=2+Math.floor(prog*2.2),front=H.side%2===1;
   const mix=prog<.3?['grunt','hound','grunt']:prog<.65?['brute','shooter','hound','grunt']:['brute','shooter','grunt','hound'];
   wave(nn,mix,()=>ALT_Z+(front?1:-1)*rand(24,27),5);
   if(!front&&!H.bh){H.bh=1;hn('Враги заходят и сзади алтаря',3);}}
  if(prog>.45&&!H.e1){H.e1=1;wave(1,['champ'],()=>ALT_Z+rand(24,26),2);bn('Чемпион','Сильный враг идёт к алтарю — танк, держи его',true);}
  if(prog>.78&&!H.e2){H.e2=1;wave(1,['champ'],()=>ALT_Z-rand(24,26),2);bn('Ещё чемпион','Сзади! Не дайте ему дойти до алтаря',true);}
  entDmg(dt);entRegen(dt,.01);
  if(CS.eh<=0){fail('Алтарь разрушен. Враги дошли до него — держитесь рядом и бейте тех, кто идёт к алтарю.');return;}
  if(CS.tm<=0){CS.tm=0;CS.ph=2;killLeft(e=>e.cg);openBar(0);setDone(['Алтарь выстоял','Откройте сундук вдвоём и входите в портал']);}},
 hud(){if(CS.ph===0)return {g:'Дойдите до алтаря',s:'Когда вы подойдёте, начнётся оборона',f:0};
  const hp=Math.round(100*CS.eh/Math.max(1,CS.em));
  if(CS.done)return {g:'Алтарь выстоял',s:'Сундук — вдвоём, потом портал',f:1};
  return {g:'Держите алтарь: '+Math.ceil(Math.max(0,CS.tm))+' с',s:'Прочность алтаря '+hp+'%'+(CS.eh<CS.em*.3?' — срочно помогите!':''),f:CS.eh/Math.max(1,CS.em),b:CS.eh<CS.em*.3};}
};

// 3. Кристалл-караван: идёт ~1 м/с, только пока рядом кто-то из героев и возле него нет врагов.
// На дороге три заставы (отряд стоит и ждёт), между ними — небольшие отряды спереди и изредка гончие сзади
const CRY_START=8,CRY_V=.9;
LVL[3]={
 shape(Z){for(const z of [60,110,160])Z.arenas.push({z,len:9,w:Z.th.aw});},
 begin(){const Z=Zf();CS.ek='crystal';CS.ex=0;CS.ez=CRY_START;CS.em=Math.round(1200+foeLv()*140);CS.eh=CS.em;CS.ph=1;H.wt=10;H.ft=0;H.gz=Z.L-16;H.hintT=0;
   H.posts=[[60,'brute shooter2'],[110,'champ grunt'],[156,'brute2 shooter']];H.pi=0;},
 tick(dt){
  if(CS.ph!==1)return;
  while(H.pi<H.posts.length&&CS.ez>H.posts[H.pi][0]-42){const p=H.posts[H.pi++];squad(p[1],p[0],{aggro:false});}
  const e=lpos(CS.ex,CS.ez);let near=false;for(const h of heroes())if(Math.hypot(h.p.x-e.x,h.p.z-e.z)<12)near=true;
  let siege=false;for(const en of X.ENEMIES)if(!en.dead&&en.cmp&&!en.hd&&Math.hypot(en.pos.x-e.x,en.pos.z-e.z)<7.5){siege=true;break;}
  if(near&&!siege)CS.ez=Math.min(H.gz,CS.ez+CRY_V*SPD*dt);
  if(!near&&!siege){H.hintT-=dt;if(H.hintT<=0){H.hintT=15;hn('Кристалл ждёт: подойдите к нему ближе',3);}}
  if(CS.cs!==(siege?1:near?0:2)){CS.cs=siege?1:near?0:2;sendNow();}
  const prog=clamp((CS.ez-CRY_START)/(H.gz-CRY_START),0,1);
  if(!siege)H.wt-=dt;
  let al=0;for(const en of X.ENEMIES)if(!en.dead&&en.cmp)al++;
  if(H.wt<=0&&prog<.93&&al<=2){H.wt=lerpN(24,18,prog)/(TEST?2:1);H.side=(H.side|0)+1;const nn=prog<.6?2:3,mix=prog<.4?['grunt','shooter','hound']:['brute','shooter','grunt','hound'];
   wave(nn,mix,()=>CS.ez+rand(22,28),4);if(H.side%3===0){wave(prog<.5?1:2,['hound'],()=>CS.ez-rand(14,18),4);if(!H.bh){H.bh=1;hn('Гончие догоняют сзади — они бегут к тому, у кого меньше жизни',4);}}}
  entDmg(dt);entRegen(dt,.004);
  if(CS.eh<=0){fail('Кристалл разбит. Держитесь рядом с ним и не пускайте врагов к нему.');return;}
  if(CS.ez>=H.gz-.01){CS.ph=2;killLeft(e=>e.cg);setDone(['Кристалл доставлен','Откройте сундук вдвоём и входите в портал']);}},
 hud(){if(CS.done)return {g:'Кристалл доставлен',s:'Сундук — вдвоём, потом портал',f:1};
  const gz=(Zf()?Zf().L:200)-16,prog=clamp((CS.ez-CRY_START)/(gz-CRY_START),0,1),hp=Math.round(100*CS.eh/Math.max(1,CS.em));
  return {g:'Проводи кристалл: '+Math.round(prog*100)+'%',s:(CS.cs===1?'Стоит — рядом враги · ':CS.cs===2?'Ждёт вас · ':'')+'прочность '+hp+'%',f:prog,b:CS.eh<CS.em*.3};}
};

// 4. Две плиты: плиты держать 3 с; в каждом коридоре по два отряда (громила/боец + стрелок); пока стоите на вторых плитах,
// к каждому по коридору идёт по бойцу — сначала разберитесь с ним, потом стойте; в конце чемпион со стрелком и вторым отрядом
const P4={p1:60,g1:70,w0:76,w1:128,p2:124,g2:132,e3:150,g3:166};
LVL[4]={
 shape(Z){const c=P4;mkEnc(Z,30,['hound2','grunt2 shooter'],{bar:false});mkEnc(Z,c.e3,['champ shooter','hound2 brute','grunt2 shooter'],{bar:false,trig:16,gate:true});Z.arenas.push({z:c.p1,len:8,w:10});Z.arenas.push({z:103,len:32,w:13});
  addBar(Z,c.g1);addBar(Z,c.g2);addBar(Z,c.g3);
  for(let z=c.w0;z<=c.w1;z+=2.2)Z.obs.push({x:X.gcx(z),z,r:1.35});},
 begin(){CS.sg=0;CS.cn=4;setPlates([[-3.2,P4.p1],[3.2,P4.p1]]);H.pk=[0,0];H.cp=[];H.cps={};},
 tick(dt){const Z=Zf();encTick(dt);
  if(CS.sg===0||CS.sg===2){const ok=platesTick(dt);
   if(ok){if(CS.sg===0){CS.sg=1;CS.c=1;setPlates(null);openBar(0,['Ворота открыты','Разойдитесь по коридорам — каждый в свой']);}
          else{CS.sg=3;CS.c=3;setPlates(null);openBar(1,['Ворота открыты','Сойдитесь: впереди чемпион']);}}}
  else if(CS.sg===1){
   const l=leadZ(),hs=heroes();
   if(!H.pk[0]&&l>P4.w0+4){H.pk[0]=1;corridorPack(88,['grunt','shooter']);}
   if(!H.pk[1]&&l>P4.w0+22){H.pk[1]=1;corridorPack(108,['brute','shooter']);}
   stragglers(H.cp,H.cps,dt);cornered(H.cp,H.cpc||(H.cpc={}),dt);
   if(hs.length>=1&&hs.every(h=>hLocal(h).z>P4.p2-16)&&H.pk[1]&&!alive(H.cp)){CS.sg=2;CS.c=2;setPlates([[-5.2,P4.p2],[5.2,P4.p2]]);corridorPack(P4.p2-18,['grunt']);bn('Две плиты','Встаньте на плиты — по одному в каждом коридоре. Сзади идут враги!');}}
  else if(CS.sg===2)stragglers(H.cp,H.cps,dt);
  else if(CS.sg===3){const e=Z.ce[1];
   if(encCleared(e)){CS.sg=4;CS.c=4;openBar(2);setDone(['Путь свободен','Откройте сундук вдвоём и входите в портал']);}}},
 hud(){const sg=Math.min(4,CS.sg|0);
  const t=['Встаньте на две плиты','Разойдитесь по коридорам','Встаньте на плиты в коридорах','Победите чемпиона и его отряд','Идите к порталу'][sg];
  const s=['По одному на каждую плиту — ворота откроются сами','Через стену не пройти: в каждом коридоре свои враги'+(CS.lf?' · осталось '+CS.lf:''),'Сначала добейте врага рядом, потом держите плиту','Победите всех врагов — проход откроется'+(CS.lf?' · осталось '+CS.lf:''),'Сундук — вдвоём, потом портал'][sg];
  const f=(sg===0||sg===2)&&CS.pp>0?CS.pp:sg/4;return {g:t+' ('+Math.min(4,sg+1)+'/4)',s,f};}
};
function corridorPack(z,roles){for(const side of [-1,1]){const off=side*(X.ghw(z)*.5+.6);   // в коридоре герой один — отряд там слабее
  for(const role of roles){for(const en of unit(role,off+rand(-1.2,1.2),z+rand(-4,4),{hk:.6}))H.cp.push(en);}}}
function setPlates(pl){CS.pl=pl;CS.pp=0;CS.po=[-1,-1];sendNow();}
function platesTick(dt){
  const hs=heroes();let o=[-1,-1];
  for(let i=0;i<2;i++){const pp=CS.pl[i],w=lpos(pp[0],pp[1]);for(const h of hs){if(Math.hypot(h.p.x-w.x,h.p.z-w.z)<2){o[i]=h.id;break;}}}
  CS.po=o;const ok=o[0]>=0&&o[1]>=0&&o[0]!==o[1];
  if(ok)CS.pp=Math.min(1,CS.pp+dt/3);else CS.pp=Math.max(0,CS.pp-dt/1.6);
  if(hs.length<2){H.pnT=(H.pnT||0)-dt;if(H.pnT<=0){H.pnT=9;hn('Для плит нужны двое. Напарник вернётся — подождите.',4);}}
  return CS.pp>=1;}

// 5. Страж: две засады, потом страж с тремя фазами; щиты держат прислужники — их бьёт тот, кто не держит стража
LVL[5]={
 shape(Z){mkEnc(Z,30,['hound2 grunt']);mkEnc(Z,66,['brute shooter2','hound grunt']);Z.arenas.push({z:Z.bossZ+4,len:22,w:16});},
 begin(){CS.ph=0;CS.cn=3;},
 tick(dt){const Z=Zf();holdShield();encTick(dt);barsTick();
  if(!H.bsp){if(leadZ()>Z.bossZ-16&&(rearZ()>Z.bossZ-40||leadZ()>Z.bossZ-6)){bossSpawn('bonelord',3.2,'Страж ущелья «'+Z.th.n+'»',[.66,.33]);CS.ph=1;sendNow();}return;}
  const B=X.BOSS;
  if(!B){if(!CS.done&&!X.bossShow){CS.ph=4;killLeft();setDone(['Страж повержен','Откройте сундук вдвоём и входите в портал']);}return;}
  if(H.adds){stragglers(H.adds,H.as||(H.as={}),dt);if(CS.sh)cornered(H.adds,H.ac||(H.ac={}),dt);}
  const f=B.hp/B.maxHp;
  if(CS.ph===1&&f<=.66){CS.ph=2;shieldOn(.655,1);H.adds=addsAround(B,['skeleton','skeleton','wraith'],3,4);B.stun=1.5;holdShield();bn('Костяной щит','Убейте прислужников — щит спадёт',true);}
  else if(CS.ph===2&&CS.sh&&!alive(H.adds)){shieldOff(['Щит пал','Бейте стража!']);}
  else if(CS.ph===2&&!CS.sh&&f<=.33){CS.ph=3;B.spd*=1.2;B.dmg=Math.round(B.dmg*1.15);shieldOn(.325,1);H.adds=addsAround(B,['skeleton','wraith','necro'],4,4);B.stun=1.5;holdShield();bn('Ярость стража','Прислужники вернулись. Щит снова на нём!',true);}
  else if(CS.ph===3&&CS.sh&&!alive(H.adds)){shieldOff(['Щит пал','Добейте стража!']);}},
 hud(){if(CS.done)return {g:'Страж повержен',s:'Сундук — вдвоём, потом портал',f:1};
  const B=X.BOSS;const f=B?clamp(B.hp/B.maxHp,0,1):CS.ph?0:1;
  if(CS.ph===0)return {g:'Дойдите до стража',s:CS.lf?'Врагов в засаде: '+CS.lf+' — пока они живы, проход закрыт':'Впереди арена',f:0};
  return {g:'Страж: фаза '+Math.min(3,Math.max(1,CS.ph))+' из 3',s:CS.sh?'Щит! Убейте прислужников':'Бейте стража',f,b:!!CS.sh};}
};

// 6. Побег: стена тьмы догоняет; на пути отряды — их можно обойти, гончие догоняют сами
LVL[6]={
 shape(Z){const w=['hound2','brute shooter','grunt2','champ','hound2 shooter','brute grunt'];for(let i=0;i<w.length;i++)mkEnc(Z,40+i*34,[w[i]],{bar:false,trig:26});},
 begin(){CS.wz=-34;CS.done=1;H.pullT=0;H.hT=0;H.chestT=1.2;},
 tick(dt){encTick(dt);CS.wz+=wallSpeed()*dt;
  if(CS.wz>Zf().L-6)CS.wz=Zf().L-6;
  const hs=heroes();
  if(hs.length===2){const a=hLocal(hs[0]).z,b=hLocal(hs[1]).z;H.hT-=dt;
   if(Math.abs(a-b)>14&&H.hT<=0){H.hT=12;hn('Отставшего можно подтянуть нитью: кнопка «Подтянуть» или клавиша F',4);}}},
 hud(){const Z=Zf();const my=X.toLocal(X.P.pos.x,X.P.pos.z).z,gap=my-CS.wz;
  const prog=clamp(my/((Z?Z.L:230)-2),0,1);
  return {g:'Бегите к порталу: '+Math.round(prog*100)+'%',s:gap<8?'Тьма рядом! Бегом!':'До стены тьмы '+Math.round(gap)+' м · сильных можно обойти',f:prog,b:gap<8};}
};
function wallSpeed(){return (2.4+Math.min(1.2,CS.el*.009))*(TEST?.6:1);}

// 7. Охота: 6 элитных за 4 минуты; элитные крепкие, при каждом — один охранник; одновременно на поле не больше трёх
const HUNT_T=240;
LVL[7]={
 shape(Z){Z.arenas.push({z:64,len:46,w:20});},
 begin(){CS.cn=6;H.el=[];H.sp=0;},
 tick(dt){
  if(CS.ph===0){if(leadZ()>24){CS.ph=1;CS.tm=HUNT_T*(TEST?3:1);for(let i=0;i<2;i++)huntSpawn(i);sendNow();bn('Охота началась','Убей 6 элитных врагов за 4 минуты. Они крепкие — бейте вдвоём',true);}return;}
  if(CS.ph!==1)return;
  CS.tm-=dt;let c=0,al=0;for(const e of H.el){if(e.dead)c++;else al++;}
  if(c!==CS.c){CS.c=c;sendNow();}
  if(al<2&&H.sp<6){huntSpawn(H.sp);}
  if(c>=6){CS.ph=2;killLeft();setDone(['Охота окончена','Откройте сундук вдвоём и входите в портал']);return;}
  if(CS.tm<=0){fail('Время вышло: убито элитных врагов — '+c+' из 6. Не тратьте время на мелочь и идите на элитных.');}},
 hud(){if(CS.done)return {g:'Охота окончена',s:'Сундук — вдвоём, потом портал',f:1};
  if(CS.ph===0)return {g:'Охота: убей 6 элитных за 4 минуты',s:'Таймер пойдёт, когда вы зайдёте в туман',f:0};
  let best=1e9,dir='';const P0=X.P,lm=X.toLocal(P0.pos.x,P0.pos.z);
  for(const en of X.ENEMIES){if(en.dead||!en.elite||en.boss)continue;const d=Math.hypot(en.pos.x-P0.pos.x,en.pos.z-P0.pos.z);if(d<best){best=d;dir=X.toLocal(en.pos.x,en.pos.z).z>lm.z?'впереди':'позади';}}
  return {g:'Элитные: '+CS.c+' / 6 · '+fmtT(Math.max(0,CS.tm)),s:best<1e8?'Ближайший: '+Math.round(best)+' м '+dir:'Ищите элитных врагов',f:CS.c/6,b:CS.tm<30};}
};
function huntSpawn(i){H.sp++;const l=leadZ();let z=0;
  for(let t=0;t<8;t++){z=rand(34,108);if(Math.abs(z-l)>16)break;}
  const pools=['heavy','ranged','norm'],tid=pickPool(pools[(H.sp+i)%3]);
  for(const en of spawnAt(tid,rand(-7,7),z,{elite:true,hpMul:3.2*HPM,rw:1.2})){tune(en,{dmg:1.5});H.el.push(en);}
  unit(H.sp%2?'grunt':'hound',rand(-7,7),z+rand(-3,3));}

// 8. Финал: три засады (последняя — с чемпионом), потом хранитель: щит стихий, круги света, в ярости — прислужники
LVL[8]={
 shape(Z){mkEnc(Z,30,['hound2 grunt']);mkEnc(Z,62,['shooter2 brute','hound grunt']);mkEnc(Z,96,['champ grunt2','hound2 shooter']);Z.arenas.push({z:Z.bossZ+4,len:24,w:18});},
 begin(){CS.ph=0;CS.cn=3;H.cT=8;H.aT=18;H.lastCombo=0;},
 tick(dt){const Z=Zf();holdShield();
  encTick(dt);barsTick();
  if(!H.bsp){if(leadZ()>Z.bossZ-16&&(rearZ()>Z.bossZ-40||leadZ()>Z.bossZ-6)){bossSpawn('heart',3.6,'Последний бой «'+Z.th.n+'»',[.70,.35]);CS.ph=1;sendNow();}return;}
  const B=X.BOSS;
  if(!B){if(!CS.done&&!X.bossShow){CS.ph=4;CS.cr=null;killLeft();setDone(['Хранитель повержен','Откройте сундук вдвоём и входите в портал']);}return;}
  const f=B.hp/B.maxHp,hs=heroes();
  if(CS.ph===1&&f<=.70){CS.ph=2;shieldOn(.695,2);H.cT=6;bn('Щит стихий','Нужно 3 общих реакции стихий: бейте одного врага разными стихиями вдвоём',true);B.stun=1.2;holdShield();}
  if(CS.sh===2){const c=MPm.combo|0;if(c>H.lastCombo)CS.shc+=c-H.lastCombo;H.lastCombo=c;H.shT-=dt;
   if(CS.shc>=CS.shn){shieldOff(['Щит разбит','Реакция вдвоём сработала. Бейте!']);}
   else if(H.shT<=0){shieldOff(['Щит треснул','Бейте хранителя!']);}}
  if(CS.ph===2&&!CS.sh&&f<=.35){CS.ph=3;B.spd*=1.2;B.dmg=Math.round(B.dmg*1.12);H.cT=5;bn('Сердце в ярости','Круги света вспыхивают всё быстрее',true);}
  if(CS.ph>=2){circleTick(dt,B,hs);
   if(CS.ph===3){H.aT-=dt;if(H.aT<=0){H.aT=24;H.adds=addsAround(B,['wraith','mage','elemental'],3,3.6);}}}},
 hud(){if(CS.done)return {g:'Хранитель повержен',s:'Сундук — вдвоём, потом портал',f:1};
  const B=X.BOSS;const f=B?clamp(B.hp/B.maxHp,0,1):1;
  if(CS.ph===0)return {g:'Дойдите до арены хранителя',s:CS.lf?'Врагов в засаде: '+CS.lf+' — пока они живы, проход закрыт':'Враги по пути держат ворота',f:0};
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
  const Z=Zf();Z.open=false;H.t0=X.time;H.peerOk=false;
  resetPeer();
  LVL[c.k].begin();
  buildVisuals();
  applyBars();
  $('#campBox').hidden=false;$('#mpHud').classList.add('camp');
  $('#campPull').hidden=c.k!==6;
  X.banner('Уровень '+c.k+' · '+c.name,c.goal);
  if(X.MPH)sendNow();
}
function shape(Z,c){
  Z.camp=c;Z.lv=c.lv;Z.bossZ=c.L-30;Z.arenas=[];Z.enc=[];Z.ce=[];Z.cb=[];
  LVL[c.k].shape(Z);}
function clearAll(){
  if(R){for(const d of R.disp){try{d.dispose&&d.dispose();}catch(e){}}if(R.rootL&&R.rootL.parent)R.rootL.parent.remove(R.rootL);if(R.rootW)X.scene.remove(R.rootW);R=null;}
  CS=null;H=null;uiKey='';
  OBJ=null;for(const id of ['#campMap','#campArrow']){const e=$(id);if(e)e.hidden=true;}
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
  if(X.runWon)X.runWon();
  const k=CS.k,c=LV[k-1],first=!!m.fs;
  const xp=Math.round(X.xpNeed(Math.max(1,X.S.lvl))*(first?.55:.25)*(1+.08*k)),ess=Math.round(40*k+(first?55*k:0)),sc=(first?2:1)+(first&&k===8?1:0);
  X.gainXp(xp,Math.round(xp*X.xpNeed.base(Math.max(1,X.S.lvl))/X.xpNeed(Math.max(1,X.S.lvl))));X.S.ess+=ess;for(let i=0;i<sc;i++)X.learnRandom();X.save();
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
     chestSync();
     break;}
   case 'win':winLocal(m);break;
   case 'fail':failLocal(m.r);break;
   case 'prog':{peerProg={};(m.d||[]).forEach((s,i)=>{if(s>0&&i<8)peerProg[i+1]={s:clamp(s|0,1,3),t:0};});if(!$('#coop').hidden)X.mpRenderLobby();break;}
   case 'hn':X.hint(m.x,m.s);break;
   case 'pull':onPull(m);break;
  }}

// гость: сундук хоста есть в общем состоянии — если сообщение о нём потерялось (обрыв, переподключение), дорисовать и открыть
function chestSync(){if(!X.MPG||!CS||!CS.ch)return;const c=CS.ch,mk=MPm.chestMk,op=MPm.chestOp;
  if(!MPm.chest&&typeof mk==='function'&&X.GZ)mk(c[0],c[1]);
  if(c[2]&&MPm.chest&&!MPm.chest.open&&typeof op==='function')op();}

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
  if(!CS)return;
  {const lf=encLeft()+(CS.k===4&&CS.sg<3&&H.cp?aliveN(H.cp):0);if(lf!==CS.lf)CS.lf=lf;}
  if(H.chestT>0){H.chestT-=dt;if(H.chestT<=0&&X.MPon&&!MPm.chest)X.mpChestSpawn();}
  {const c=MPm.chest;CS.ch=c?[r2(c.x),r2(c.z),c.open?1:0]:null;}
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
    const crG=new THREE.OctahedronGeometry(altar?.8:1.25,0),crM=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.92});const cr=new THREE.Mesh(crG,crM);cr.scale.set(.8,1.5,.8);cr.position.y=altar?1.9:2.2;g.add(cr);disp.push(crG,crM);
    const gl=X.glowSprite(col,altar?6:8,.75);gl.position.y=altar?1.9:2.2;g.add(gl);disp.push(gl.material);
    const rg=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.6,depthWrite:false,blending:THREE.AdditiveBlending});const ring=new THREE.Mesh(X.FXG.ring,rg);ring.scale.set(altar?9:4.5,1,altar?9:4.5);ring.position.y=.07;g.add(ring);disp.push(rg);
    const bgG=new THREE.PlaneGeometry(3.4,.4),bgM=new THREE.MeshBasicMaterial({color:0x201018,transparent:true,opacity:.8,depthTest:false}),fG=new THREE.PlaneGeometry(1,.3),fM=new THREE.MeshBasicMaterial({color:0x7dff8a,transparent:true,opacity:1,depthTest:false});
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
  // маяк цели: столб света над тем, куда идти (кристалл, алтарь, плита, сундук, портал, босс) — видно издалека
  {const bg=new THREE.CylinderGeometry(.5,.9,30,14,1,true),bm=new THREE.MeshBasicMaterial({color:0x7fe7ff,transparent:true,opacity:.26,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
   const beam=new THREE.Mesh(bg,bm);beam.position.y=15;const rm=new THREE.MeshBasicMaterial({color:0x7fe7ff,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending});
   const ring=new THREE.Mesh(X.FXG.ring,rm);ring.position.y=.09;const g=new THREE.Group();g.add(beam,ring);g.visible=false;rootW.add(g);disp.push(bg,bm,rm);R.beacon={g,bm,rm,ring};}
  R.barFx=i=>{const b=Z.cb[i];if(!b)return;const w=lpos(0,b.z);X.fxRing(w.x,w.z,1,10,X.GOLD,.6);X.colBurst(X.GOLD,w.x,1.5,w.z,26,6,.7,0);};
  uiMake();
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
    if(on&&!X.paused&&Math.random()<.9*(X.FRK||1)){const z=CS.wz+rand(-1,2),x=X.gcx(z)+rand(-12,12),w=X.toWorld(x,z);X.emit(X.SPARK,w.x,rand(.2,3),w.z,0,rand(1,3),0,X.RED,rand(.5,1),-1,1);}}
  if(R.circle){const c=R.circle,cr=CS.cr;c.ring.visible=c.disc.visible=!!cr;if(cr){c.ring.position.x=c.disc.position.x=cr[0];c.ring.position.z=c.disc.position.z=cr[1];const k=.5+.5*(1-clamp(cr[3]/4.2,0,1));c.ring.scale.set(cr[2],1,cr[2]);c.disc.scale.set(cr[2]*k,1,cr[2]*k);c.rm.opacity=.6+.35*Math.sin(t*10);}}
  if(R.shield){const B=X.BOSS,on=!!CS.sh&&B&&!B.dead;R.shield.visible=!!on;if(on){R.shield.position.set(B.pos.x,B.hy*.5,B.pos.z);R.shield.scale.setScalar(B.r*1.6+1.2);R.shield.rotation.y=t;R.shield.material.opacity=.18+.08*Math.sin(t*6);}}
}
// ---------------------------------------------------------------- куда идти: маяк, стрелка у края экрана, мини-карта ущелья
// 25.11 (Артём: «кристалл, который надо провожать, не видно на карте»): у кампании своя мини-карта (в ущельях общей нет) —
// ущелье, ворота, враги, цель уровня, сундук, портал, напарник (упал — мигает, чтобы найти и поднять)
const OBJC={crystal:0x7fe7ff,altar:0xffd890,plate:0xb28cff,chest:0xf2c46b,portal:0xc89bff,boss:0xff5a4a,elite:0xffc84a,circle:0x7dff8a};
function objective(){
  const Z=Zf();if(!CS||!Z||CS.win)return null;const k=CS.k;
  if(CS.done||k===6){const c=MPm.chest;if(c&&!c.open&&CS.done)return {x:c.x,z:c.z,t:'chest',n:'Сундук'};
    if(!CS.done)return null;const p=Z.portal.w;return {x:p.x,z:p.z,t:'portal',n:'Портал'};}
  if(k===8&&CS.cr)return {x:CS.cr[0],z:CS.cr[1],t:'circle',n:'Круг света'};
  if((k===5||k===8)&&X.BOSS&&!X.BOSS.dead)return {x:X.BOSS.pos.x,z:X.BOSS.pos.z,t:'boss',n:k===5?'Страж':'Хранитель'};
  if(k===2){const w=lpos(CS.ex,CS.ez);return {x:w.x,z:w.z,t:'altar',n:'Алтарь'};}
  if(k===3){const w=lpos(CS.ex,R&&R.ent?R.ent.rz:CS.ez);return {x:w.x,z:w.z,t:'crystal',n:'Кристалл'};}
  if(k===4&&CS.pl){const P=X.P.pos;let b=null,bd=1e9;for(const p of CS.pl){const w=lpos(p[0],p[1]),d=Math.hypot(w.x-P.x,w.z-P.z);if(d<bd){bd=d;b=w;}}return b&&{x:b.x,z:b.z,t:'plate',n:'Плита'};}
  if(k===7&&CS.ph===1){const P=X.P.pos;let b=null,bd=1e9;for(const e of X.ENEMIES){if(e.dead||!e.elite||e.boss)continue;const d=Math.hypot(e.pos.x-P.x,e.pos.z-P.z);if(d<bd){bd=d;b=e;}}return b&&{x:b.pos.x,z:b.pos.z,t:'elite',n:'Элитный'};}
  return null;}
let OBJ=null,layT=0,topY=0;
const ovOn=()=>{for(const id of ['#win','#dead','#lvlup']){const e=$(id);if(e&&!e.hidden)return true;}return false;};
// плашка цели сверху по центру: карту ставим под неё, если они сходятся по горизонтали; стрелку — не выше её низа
function layout(){const box=R&&R.map,cb=$('#campBox'),app=$('#app');if(!box||!cb||!app||cb.hidden){topY=0;return;}
  const a=app.getBoundingClientRect(),c=cb.getBoundingClientRect();topY=c.bottom-a.top;
  box.style.top='';const m=box.getBoundingClientRect();
  if(m.left<c.right&&m.right>c.left&&m.top<c.bottom+4)box.style.top=Math.round(c.bottom-a.top+6)+'px';}
const _v=new THREE.Vector3();
function arrowUpdate(o){
  const el=R&&R.arrow;if(!el)return;
  if(!o||X.mode!=='game'||X.P.dead||ovOn()){if(!el.hidden)el.hidden=true;return;}
  _v.set(o.x,1.5,o.z).project(X.camera);let nx=_v.x,ny=-_v.y;if(_v.z>1){nx=-nx;ny=-ny;}
  const P=X.P.pos,d=Math.round(Math.hypot(o.x-P.x,o.z-P.z));
  if(Math.abs(nx)<.86&&Math.abs(ny)<.78&&_v.z<1){if(!el.hidden)el.hidden=true;return;}
  const app=$('#app'),W=app?app.clientWidth:innerWidth,Hh=app?app.clientHeight:innerHeight,m=Math.max(Math.abs(nx)/.86,Math.abs(ny)/.74)||1;
  const x=clamp((nx/m*.5+.5)*W,30,W-30),y=clamp((ny/m*.5+.5)*Hh,Math.max(Hh*.24,topY+26),Hh*.76),a=Math.atan2(ny,nx);
  el.hidden=false;el.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;el.firstChild.style.transform=`rotate(${a.toFixed(2)}rad)`;
  const col='#'+(OBJC[o.t]||0xffffff).toString(16).padStart(6,'0');el.style.setProperty('--c',col);
  const t=o.n+' · '+d+' м';if(el._t!==t){el._t=t;el.lastChild.textContent=t;}}
let mapT=0,mapBig=false;
function mapDraw(dt){
  const box=R&&R.map;if(!box)return;const Z=Zf();
  const show=!!(CS&&Z&&Z.camp&&X.mode==='game'&&!CS.win&&!ovOn());if(box.hidden===show)box.hidden=!show;if(!show)return;
  layT-=dt;if(layT<=0){layT=.5;layout();}
  mapT-=dt;if(mapT>0)return;mapT=.12;
  const cv=box.firstChild,g=cv.getContext('2d'),sz=cv.width,c=sz/2,t=X.time;
  const pl=X.toLocal(X.P.pos.x,X.P.pos.z),Rw=mapBig?Math.max(55,Z.L*.52):40,k=c/Rw;
  const cz=mapBig?clamp(pl.z,Rw-14,Z.L-Rw+14):pl.z,cx=mapBig?X.gcx(cz):pl.x;
  const M=(lx,lz)=>[c-(lx-cx)*k,c-(lz-cz)*k],MW=(x,z)=>{const l=X.toLocal(x,z);return M(l.x,l.z);};
  g.clearRect(0,0,sz,sz);g.save();g.beginPath();g.arc(c,c,c-1,0,TAU);g.clip();
  g.fillStyle='#10151f';g.fillRect(0,0,sz,sz);
  const z0=Math.max(-6,cz-Rw-4),z1=Math.min(Z.L+4,cz+Rw+4),st=Math.max(1.5,Rw/30);
  g.beginPath();for(let z=z0;z<=z1;z+=st){const p=M(X.gcx(z)+X.ghw(z),z);z===z0?g.moveTo(p[0],p[1]):g.lineTo(p[0],p[1]);}
  for(let z=z1;z>=z0;z-=st){const p=M(X.gcx(z)-X.ghw(z),z);g.lineTo(p[0],p[1]);}g.closePath();
  g.fillStyle='#4d5a46';g.fill();g.strokeStyle='rgba(220,230,200,.55)';g.lineWidth=1.5;g.stroke();
  if(Z.obs){g.fillStyle='rgba(20,22,30,.85)';for(const o of Z.obs){if(o.z<z0||o.z>z1)continue;const p=M(o.x,o.z);g.beginPath();g.arc(p[0],p[1],Math.max(1.5,o.r*k),0,TAU);g.fill();}}
  if(Z.cb)for(let i=0;i<Z.cb.length;i++){if(CS.gt[i])continue;const z=Z.cb[i].z;if(z<z0||z>z1)continue;const a=M(X.gcx(z)+X.ghw(z),z),b=M(X.gcx(z)-X.ghw(z),z);
    g.strokeStyle='#ff5a3c';g.lineWidth=4.5;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();}
  {const p=M(X.gcx(Z.L-2),Z.L-2);g.strokeStyle=Z.open?'#7dff8a':'#9a86c8';g.lineWidth=3.5;g.beginPath();g.arc(p[0],p[1],8,0,TAU);g.stroke();}
  if(MPm.chest){const p=MW(MPm.chest.x,MPm.chest.z);g.fillStyle=MPm.chest.open?'#7a6a40':'#f2c46b';g.strokeStyle='#000';g.lineWidth=1.5;g.fillRect(p[0]-7,p[1]-5,14,10);g.strokeRect(p[0]-7,p[1]-5,14,10);}
  for(const e of X.ENEMIES){if(e.dead)continue;const p=MW(e.pos.x,e.pos.z);if(Math.hypot(p[0]-c,p[1]-c)>c-2)continue;
    g.fillStyle=e.boss?'#ff4a3a':e.elite?'#ffc84a':'#ff7a6a';g.beginPath();g.arc(p[0],p[1],e.boss?8:e.elite?5.5:3.6,0,TAU);g.fill();if(e.boss||e.elite){g.strokeStyle='#000';g.lineWidth=1;g.stroke();}}
  if(CS.pl)for(const q of CS.pl){const p=M(X.gcx(q[1])+q[0],q[1]);g.strokeStyle='#c8a8ff';g.lineWidth=3;g.beginPath();g.arc(p[0],p[1],6,0,TAU);g.stroke();}
  if(CS.cr){const p=MW(CS.cr[0],CS.cr[1]);g.strokeStyle='#7dff8a';g.lineWidth=3;g.beginPath();g.arc(p[0],p[1],Math.max(3,CS.cr[2]*k),0,TAU);g.stroke();}
  if(CS.ek){const p=M(X.gcx(R&&R.ent?R.ent.rz:CS.ez)+CS.ex,R&&R.ent?R.ent.rz:CS.ez),s=10+2*Math.sin(t*5),cr=CS.ek==='crystal';
    {const gr=g.createRadialGradient(p[0],p[1],1,p[0],p[1],s*1.9);gr.addColorStop(0,cr?'rgba(127,231,255,.7)':'rgba(255,216,144,.7)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.beginPath();g.arc(p[0],p[1],s*1.9,0,TAU);g.fill();}
    g.fillStyle=cr?'#7fe7ff':'#ffd890';g.strokeStyle='#04202a';g.lineWidth=1.5;g.beginPath();g.moveTo(p[0],p[1]-s);g.lineTo(p[0]+s*.7,p[1]);g.lineTo(p[0],p[1]+s);g.lineTo(p[0]-s*.7,p[1]);g.closePath();g.fill();g.stroke();}
  if(CS.k===6&&CS.wz>-90){const y=M(0,CS.wz)[1];if(y<sz){g.fillStyle='rgba(60,0,30,.75)';g.fillRect(0,y,sz,sz-y);g.strokeStyle='#ff5a2a';g.lineWidth=2;g.beginPath();g.moveTo(0,y);g.lineTo(sz,y);g.stroke();}}
  // стрелка к цели у края карты, если цель за кругом
  if(OBJ){let p=MW(OBJ.x,OBJ.z);const dx=p[0]-c,dy=p[1]-c,dl=Math.hypot(dx,dy);if(dl>c-13){const a=Math.atan2(dy,dx);p=[c+Math.cos(a)*(c-13),c+Math.sin(a)*(c-13)];
    g.save();g.translate(p[0],p[1]);g.rotate(a);g.fillStyle='#'+(OBJC[OBJ.t]||0xffffff).toString(16).padStart(6,'0');g.strokeStyle='#000';g.lineWidth=1.5;g.beginPath();g.moveTo(11,0);g.lineTo(-6,8.5);g.lineTo(-6,-8.5);g.closePath();g.fill();g.stroke();g.restore();}}
  const pr=MPm.peer;
  if(pr&&pr.on&&pr.pos&&pr.hero){let p=MW(pr.pos.x,pr.pos.z);const dx=p[0]-c,dy=p[1]-c,dl=Math.hypot(dx,dy),lim=c-8;if(dl>lim)p=[c+dx/dl*lim,c+dy/dl*lim];
    if(pr.dead){const q=.5+.5*Math.sin(t*7),r=15+8*q,gr=g.createRadialGradient(p[0],p[1],1,p[0],p[1],r);gr.addColorStop(0,'rgba(255,240,170,.95)');gr.addColorStop(.45,'rgba(255,90,60,'+(.55+.35*q)+')');gr.addColorStop(1,'rgba(255,60,40,0)');
      g.fillStyle=gr;g.beginPath();g.arc(p[0],p[1],r,0,TAU);g.fill();g.fillStyle='#fff';g.font='700 18px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('✚',p[0],p[1]+.5);}
    else{g.fillStyle='#5ae0ff';g.strokeStyle='#04202a';g.lineWidth=2.5;g.beginPath();g.arc(p[0],p[1],7,0,TAU);g.fill();g.stroke();}}
  {const p=M(pl.x,pl.z),l2=X.toLocal(X.P.pos.x+Math.sin(X.P.face),X.P.pos.z+Math.cos(X.P.face)),al=Math.atan2(-(l2.x-pl.x),-(l2.z-pl.z));
   g.save();g.translate(p[0],p[1]);g.rotate(al);g.fillStyle=X.P.dead?'#888':'#ffd36b';g.strokeStyle='#201400';g.lineWidth=2;g.beginPath();g.moveTo(0,-13);g.lineTo(10,10);g.lineTo(0,5.5);g.lineTo(-10,10);g.closePath();g.fill();g.stroke();g.restore();}
  g.restore();
  const lb=box.lastChild,tx=(pr&&pr.on&&pr.dead?'Напарник упал — подними его':CS.lf?'Врагов впереди: '+CS.lf:'')||'';if(lb._t!==tx){lb._t=tx;lb.textContent=tx;lb.classList.toggle('warn',!!(pr&&pr.on&&pr.dead));}}
function uiMake(){
  if(!R)return;
  let box=$('#campMap');if(!box){box=document.createElement('div');box.id='campMap';box.hidden=true;box.innerHTML='<canvas width="168" height="168"></canvas><span></span>';
    const mm=$('#mm');if(mm&&mm.parentNode)mm.parentNode.insertBefore(box,mm.nextSibling);else{const a=$('#app');if(a)a.appendChild(box);}
    box.addEventListener('click',()=>{mapBig=!mapBig;box.classList.toggle('big',mapBig);mapT=0;});}
  R.map=box;
  let ar=$('#campArrow');if(!ar){ar=document.createElement('div');ar.id='campArrow';ar.hidden=true;ar.innerHTML='<i>➤</i><span></span>';const a=$('#app');if(a)a.appendChild(ar);}
  R.arrow=ar;}
function beaconUpdate(o,t){
  const b=R&&R.beacon;if(!b)return;b.g.visible=!!o&&o.t!=='circle'&&o.t!=='boss'&&o.t!=='elite';if(!b.g.visible)return;
  b.g.position.set(o.x,0,o.z);const col=OBJC[o.t]||0xffffff;b.bm.color.setHex(col);b.rm.color.setHex(col);
  b.bm.opacity=.2+.08*Math.sin(t*3);const s=o.t==='crystal'?3.2:o.t==='altar'?4.5:o.t==='boss'?3.5:2.4;b.ring.scale.set(s,1,s);b.rm.opacity=.45+.25*Math.sin(t*4);}
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
X.WORLD_ANIM.push(()=>{const n=performance.now(),dt=Math.min(.1,(n-lastVT)/1000);lastVT=n;try{visualUpdate(dt);hudUpdate();
  if(CS&&R){OBJ=objective();beaconUpdate(OBJ,X.time);arrowUpdate(OBJ);mapDraw(dt);}}catch(e){if(!visErr){visErr=true;console.error('camp vis',e);}}});

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
#campMap{position:absolute;top:calc(var(--m) + var(--sat) + 52px);right:calc(var(--m) + var(--sar));width:calc(96px * var(--u,1));pointer-events:auto;touch-action:manipulation;cursor:pointer;-webkit-tap-highlight-color:transparent;z-index:2}
#campMap[hidden]{display:none}
#campMap.big{width:calc(150px * var(--u,1))}
#campMap canvas{display:block;width:100%;aspect-ratio:1;border-radius:50%;border:2px solid rgba(127,231,255,.55);background:#10151f;box-shadow:0 2px 10px rgba(0,0,0,.55)}
#campMap span{position:absolute;right:0;top:100%;margin-top:3px;width:max-content;max-width:150px;text-align:right;font:600 10px/1.15 var(--f-ui);color:var(--text);text-shadow:0 1px 2px #000,0 0 4px #000;white-space:nowrap}
#campMap span.warn{color:#ffb09a}
@media (orientation:portrait){#campMap{top:calc(var(--sat) + 166px);width:calc(92px * var(--u,1))}#campMap.big{width:calc(150px * var(--u,1))}}
#campArrow{position:absolute;left:0;top:0;pointer-events:none;z-index:3;display:flex;flex-direction:column;align-items:center;gap:1px;margin:-17px 0 0 -17px;--c:#7fe7ff}
#campArrow[hidden]{display:none}
#campArrow i{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:rgba(10,14,24,.78);border:2px solid var(--c);color:var(--c);font:700 17px/1 sans-serif;font-style:normal;box-shadow:0 0 12px var(--c)}
#campArrow span{font:700 10px/1.1 var(--f-ui);color:var(--c);text-shadow:0 1px 2px #000,0 0 4px #000;white-space:nowrap}
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
  dbg:{CS:()=>CS,H:()=>H,vis:()=>({ent:!!(R&&R.ent),entVis:!!(R&&R.ent&&R.ent.g.visible&&R.ent.g.parent),beacon:!!(R&&R.beacon&&R.beacon.g.visible),obj:OBJ&&OBJ.t,map:!!(R&&R.map&&!R.map.hidden),arrow:!!(R&&R.arrow&&!R.arrow.hidden)}),killAll:()=>killLeft(),finish:()=>{if(CS&&!X.MPG){CS.done=1;finish();}},fail:t=>fail(t||'тест'),pull:pullAction,hud:()=>CS&&LVL[CS.k].hud(),dn:v=>{if(CS)CS.dn=v;}}};
return TCC;
};
})();
