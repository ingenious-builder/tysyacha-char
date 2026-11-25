// задача для fx: порядок редкостей по показанной силе (skParts) в ЖИВОЙ игре: особенность класса включена, мана и здоровье героя живые,
// таланты — «Авто» забега уровня L; частота кастов и клон — стандартные (как b_ui.js: без билда). Тот же ранг (1-й против 1-го) и 5-й ранг низшей против 1-го высшей. env: LV (50,160), OUT
module.exports=async({ev,log})=>{const out={};const LV=(process.env.LV||'50,160').split(',').map(Number);let tot={n:0,same:0,r5:0};
  const cls=await ev(`CLASSES.map(c=>c.id)`);
  for(const c of cls)for(const L of LV){const r=await ev(`(()=>{bookOpen=true;selectClass('${c}');startGame();const R0=Math.random;Math.random=mpRng(${31+L});try{clearWorld();runFresh(${L});}finally{Math.random=R0;}
      computeStats();recalcStats();PWC=new Map();const I=rarInfo(),ids=[...CLS.pool];const keepE=EQUIPPED,keepN=RESO_N.slice(),kc=CR_OVR,kl=CLONE_OVR;EQUIPPED=new Set();RESO_N.fill(0);CR_OVR=1;CLONE_OVR=true;PWC=new Map();
      const pw=(id,rk)=>{const kr=S.ranks;S.ranks=rk>1?{[id]:rk}:{};try{return skParts(SKILLS[id],false).pw;}finally{S.ranks=kr;}};let n=0,same=0,r5=0,mS=9,m5=9,sa=0,r5a=0;const af=id=>typeof ctAff==='function'?ctAff(SKILLS[id]):1;
      try{for(const act of [true,false])for(let r=0;r<3;r++){const lo=ids.filter(id=>SKILLS[id].active===act&&(I.map.get(id)|0)===r),hi=ids.filter(id=>SKILLS[id].active===act&&(I.map.get(id)|0)===r+1);if(!lo.length||!hi.length)continue;n++;
        const h1=Math.min(...hi.map(id=>pw(id,1))),l1=Math.max(...lo.map(id=>pw(id,1))),l5=Math.max(...lo.map(id=>pw(id,5)));mS=Math.min(mS,h1/l1);m5=Math.min(m5,h1/l5);if(h1<l1)same++;if(h1<l5)r5++;
        const H1=Math.min(...hi.map(id=>pw(id,1)*af(id))),L1=Math.max(...lo.map(id=>pw(id,1)*af(id))),L5=Math.max(...lo.map(id=>pw(id,5)*af(id)));if(H1<L1)sa++;if(H1<L5)r5a++;}}
      finally{EQUIPPED=keepE;for(let i=0;i<10;i++)RESO_N[i]=keepN[i];CR_OVR=kc;CLONE_OVR=kl;PWC=new Map();}
      return {n,same,r5,sa,r5a,mS:+mS.toFixed(3),m5:+m5.toFixed(3),ct:CT_ON};})()`);out[c+L]=r;tot.n+=r.n;tot.same+=r.same;tot.r5+=r.r5;tot.sa=(tot.sa||0)+r.sa;tot.r5a=(tot.r5a||0)+r.r5a;if(r.same||r.r5)log(c,L,JSON.stringify(r));}
  const ms=Math.min(...Object.values(out).map(x=>x.mS)),m5=Math.min(...Object.values(out).map(x=>x.m5));
  log('ИТОГ живая игра: ступеней',tot.n,'тот же ранг перевёрнуто',tot.same,'(запас ×'+ms+'), 5-й против 1-го',tot.r5,'(запас ×'+m5+')','| с сродством особенности (ctAff, как «Сила» книги): тот же ранг',tot.sa,', 5-й против 1-го',tot.r5a);
  if(process.env.OUT)require('fs').writeFileSync(process.env.OUT,JSON.stringify({tot,out},null,1));return tot;};
