// живой бой в настоящем цикле игры: каждый класс (CLS env или все 20) — билд уровня LV (60), общие таланты «Авто», ветка класса на максимуме,
// автобой SEC (15) с настоящим появлением врагов; ошибки страницы, NaN у героя и особенности, срабатывания особенности (всплывающие строки)
module.exports=async({ev,page,errs,log,stand})=>{await stand();const LV=+(process.env.LV||60),SEC=+(process.env.SEC||15),out={};
  const cls=process.env.CLS?process.env.CLS.split(','):await ev(`CLASSES.map(c=>c.id)`);
  for(const c of cls){const e0=errs.length;
    await ev(`(()=>{bookOpen=true;__rst.build('${c}',${LV},7);S.talents={};autoTalents();for(const t of CT_TAL['${c}'])S.talents[t.id]=t.max;computeStats();recalcStats();cfReset();
      P.hp=P.maxHp;P.mp=P.maxMp;P.dead=false;clearWorld();spawnT=0;bookOpen=false;paused=false;window.__lp={};const K0=ctProc;window.__lpK0=K0;
      ctProc=function(p,t){const k=String(t).replace(/[\\s×+\\-−·]*[\\d.,]+.*$/,'').trim();__lp[k]=(__lp[k]||0)+1;return K0.apply(this,arguments);};
      if(!S.auto)$('#autoBtn').click();return 1;})()`);
    const k0=await ev(`S.kills|0`);let nan=0,dead=0,hud='';
    for(let s=0;s<SEC;s++){await page.waitForTimeout(1000);
      const st=await ev(`(()=>{if(luOpen&&$('#luAuto'))$('#luAuto').click();const bad=[P.hp,P.mp,P.maxHp,P.speed,P.shield].some(v=>typeof v!=='number'||!isFinite(v))||Object.entries(CT).some(([k,v])=>typeof v==='number'&&!isFinite(v));
        const d=P.dead;if(P.dead){P.dead=false;P.hp=P.maxHp;}return {bad,d,hud:ctBar.textContent||''};})()`);
      if(st.bad)nan++;if(st.d)dead++;hud=st.hud||hud;}
    const r=await ev(`(()=>{ctProc=window.__lpK0;return {kills:(S.kills|0),lvl:S.lvl,mode,tal:CT_TAL['${c}'].map(t=>S.talents[t.id]|0).join(''),proc:window.__lp};})()`);
    out[c]={errs:errs.length-e0,nan,dead,kills:r.kills-k0,mode:r.mode,tal:r.tal,hud:hud.slice(0,60),proc:r.proc};log(c,JSON.stringify(out[c]).slice(0,300));}
  const tot={classes:Object.keys(out).length,errs:0,nan:0};for(const c in out){tot.errs+=out[c].errs;tot.nan+=out[c].nan;}
  if(process.env.OUT)require('fs').writeFileSync(process.env.OUT,JSON.stringify({tot,out},null,1));return tot;};
