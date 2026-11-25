// задача для fx.js: влезает ли уведомление TAL_NOTE (и варианты) в подсказку окна талантов (2 строки) на ширине страницы
module.exports=async({ev,log})=>{await ev(`(()=>{selectClass('pyro');startGame();runFresh(60);S.talents={};S.talNote=1;computeStats();recalcStats();openBook('tal');showTab('tal');return 1;})()`);
  const cand=[null].concat(JSON.parse(process.env.NOTES||'[]')),out=[];
  for(const t of cand){const r=await ev(`(()=>{${t?`tpMsg=${JSON.stringify(t)};talHint();`:''}const h=$('#tpHint');return {txt:h.textContent.slice(0,60),len:h.textContent.length,sh:h.scrollHeight,ch:h.clientHeight,w:h.clientWidth,fit:h.scrollHeight<=h.clientHeight+1};})()`);
    out.push(r);log(JSON.stringify(r));}
  return out.every(x=>x.fit);};
