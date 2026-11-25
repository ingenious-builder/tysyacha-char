// Задача для _check/rev3/fx.js: почему «Сила» в строке характеристик листа (pwr) и «Сила … =» в разбивке (powerBreak) расходятся.
// На новой и базовой странице: pwr, skPower, разбивка и её части по шагам. node _check/rev3/fx.js _check/rev3/v3_pwdbg_task.js <страница>
module.exports=async({ev,log})=>{const out={};
  for(const [c,id] of [['pyro',1],['cryo',192],['hemo',1257],['bers',1248]]){
    out[c]=await ev(`(()=>{selectClass('${c}');startGame();const R0=Math.random;Math.random=mpRng(77);try{clearWorld();runFresh(160);}finally{Math.random=R0;}S.talents={};computeStats();recalcStats();onBuildChanged();
      openBook('tal');showTab('tal');$('#tpAuto').click();showTab('lib');const sk=SKILLS[${id}];const r={};
      r.sp1=Math.round(skParts(sk,false).pw);r.pwr=Math.round(pwr(sk));r.skPower=Math.round(skPower(sk));const b=powerBreak(sk);r.total=Math.round(b.total);r.sp2=Math.round(skParts(sk,false).pw);
      r.parts={base:+b.base.toFixed(1),rank:b.rank,imp:b.imp,slot:+b.slot.toFixed(3),lvl:+b.lvl.toFixed(3),tal:+b.tal.toFixed(3),cap:b.cap!=null?+b.cap.toFixed(3):'нет',reso:+b.reso.toFixed(3),react:+b.react.toFixed(3)};
      r.prod=Math.round(b.base*b.rank*b.imp*b.slot*b.lvl*b.tal*b.reso*b.react);r.resoSk=+resoMul(sk).toFixed(3);r.react2=+reactVal(sk.e,RESO_N).toFixed(3);r.eq=EQUIPPED.has(sk.id);
      // разбивка без талантов (lv) и снова с талантами: остаются ли ST и P одинаковыми
      const st0=JSON.stringify(ST);const kt=S.talents;S.talents={};computeStats();const lv=skParts(sk,false).pw;S.talents=kt;computeStats();r.stSame=st0===JSON.stringify(ST);r.lv=Math.round(lv);
      if(!r.stSame){const a=JSON.parse(st0);r.stDiff=Object.keys(ST).filter(k=>JSON.stringify(a[k])!==JSON.stringify(ST[k])).map(k=>k+':'+JSON.stringify(a[k])+'→'+JSON.stringify(ST[k])).slice(0,6);}
      return r;})()`);log(c,JSON.stringify(out[c]));}
  return out;};
