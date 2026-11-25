// Живой бой вдвоём (два контекста, реальное время): хост и гость в автобое, оба уходят из красных зон ударов (15 % пропускают),
// гость держится рядом с хостом. «Тихая опушка», герои 10-го ур.: волны 1–3 (3-я — с боссом) подряд, как в игре.
// node coop_fight.js [hostCls] [guestCls] [lvl] [z] [w0] [n]
const fs=require('fs'),path=require('path');const {withBrowser,sleep,gate}=require('./lib.js');
const HC=process.argv[2]||'paladin',GC=process.argv[3]||'pyro',LV=+(process.argv[4]||10),Z=+(process.argv[5]||0),W0=+(process.argv[6]||0),NW=+(process.argv[7]||3);
const out={host:HC,guest:GC,lvl:LV,z:Z,waves:[]};
const DODGE=`window.__dg&&clearInterval(window.__dg);window.__dg=setInterval(()=>{if(P.dead||mode!=='game')return;let mx=0,mz=0,h=0;for(const t of TELE){if(t.cancel||t.t<.3)continue;if(t.__m==null)t.__m=Math.random()<.15;if(t.__m||!inTele(t,P.pos.x,P.pos.z,.7))continue;h++;let ax=P.pos.x-t.x,az=P.pos.z-t.z;
  if(t.shape==='rect'){const cr=ax*t.dir.z-az*t.dir.x,sg=cr>=0?1:-1;ax=t.dir.z*sg;az=-t.dir.x*sg;}const l=Math.hypot(ax,az)||1;mx+=ax/l;mz+=az/l;}
  if(h){const l=Math.hypot(mx,mz)||1;input.moveTo={x:P.pos.x+mx/l*2.5,z:P.pos.z+mz/l*2.5};}},60);true`;
