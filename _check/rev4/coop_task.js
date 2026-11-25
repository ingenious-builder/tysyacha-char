// задача для fx: кооп-правки 25.11. А) Чумной лекарь-гость: слои яда у копии врага копятся от своих ядовитых попаданий (mpGuestHit),
// «Токсин» их берёт. Б) Пиромант-гость: сила поджога Вспышки уходит в сообщении (h.fb), хост поджигает ей, а не 14% урона Вспышки.
module.exports=async({ev,log})=>{const out={};
  out.tox=await ev(`(()=>{selectClass('plague');startGame();S.lvl=160;const t={};for(const x of CT_TAL.plague)t[x.id]=x.max;S.talents=t;computeStats();recalcStats();cfReset();
    const e=spawnEnemy('goblin',P.pos.x+3,P.pos.z,160,{});e.remote=true;e.poisT=1;e.poisN=0;MP.hitQ.length=0;const sk=SKILLS[S.active.find(x=>x!=null)];
    const before=cfDmgOut0(e,EL.earth,{sk},100);for(let i=0;i<20;i++)mpGuestHit(e,10,EL.poison,{sk});const after=cfDmgOut0(e,EL.earth,{sk},100),n=e.poisN;
    mpStepRemote(e,.016);const flagOff=(e.tg?1:0);MP.hitQ.length=0;return {before:+before.toFixed(3),after:+after.toFixed(3),stacks:n};})()`);
  out.flash=await ev(`(()=>{selectClass('pyro');startGame();S.lvl=160;computeStats();recalcStats();cfReset();MP.hitQ.length=0;
    const e=spawnEnemy('goblin',P.pos.x+3,P.pos.z,160,{});e.remote=true;CT.flB=500;CT.inFl=1;try{mpGuestHit(e,2000,EL.fire,{ctx:1,depth:1,noReact:true,noProc:true});}finally{CT.inFl=0;}
    const h=MP.hitQ.pop();MP.hitQ.length=0;
    // хост: тот же удар гостя по своему врагу — сила горения
    const H=spawnEnemy('goblin',P.pos.x-3,P.pos.z,160,{});H.maxHp=H.hp=1e9;const pc=MP.peer;MP.peer={cls:'pyro',lvl:160};const ct=CT_ON;CT_ON=1;
    try{mpHostHit(Object.assign({},h,{u:H.uid}));}finally{MP.peer=pc;CT_ON=ct;}
    return {fb:h&&h.fb,burnDps:Math.round(H.burnDps||0),hitDmg:h&&h.d,old14:Math.round((h&&h.d||0)*.14)};})()`);
  log(JSON.stringify(out));return out;};
