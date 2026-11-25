// Задача для _check/rev3/fx.js (страница index.html): старое сохранение v13.29, «Сила» листа против разбивки, живой бой без ошибок и NaN,
// фактическая доля «Кровавого вихря» и «Ледяной руны», время пересчёта потолка талантов после смены уровня, «Токсин» у гостя.
// node _check/rev3/fx.js _check/rev3/v3_live_task.js index.html 440 956
const path=require('path'),fs=require('fs');
module.exports=async({ev,page,errs,log})=>{const out={};const wait=()=>page.waitForFunction(()=>window.__ev&&window.__tc,null,{timeout:60000});
  const url=page.url().replace(/index\.html.*/,'');
  // ---------- A. старое сохранение: делаем его настоящей v13.29 (7da02f9) ----------
  await page.goto(url+'index_base.html?debug&test=1');await wait();
  const old=await ev(`(()=>{const mk=(c,L)=>{selectClass(c);startGame();const R0=Math.random;Math.random=mpRng(5);try{clearWorld();runFresh(L);}finally{Math.random=R0;}
      S.talents={};computeStats();recalcStats();openBook('tal');showTab('tal');$('#tpAuto').click();S.imp=[...CLS.pool].slice(0,1);save();return JSON.parse(JSON.stringify(S));};
    const a=mk('cryo',160),b=mk('bers',60),c=mk('windr',120);return {TAL_VER,json:localStorage.getItem(SAVE_KEY),a:{tal:a.talents,lvl:a.lvl,nL:a.learned.length,nR:Object.keys(a.ranks).length,imp:a.imp,mx:a.mx,act:a.active,pas:a.passive.filter(x=>x!=null).length}};})()`);
  out.oldVer=old.TAL_VER;const sv=JSON.parse(old.json);log('старое сохранение: TAL_VER',old.TAL_VER,'классы',Object.keys(sv.chars).join(','),'cryo таланты',JSON.stringify(sv.chars.cryo.talents).slice(0,200));
  await page.goto(url+'index.html?debug&test=1');await wait();
  out.save=await ev(`(()=>{const sv=${old.json};const r={};for(const c of ['cryo','bers','windr']){const o=sv.chars[c],n=SAVE.chars[c];
      r[c]={talV_old:o.talV,talOld:Object.values(o.talents).reduce((a,b)=>a+b,0),talNew:n?Object.keys(n.talents).length:-1,note:n&&n.talNote,lvl:[o.lvl,n&&n.lvl],learned:[o.learned.length,n&&n.learned.length],
        ranks:[Object.keys(o.ranks).length,n&&Object.keys(n.ranks).length],imp:[JSON.stringify(o.imp),n&&JSON.stringify(n.imp)],mx:[o.mx,n&&n.mx],active:JSON.stringify(o.active)===JSON.stringify(n&&n.active),
        passive:JSON.stringify(o.passive)===JSON.stringify(n&&n.passive),book:[(o.book||[]).length,n&&(n.book||[]).length],kills:[o.kills,n&&n.kills],ess:[o.ess,n&&n.ess]};}
    selectClass('cryo');startGame();openBook('tal');showTab('tal');renderTalents();r.hint=$('#tpHint').textContent;r.free=tpFree();r.lvl=S.lvl;$('#tpAuto').click();r.spent=tpSpent();r.cls=CT_TAL.cryo.map(t=>T(t.id)).join('');save();return r;})()`);
  await page.reload();await wait();
  out.save.after=await ev(`(()=>{const j=JSON.parse(localStorage.getItem(SAVE_KEY));selectClass('cryo');startGame();openBook('tal');showTab('tal');renderTalents();return {talV:j.chars.cryo.talV,spent:Object.values(j.chars.cryo.talents).reduce((a,b)=>a+b,0),note:j.chars.cryo.talNote,hint:$('#tpHint').textContent.slice(0,80),bersNote:j.chars.bers.talNote,bersTal:Object.keys(j.chars.bers.talents).length};})()`);
  log('сохранение',JSON.stringify(out.save));
  // ---------- B. «Сила» в листе (pwr) против разбивки (powerBreak) ----------
  out.pw={};for(const c of ['pyro','cryo','bers','hemo','plague']){out.pw[c]=await ev(`(()=>{selectClass('${c}');startGame();const R0=Math.random;Math.random=mpRng(77);try{clearWorld();runFresh(160);}finally{Math.random=R0;}
      S.talents={};computeStats();recalcStats();onBuildChanged();openBook('tal');showTab('tal');$('#tpAuto').click();showTab('lib');
      let mx=0,mxF=0,ex=null;for(const id of [...CLS.pool].filter(isLearned)){const sk=SKILLS[id],a=pwr(sk),b=powerBreak(sk).total,c=skPower(sk);const d=Math.abs(a/b-1),e=Math.abs(c/b-1);if(d>mx){mx=d;ex={id,name:skName(sk),pwr:Math.round(a),total:Math.round(b),fresh:Math.round(c)};}mxF=Math.max(mxF,e);}
      return {maxCached:+mx.toFixed(4),maxFresh:+mxF.toFixed(4),ex};})()`);log('Сила листа против разбивки',c,JSON.stringify(out.pw[c]));}
  // ---------- C. «Кровавый вихрь» и «Ледяная руна»: какая доля удара на самом деле уходит соседу ----------
  out.splash=await ev(`(()=>{const res={};const pair=()=>{clearWorld();spawnT=1e9;const a=spawnEnemy('goblin',P.pos.x+1.5,P.pos.z,160,{}),b=spawnEnemy('goblin',P.pos.x+1.5,P.pos.z+1.6,160,{});
      for(const e of [a,b]){e.hp=e.maxHp=1e12;e.affix=new Set();e.t=Object.assign({},e.t,{block:false});e.marks={};}return [a,b];};
    const full=c=>{selectClass(c);startGame();S.lvl=160;const t={};for(const x of TALENTS)t[x.id]=x.max;for(const x of CT_TAL[c])t[x.id]=x.max;S.talents=t;computeStats();recalcStats();cfReset();RESO.fill(1);ST.crit=0;};
    full('bers');{const [a,b]=pair();CT.frenzyT=time+5;CT.frenzyOn=1;CT.rage=100;const h0=b.hp;const ha=a.hp;dealDamage(a,1000,EL.blood,{basic:true});const da=ha-a.hp,db=h0-b.hp;
      res.bers={hit:Math.round(da),splash:Math.round(db),share:+(db/da).toFixed(3),text:CT_TAL.bers.find(x=>x.id==='be_end').d(1)};}
    full('dk');{const [a,b]=pair();CT.dkRuneT=time+1;const ha=a.hp,h0=b.hp;dealDamage(a,1000,EL.ice,{basic:true});const da=ha-a.hp,db=h0-b.hp;res.dk={hit:Math.round(da),splash:Math.round(db),share:+(db/da).toFixed(3),text:CT_TAL.dk.find(x=>x.id==='dk_frost').d(3)};}
    return res;})()`);log('доля по соседу',JSON.stringify(out.splash));
  // ---------- D. «Токсин»: удар по отравленному у хоста (слои известны) и у гостя (у копии врага слоёв нет) ----------
  out.tox=await ev(`(()=>{selectClass('plague');startGame();S.lvl=160;const t={};for(const x of CT_TAL.plague)t[x.id]=x.max;S.talents=t;computeStats();recalcStats();cfReset();
    const e=spawnEnemy('goblin',P.pos.x+3,P.pos.z,160,{});e.poisT=1;e.poisN=15;const host=cfDmgOut0(e,EL.earth,{sk:SKILLS[S.active.find(x=>x!=null)]},100);e.poisN=0;const guest=cfDmgOut0(e,EL.earth,{sk:SKILLS[S.active.find(x=>x!=null)]},100);
    return {host15:+host.toFixed(3),guestProxy:+guest.toFixed(3)};})()`);log('Токсин хост/гость',JSON.stringify(out.tox));
  // ---------- E. пересчёт потолка после смены уровня (холодный кэш) ----------
  out.tq={};for(const c of ['pyro','necro','alch']){out.tq[c]=await ev(`(()=>{selectClass('${c}');startGame();const R0=Math.random;Math.random=mpRng(9);try{clearWorld();runFresh(159);}finally{Math.random=R0;}S.talents={};computeStats();recalcStats();openBook('tal');showTab('tal');$('#tpAuto').click();bookOpen=false;
      const ids=[...EQUIPPED];S.lvl=160;computeStats();const t0=performance.now();talQ(SKILLS[ids[0]]);const t1=performance.now();for(const id of ids)talQ(SKILLS[id]);const t2=performance.now();
      return {first:+(t1-t0).toFixed(1),build:+(t2-t1).toFixed(1),pool:CLS.pool.size||[...CLS.pool].length};})()`);}
  log('пересчёт потолка, мс',JSON.stringify(out.tq));
  // ---------- F. живой бой: классы, полная ветка и общие на максимуме, NaN-сторож ----------
  await ev(`window.__nan=[];(()=>{const F0=float;float=function(p,t,c,s){if(/NaN|undefined|Infinity/.test(String(t)))__nan.push('float:'+t);return F0.apply(this,arguments);};})();true`);
  out.live={};const LIVE=(process.env.LIVE||'pyro,cryo,storm,plague,necro,paladin,windr,hemo,bers,dk,druid,hunter,assassin,shaman,monk,lock,inq,alch,geo,arcan').split(',');
  for(const c of LIVE)for(const L of (process.env.LIVEL||'160,40').split(',').map(Number)){
    await ev(`(()=>{if(window.__keep)clearInterval(__keep);if(window.__chk)clearInterval(__chk);selectClass('${c}');startGame();const R0=Math.random;Math.random=mpRng(3);try{clearWorld();runFresh(${L});}finally{Math.random=R0;}
      const t={};for(const x of TALENTS)t[x.id]=Math.min(x.max,${L>=100?99:1});for(const x of CT_TAL['${c}'])t[x.id]=x.max;S.talents=t;computeStats();recalcStats();onBuildChanged();cfReset();P.hp=P.maxHp;
      clearWorld();bookOpen=false;if(!S.auto)$('#autoBtn').click();__nan.length=0;window.__k0=S.kills;
      window.__keep=setInterval(()=>{spawnT=1e9;let n=0;for(const e of ENEMIES)if(!e.dead)n++;for(;n<9;n++){const a=Math.random()*6.28,d=5+Math.random()*4;const e=spawnEnemy('goblin',P.pos.x+Math.cos(a)*d,P.pos.z+Math.sin(a)*d,${L},{aggro:true});e.aggro=true;}if(P.dead){P.dead=false;P.hp=P.maxHp;}},250);
      window.__chk=setInterval(()=>{const bad=[];for(const k of ['hp','mp','maxHp','maxMp','shield'])if(P[k]!=null&&!isFinite(P[k]))bad.push('P.'+k);for(const e of ENEMIES)if(!isFinite(e.hp)||!isFinite(e.burnDps||0)||!isFinite(e.poisDps||0))bad.push('en:'+e.tid);
        for(const k in CT)if(typeof CT[k]==='number'&&!isFinite(CT[k])&&Math.abs(CT[k])!==Infinity)bad.push('CT.'+k);const tx=ctBar.textContent;if(/NaN|undefined/.test(tx))bad.push('HUD:'+tx);for(const k in ST)if(typeof ST[k]==='number'&&isNaN(ST[k]))bad.push('ST.'+k);if(bad.length)__nan.push(...bad);},200);return 1;})()`);
    await page.waitForTimeout(+(process.env.SEC||6)*1000);
    out.live[c+L]=await ev(`(()=>{clearInterval(__keep);clearInterval(__chk);return {kills:S.kills-__k0,nan:[...new Set(__nan)].slice(0,6),hud:ctBar.textContent.slice(0,60)};})()`);
    log('бой',c,L,JSON.stringify(out.live[c+L]));}
  out.errs=[...new Set(errs)].slice(0,10);fs.writeFileSync(path.join(__dirname,'live.json'),JSON.stringify(out,null,1));
  const nanN=Object.values(out.live).filter(x=>x.nan.length).length;log('ИТОГ живого боя: с NaN',nanN,'из',Object.keys(out.live).length,'ошибок страницы',errs.length);return {nanN,errs:errs.length};};