(async()=>{await withBrowser('waves-coopfight',async(b,BASE)=>{
  const mk=async(nick,qs)=>{const ctx=await gate.phoneContext(b,{w:440,h:956});await ctx.addInitScript(n=>{try{localStorage.setItem('tysyacha-nick',n);}catch(e){}},nick);
    const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(String(e).slice(0,300)));p.E=c=>p.evaluate(x=>window.__ev(x),c);
    await p.goto(BASE+(qs||'?test=1&debug'));
    for(let i=0;i<120;i++){try{if(await p.evaluate(()=>!!window.__ev&&typeof CLS!=='undefined'&&!!document.querySelector('#selCoop')))break;}catch(e){}await sleep(250);}
    await sleep(800);return p;};
  const W=async(p,e,ms)=>{const t=Date.now();while(Date.now()-t<(ms||30000)){try{if(await p.E(e))return true;}catch(x){}await sleep(250);}return false;};
  const A=await mk('Хост');await A.E(`selectClass('${HC}')`);await A.click('#selCoop');await sleep(600);
  if(await A.isVisible('[data-a=create]').catch(()=>false))await A.click('[data-a=create]');
  await A.waitForSelector('#lobPanel',{timeout:30000});const code=await A.E('MP.code');
  for(const s of ['.share-x','[data-a=closeinv]']){const e=await A.$(s);if(e)await e.click().catch(()=>{});}
  const B=await mk('Гость','?room='+code+'&test=1&debug');
  if(await B.isVisible('#nickIn').catch(()=>false)){await B.fill('#nickIn','Гость');await B.click('#nickOk');await sleep(300);}
  await B.E(`selectClass('${GC}')`);await sleep(500);await B.click('#selJoin');
  if(!(await W(A,'!!(MP.peer&&MP.peerId)',90000)&&await W(B,'!!(MP.peer&&MP.peerId)',60000)))throw new Error('нет связи');
  await W(A,'LOB.on&&!!LOB.ph',20000);await W(B,'LOB.on&&!!LOB.ph',20000);await sleep(800);
  await A.click('[data-l=mode][data-m=world]').catch(()=>{});await sleep(400);await B.click('[data-l=rdy]');await sleep(500);await A.click('[data-l=rdy]');await sleep(800);
  await A.click('[data-l=go]');await sleep(600);if(await A.$('.lob-warn'))await A.click('[data-l=go]').catch(()=>{});
  if(!(await W(A,"mode==='game'&&PLAY==='world'",40000)&&await W(B,"mode==='game'&&PLAY==='world'",40000)))throw new Error('не вошли в игру');
  await sleep(2000);
  for(const p of [A,B])await p.E(`S.autoLu=true;S.autoBest=true;S.autoRank=true;while(S.lvl<${LV}){gainXp(xpNeed(S.lvl)-S.xp+1);luAutoRun(luQueue);}try{autoTalents(S.lvl+2);onTalentsChanged();upgradeBuildRanks();}catch(e){}P.hp=P.maxHp;P.mp=P.maxMp;luQueue=0;S.auto=true;true`);
  for(const p of [A,B])await p.E(DODGE);
  const R=[15,46,73,110,175][Z]||15;
  await A.E(`clearWorld();P.pos.set(0,0,${R});P.prev.copy(P.pos);__tc.wvSet(${Z},2,0,${W0});WV.cd=4;window.__dn=0;window.__home&&clearInterval(window.__home);window.__home=setInterval(()=>{if(P.dead)return;const d=Math.hypot(P.pos.x,P.pos.z-${R});if(d>10)input.moveTo={x:0,z:${R}};},500);const d0=die;die=function(){__dn++;return d0.apply(this,arguments);};true`);
  await B.E(`P.pos.set(-2,0,${R-5});P.prev.copy(P.pos);window.__dn=0;const d0=die;die=function(){__dn++;return d0.apply(this,arguments);};
    window.__fol&&clearInterval(window.__fol);window.__fol=setInterval(()=>{if(!MP.peer||P.dead)return;const q=MP.peer.pos,d=Math.hypot(q.x-P.pos.x,q.z-P.pos.z);if(d>11)input.moveTo={x:q.x-3,z:q.z-3};},500);true`);
  for(let k=0;k<NW;k++){const w=W0+k+1;
    if(!await W(A,`wvView().s===2&&wvView().w===${w-1}`,40000)){console.log('волна',w,'не началась',await A.E("JSON.stringify({v:wvView(),st:WV.st,cd:WV.cd,paused,lu:luOpen,dead:P.dead,peer:mpPeerUp(),mode,PLAY,t:time})"),await B.E("JSON.stringify({g:WV.g,paused,lu:luOpen})"));break;}
    const t0=Date.now();let minA=1,minB=1,maxN=0;const d0=[await A.E('__dn'),await B.E('__dn')];let ok=false;
    while(Date.now()-t0<240000){await sleep(700);const a=await A.E(`(()=>{const v=wvView();return [v.s,v.w,P.hp/P.maxHp,aliveCount()];})()`),bb=await B.E('P.hp/P.maxHp');
      minA=Math.min(minA,a[2]);minB=Math.min(minB,bb);maxN=Math.max(maxN,a[3]);if(a[1]>=w){ok=true;break;}if(a[0]!==2&&a[1]<w&&Date.now()-t0>3000){break;}}
    const d1=[await A.E('__dn'),await B.E('__dn')];
    const r={w,sec:Math.round((Date.now()-t0)/1000),ok,downsHost:d1[0]-d0[0],downsGuest:d1[1]-d0[1],minHpHost:+minA.toFixed(2),minHpGuest:+minB.toFixed(2),maxAlive:maxN,lvl:[await A.E('S.lvl'),await B.E('S.lvl')]};
    out.waves.push(r);console.log(JSON.stringify(r));
    if(!ok){await W(A,`wvView().s===1`,20000);k--;if(out.waves.length>NW+3)break;}}
  out.errsA=A.errs;out.errsB=B.errs;console.log('ошибки',A.errs.slice(0,3),B.errs.slice(0,3));
  for(const p of [A,B])await p.context().close().catch(()=>{});
},{launch:{args:[...gate.ARGS,'--enable-features=WebRtcHideLocalIpsWithMdns:disabled','--disable-features=WebRtcHideLocalIpsWithMdns']}});
  fs.writeFileSync(path.join(__dirname,'res','coopfight_'+HC+'_'+GC+'_z'+Z+'.json'),JSON.stringify(out,null,1));})().catch(e=>{console.error(e);process.exit(1);});
