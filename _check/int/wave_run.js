// Забег по краям в автобое (ход боя по краям): герой с 1-го уровня стоит в середине края (угол 1.4 рад), враги идут к нему;
// край пройден — идёт в середину следующего. Смерть — «Воскреснуть» (на базу) и пешком обратно. Игра шагает по 1/60 с без отрисовки.
// Пишет: фазы и волны (время, уровень, смерти, сколько живых врагов), средн./макс. живых врагов. dir=base — прежняя игра (7da02f9) для «до».
// node wave_run.js cls=pyro [dir=base] [zones=2] [min=40] [seed=4242] [out=файл]
const fs=require('fs'),path=require('path');const {withBrowser,openGame,START,FREEZE}=require('./lib.js');
const A={};for(const a of process.argv.slice(2)){const i=a.indexOf('=');if(i>0)A[a.slice(0,i)]=a.slice(i+1);}
const DODGE=A.dodge==null?1:+A.dodge,CID=A.cls||'pyro',DIR=A.dir||'',ZN=+(A.zones||2),MAXM=+(A.min||40),SEED=+(A.seed||4242);
const OUT=A.out||path.join(__dirname,'res','run_'+(DIR||'new')+'_'+CID+'_z'+ZN+'.json');
fs.mkdirSync(path.join(__dirname,'res'),{recursive:true});
(async()=>{let res=null;await withBrowser('waves-'+CID,async(b,BASE)=>{const g=await openGame(b,BASE,DIR,{seed:SEED});const t0=Date.now();
  await g.E(START(CID));await g.waitF("mode==='game'",15000);await g.E(FREEZE);
  await g.E(`(()=>{S.autoLu=true;S.autoBest=true;S.autoRank=true;S.auto=true;
    const NEW=typeof WV!=='undefined';
    const MID=[15,46,73,110,175,262];const ANG=1.4,ca=Math.cos(ANG),sa=Math.sin(ANG);
    window.__rar=()=>{const c=[0,0,0,0,0];for(const id of equippedIds()){const sk=SKILLS[id];c[isImp(id)?4:Math.min(3,rarOf(sk))]++;}return c.join('/');};
    window.__RS={calm:{t:0,k:0,minHp:1,firstK:null},rarAt:{},NEW,z:0,deaths:0,sec:0,lv:{1:0},samp:0,sum:0,max:0,wsum:0,wn:0,wmax:0,waves:[],ph:[],cur:null,last:'',bosses:0,kills0:S.kills,xpAt:{}};
    if(!window.__d0){window.__d0=die;window.__bd0=bossDown;}
    die=function(){__RS.deaths++;if(__RS.cur)__RS.cur.deaths++;P.dead=true;P.hp=0;};
    bossDown=function(en){__RS.bosses++;return __bd0.apply(this,arguments);};
    // «игрок с умом»: через 0,3 с после появления красной зоны удара выходит из неё (15 % зон пропускает)
    window.__dodge=${DODGE}?()=>{if(P.dead)return;let mx=0,mz=0,h=0;for(const t of TELE){if(t.cancel||t.t<.3)continue;if(t.__m==null)t.__m=Math.random()<.15;if(t.__m||!inTele(t,P.pos.x,P.pos.z,.7))continue;h++;let ax=P.pos.x-t.x,az=P.pos.z-t.z;
      if(t.shape==='rect'){const cr=ax*t.dir.z-az*t.dir.x,sg=cr>=0?1:-1;ax=t.dir.z*sg;az=-t.dir.x*sg;}const l=Math.hypot(ax,az)||1;mx+=ax/l;mz+=az/l;}
      if(h){const l=Math.hypot(mx,mz)||1,st=P.speed/60;P.pos.x+=mx/l*st;P.pos.z+=mz/l*st;P.prev.copy(P.pos);}}:null;
    window.__pol=()=>{const R=__RS;R.sec++;if(P.dead){S.ess-=Math.floor(S.ess*.2);revive();$('#dead').hidden=true;}
      if(NEW&&R.z===0){const v0=wvView();if(v0.z===0&&v0.p===0){R.calm.t++;R.calm.k=S.kills-R.kills0;if(R.calm.k>0&&R.calm.firstK==null)R.calm.firstK=R.sec;R.calm.minHp=Math.min(R.calm.minHp,+(Math.max(0,P.hp)/P.maxHp).toFixed(2));}}
      if(R.sec%120===0)R.rarAt[R.sec/60]={lv:S.lvl,rar:__rar()};
      const n=aliveCount();R.samp++;R.sum+=n;R.max=Math.max(R.max,n);
      if(NEW){const v=wvView(),key=v.z+':'+v.p+':'+v.w+':'+v.s;
        if(v.s===2){R.wsum+=n;R.wn++;R.wmax=Math.max(R.wmax,n);}
        if(key!==R.last){R.last=key;R.chg=R.sec;R.ph.push({t:R.sec,z:v.z,p:v.p,w:v.w,s:v.s,lv:S.lvl});
          if(v.s===2&&!R.cur)R.cur={z:v.z,w:v.w+1,t0:R.sec,lv0:S.lvl,deaths:0,max:0,minHp:1,N:v.N,rar:__rar()};
          if(v.s!==2&&R.cur){const c=R.cur;c.t=R.sec-c.t0;c.lv1=S.lvl;c.ok=v.w>=c.w||v.p===3;R.waves.push(c);R.cur=null;}}
        if(R.cur){R.cur.max=Math.max(R.cur.max,n);R.cur.minHp=Math.min(R.cur.minHp,+(Math.max(0,P.hp)/P.maxHp).toFixed(2));}
        const st=S.wv&&S.wv[R.z];if(st&&st.p===3&&R.z<${ZN}-1){R.z++;}}
      else{if(R.sec>=300*(R.z+1)&&R.z<${ZN}-1)R.z++;}
      // враг есть, но дальше 11 м (стрелок держит дистанцию) — идёт к нему; врагов нет — возвращается в середину края
      let b=null,bd=1e9;for(const e of ENEMIES){if(e.dead)continue;const q=Math.hypot(e.pos.x-P.pos.x,e.pos.z-P.pos.z);if(q<bd){bd=q;b=e;}}
      const tgR=MID[R.z],tX=ca*tgR,tZ=sa*tgR;if(b&&Math.hypot(b.pos.x-tX,b.pos.z-tZ)>22)b=null; // далеко от своей точки за врагами не бегает
      const off=Math.hypot(P.pos.x-tX,P.pos.z-tZ);if(off>${+(A.leash||18)}){const st=Math.min(off,P.speed);P.pos.x+=(tX-P.pos.x)/off*st;P.pos.z+=(tZ-P.pos.z)/off*st;P.prev.copy(P.pos);b=null;bd=0;} // ушёл от своей точки дальше 18 м — назад
      else if(b&&bd>11&&bd<45){const st=Math.min(bd-9,P.speed);P.pos.x+=(b.pos.x-P.pos.x)/bd*st;P.pos.z+=(b.pos.z-P.pos.z)/bd*st;P.prev.copy(P.pos);}
      else if(!b||bd>=45){const r=Math.hypot(P.pos.x,P.pos.z),tg=MID[R.z],tx=ca*tg,tz=sa*tg,dd=Math.hypot(tx-P.pos.x,tz-P.pos.z);if(dd>.6){const st=Math.min(dd,P.speed);P.pos.x+=(tx-P.pos.x)/dd*st;P.pos.z+=(tz-P.pos.z)/dd*st;P.prev.copy(P.pos);}}
      if(!R.lv[S.lvl])R.lv[S.lvl]=R.sec;
      if(R.sec%10===0){try{upgradeBuildRanks();}catch(e){}}
      if(R.sec%30===0){try{const n0=tpSpent();autoTalents(S.lvl+2);if(tpSpent()!==n0)onTalentsChanged();}catch(e){}}};
    return true;})()`);
  let done=false,min=0;
  while(!done&&min<MAXM){const r=await g.E(`(()=>{for(let s=0;s<120;s++){__pol();__step(1);}
      const R=__RS,st=R.NEW&&S.wv?S.wv[${ZN}-1]:null;return {sec:R.sec,L:S.lvl,z:R.z,deaths:R.deaths,alive:aliveCount(),ph:R.NEW?JSON.stringify(wvView()):'',done:R.NEW?!!(st&&st.p===3):R.sec>=300*${ZN}};})()`);
    min=r.sec/60;done=r.done;const stall=await g.E('__RS.sec-(__RS.chg||0)');if(stall>(+A.stall||300)){console.log('ЗАСТРЯЛ',stall,'с:',await g.E(`JSON.stringify({paused,lu:luOpen,luQ:luQueue,bk:bookOpen,deadUi:!$('#dead').hidden,time:+time.toFixed(1),q:WV.q,st:WV.st,id:WV.id,lastT:WV.lastT,BOSS:BOSS&&[BOSS.tid,BOSS.dead,ENEMIES.includes(BOSS)],P:[P.pos.x|0,P.pos.z|0],dead:P.dead,en:ENEMIES.map(e=>({t:e.tid,w:e.wvW,d:e.dead,hp:Math.round(e.hp),mx:e.maxHp,x:+e.pos.x.toFixed(2),z:+e.pos.z.toFixed(2),ag:e.aggro,L:e.wvLast,far:e.wvFar,b:e.boss,st:+e.stun.toFixed(1),bz:+e.busy.toFixed(1),ta:!!e.tauntS,fear:e.nfFear?+(e.nfFear-time).toFixed(1):null,mv:!!e.mv,hop:!!e.hop,hunt:e.hunt,nd:e.noDespawn,fz:+e.frozenT.toFixed(1),ch:e.champ,el:e.elite}))})`));break;}if(A.dump&&min>=+A.dump){console.log(await g.E(`JSON.stringify({q:WV.q,st:WV.st,id:WV.id,lastT:WV.lastT,BOSS:BOSS&&BOSS.tid,P:[P.pos.x|0,P.pos.z|0],en:ENEMIES.map(e=>({t:e.tid,w:e.wvW,d:e.dead,hp:Math.round(e.hp),mx:e.maxHp,x:e.pos.x|0,z:e.pos.z|0,ag:e.aggro,st:+e.stun.toFixed(1),bz:+e.busy.toFixed(1),L:e.wvLast,far:e.wvFar,fz:e.frozenT>0,rm:!!e.remote}))})`));break;}console.log(CID,DIR||'new','мин',min.toFixed(1),'ур',r.L,'край',r.z,'смертей',r.deaths,'живых',r.alive,r.ph,'('+Math.round((Date.now()-t0)/1000)+' с)');
    if(Date.now()-t0>560000){console.log('стоп по времени прогона');break;}}
  res=await g.E(`(()=>{const R=__RS;return {cls:'${CID}',dir:'${DIR||'new'}',sec:R.sec,lvl:S.lvl,deaths:R.deaths,bosses:R.bosses,kills:S.kills-R.kills0,calm:R.calm,rarAt:R.rarAt,rarEnd:__rar(),aliveAvg:+(R.sum/R.samp).toFixed(1),aliveMax:R.max,
    waveAliveAvg:R.wn?+(R.wsum/R.wn).toFixed(1):null,waveAliveMax:R.wmax,lv:R.lv,ph:R.ph,waves:R.waves};})()`);
  res.errs=g.errs;fs.writeFileSync(OUT,JSON.stringify(res,null,1));
  await g.E(`die=__d0;bossDown=__bd0;S.auto=false;toSelect();true`);await g.ctx.close();});
  console.log('итог',JSON.stringify({cls:res.cls,dir:res.dir,min:+(res.sec/60).toFixed(1),lvl:res.lvl,deaths:res.deaths,bosses:res.bosses,kills:res.kills,aliveAvg:res.aliveAvg,aliveMax:res.aliveMax,waveAliveAvg:res.waveAliveAvg,waveAliveMax:res.waveAliveMax,errs:res.errs.length}));
  if(res.errs.length)console.log(res.errs.slice(0,5));})().catch(e=>{console.error(e);process.exit(1);});
