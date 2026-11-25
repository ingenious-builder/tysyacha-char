// Задача для _check/rev3/fx.js: экран «Таланты» и книга (лист чары с «Силой») у всех 20 классов на текущем размере окна.
// Режимы MODES (по умолчанию 160a,50a,50f): уровень + a («Авто» вложил очки) или f (очки не вложены, часть талантов под замком).
// Меряет: горизонтальную прокрутку, обрезку описаний карточек, обрезку подсказки (#tpHint, 2 строки) у КАЖДОГО таланта (общих и ветки)
// с оговоркой о потолке и без, уведомление TAL_NOTE, лист чары с наименьшей и наибольшей поправкой q (только в режимах «a»).
// SHOT=классы через запятую — снимки в _check/rev3/. node _check/rev3/fx.js _check/rev3/v3_ui_task.js [index.html|index_base.html] W H
const path=require('path'),fs=require('fs');
module.exports=async({ev,page,file,log})=>{const W=page.viewportSize().width,H=page.viewportSize().height,tag=(file.includes('base')?'base_':'')+W+'x'+H;
  const shots=(process.env.SHOT||'pyro,hemo,bers,cryo').split(',').filter(Boolean),out={},MODES=(process.env.MODES||'160a,50a,50f').split(',');
  const cls=process.env.CLS?process.env.CLS.split(','):await ev(`CLASSES.map(c=>c.id)`);
  const shot=async n=>{await page.screenshot({path:path.join(__dirname,`s_${tag}_${n}.png`)});};
  for(const c of cls)for(const md of MODES){const L=parseInt(md),auto=md.endsWith('a'),key=c+'@'+md;
    await ev(`(()=>{selectClass('${c}');startGame();const R0=Math.random;Math.random=mpRng(77);try{clearWorld();runFresh(${L});}finally{Math.random=R0;}S.talents={};S.talNote=0;tpMsg='';tpSel=null;tpHov=null;computeStats();recalcStats();
      openBook('tal');showTab('tal');tpTab='cls';renderTalents();return 1;})()`);
    if(auto){await ev(`$('#tpAuto').click();true`);await page.waitForTimeout(200);}
    const m=await ev(`(()=>{const b=$('#branches'),h=$('#tpHint');const hasCap=typeof talCapped==='function';
      const cards=()=>[...b.querySelectorAll('.tn')].map(n=>{const d=n.querySelector('.tdsc'),v=n.querySelector('.tv'),nm=n.querySelector('b');
        return {id:n.dataset.t,descCut:d&&getComputedStyle(d).display!=='none'?d.scrollHeight>d.clientHeight+2:false,valOver:v?v.scrollWidth>v.clientWidth+1:false,nameOver:nm?nm.scrollWidth>nm.clientWidth+1:false};});
      const hs=()=>document.documentElement.scrollWidth>innerWidth||document.body.scrollWidth>innerWidth;
      const r={hscroll:hs(),cls:cards(),hint:[]};
      for(const tab of ['cls','gen']){tpTab=tab;renderTalents();if(tab==='gen'){r.gen=cards();r.hscrollGen=hs();}
        for(const n of [...b.querySelectorAll('.tn')]){const id=n.dataset.t;tpSel=id;talMark();talHint(id);const t=TAL_BY[id];
          r.hint.push({id,tab,cap:hasCap?talCapped(t):false,cut:h.scrollHeight>h.clientHeight+2,len:h.textContent.length,txt:h.textContent});}}
      tpTab='cls';tpSel=null;renderTalents();return r;})()`);
    const cutHints=m.hint.filter(x=>x.cut).map(x=>x.id+(x.cap?'*':'')),descCut=[...m.cls,...(m.gen||[])].filter(x=>x.descCut||x.valOver||x.nameOver).map(x=>x.id);
    if(shots.includes(c)&&md===MODES[0]){const capId=await ev(`(()=>{const L=CT_TAL[CLS.id];const t=L.find(x=>typeof talCapped==='function'&&talCapped(x)&&T(x.id)>0)||L[1];tpTab='cls';renderTalents();tpSel=t.id;talMark();talHint(t.id);return t.id;})()`);
      await shot(c+'_'+md+'_cls_'+capId);await ev(`(()=>{tpTab='gen';renderTalents();tpSel='cascade';talMark();talHint('cascade');return 1;})()`);await shot(c+'_'+md+'_gen_cascade');}
    if(shots.includes(c)&&!auto){await ev(`(()=>{tpTab='cls';renderTalents();const t=CT_TAL[CLS.id].find(x=>x.key);tpSel=t.id;talMark();talHint(t.id);return 1;})()`);await shot(c+'_'+md+'_key');
      await ev(`(()=>{tpTab='gen';renderTalents();tpSel='wrath';talMark();talHint('wrath');return 1;})()`);await shot(c+'_'+md+'_gen_wrath');}
    // книга: лист чары с наименьшей (самая усиленная талантами) и наибольшей q
    const sh=!auto?null:await ev(`(()=>{if(typeof talQ!=='function')return null;showTab('lib');const ids=[...CLS.pool].filter(id=>isLearned(id));const q=id=>talQ(SKILLS[id]);ids.sort((a,b)=>q(a)-q(b));
      const res=[];for(const id of [ids[0],ids[ids.length-1]]){if(id==null)continue;openSheet(id);const s=$('#sheet'),pb=s.querySelector('.pwb'),note=pb&&pb.nextElementSibling;
        res.push({id,name:skName(SKILLS[id]),q:+q(id).toFixed(3),hs:document.documentElement.scrollWidth>innerWidth,
          pwbOver:pb?pb.scrollWidth>pb.clientWidth+1:null,shOver:$('#sh').scrollWidth>$('#sh').clientWidth+1,pwb:pb?pb.textContent.replace(/\\s+/g,' ').slice(0,200):'',note:note?note.textContent.slice(0,700):''});}
      return res;})()`);
    if(sh&&shots.includes(c)&&md===MODES[0]){await ev(`openSheet(${JSON.stringify((sh[0]||{}).id)});true`);await shot(c+'_sheet_qlo');if(sh[1]){await ev(`openSheet(${JSON.stringify(sh[1].id)});true`);await shot(c+'_sheet_qhi');}}
    await ev(`$('#sheet').hidden=true;true`);
    out[key]={hscroll:m.hscroll||m.hscrollGen,cutHints,nHints:m.hint.length,descCut,sheet:sh,hintsCap:m.hint.filter(x=>x.cap).length,ex:m.hint.filter(x=>x.cut).slice(0,4).map(x=>x.txt)};
    log(key,'гориз.',out[key].hscroll,'обрезано подсказок',cutHints.length,'/',m.hint.length,cutHints.join(' '),'| карточки',descCut.join(' ')||'-','| лист',sh?sh.map(x=>x.q+(x.pwbOver||x.shOver||x.hs?' ПЕРЕПОЛН':'')).join(' '):'-');}
  // уведомление о сбросе талантов
  const note=await ev(`(()=>{selectClass('pyro');startGame();clearWorld();runFresh(60);S.talents={};S.talNote=1;tpSel=null;tpHov=null;tpMsg='';computeStats();recalcStats();openBook('tal');showTab('tal');tpTab='cls';renderTalents();const h=$('#tpHint');
    return {txt:h.textContent,cut:h.scrollHeight>h.clientHeight+2};})()`);await shot('note');out._note=note;log('уведомление',JSON.stringify(note));
  fs.writeFileSync(path.join(__dirname,`ui_${tag}.json`),JSON.stringify(out,null,1));
  const S={hscroll:0,cutHints:0,cutCap:0,descCut:0,sheetOver:0,hints:0};for(const k in out){if(k[0]==='_')continue;const o=out[k];if(o.hscroll)S.hscroll++;S.hints+=o.nHints;S.cutHints+=o.cutHints.length;S.cutCap+=o.cutHints.filter(x=>x.endsWith('*')).length;S.descCut+=o.descCut.length;if(o.sheet)S.sheetOver+=o.sheet.filter(x=>x.pwbOver||x.shOver||x.hs).length;}
  log('ИТОГ',tag,JSON.stringify(S));return S;};
