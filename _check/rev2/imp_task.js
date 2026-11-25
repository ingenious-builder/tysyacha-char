// задача для fx.js: реальный урон «Невозможной» против сильнейшей легендарной (+ проверка кэша потолка при impBasePwr)
// env: JOBS (файл imp_jobs), OUT
const fs=require('fs'),path=require('path');
module.exports=async({ev,log})=>{const PJ=JSON.parse(fs.readFileSync(process.env.JOBS,'utf8'));
  await ev(`bookOpen=true;selectClass('pyro');startGame();clearWorld();luQueue=0;true`);await ev(fs.readFileSync(path.join(__dirname,'sim_tal.js'),'utf8'));
  const rows=[];for(let i=0;i<PJ.jobs.length;i+=8){const part=PJ.jobs.slice(i,i+8);
    rows.push(...await ev(`(()=>{const out=[];for(const o of ${JSON.stringify(part)}){S.imp=o.imp?[o.id]:[];impDirty();try{const r=__simt.run(o);r.imp=o.imp;out.push(r);}catch(e){out.push({id:o.id,cls:o.cls,err:String(e.message).slice(0,120)});}S.imp=[];impDirty();}return out;})()`));}
  // кэш потолка: impBasePwr первым после сброса кэша (уровень сменился) — не портит ли силу других невозможных
  const cache=await ev(`(()=>{const res=[];for(const c of ['pyro','cryo','bers','necro','monk']){selectClass(c);startGame();clearWorld();S.lvl=160;
      const tal={};for(const t of TALENTS)tal[t.id]=t.max;for(const t of CT_TAL[c]||[])tal[t.id]=t.max;S.talents=tal;computeStats();recalcStats();
      const I=rarInfo();const leg=[...CLS.pool].filter(id=>(I.map.get(id)|0)===3&&SKILLS[id].active);const a=leg[0],b=leg[leg.length-1],c2=leg[(leg.length>>1)];
      S.imp=[a,b,c2];impDirty();const fresh=[a,b,c2].map(id=>skParts(SKILLS[id],false).pw);
      S.lvl=159;computeStats();recalcStats();PWC=new Map();impBasePwr(SKILLS[a]);S.lvl=160;computeStats();recalcStats();PWC=new Map();
      impBasePwr(SKILLS[a]);const after=[a,b,c2].map(id=>skParts(SKILLS[id],false).pw);
      res.push({c,ids:[a,b,c2],k:after.map((v,i)=>+(v/fresh[i]).toFixed(3))});S.imp=[];impDirty();}return res;})()`);
  log('кэш потолка (сила после impBasePwr / свежая):',JSON.stringify(cache));
  if(process.env.OUT)fs.writeFileSync(process.env.OUT,JSON.stringify({rows,cache,sel:PJ.sel},null,0));return rows.length;};
