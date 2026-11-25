// Браузер (через замок): потолок талантов в живой игре (особенность класса включена, живые мана и здоровье) у героя 160-го и 50-го уровня:
// порядок редкостей на одном ранге по показанной силе (pwr), «Невозможная» сильнее легендарной, тексты (книга, подсказка), время «Авто», ошибки страницы.
// node _check/rar/b_ui.js [корень игры] [выход.json]
const fs=require('fs'),path=require('path'),http=require('http');const {pw,gate}=require('../tal_lib');
const WT=path.resolve(__dirname,'../..');const ROOT=path.resolve(process.argv[2]||WT),OUT=process.argv[3]||path.join(__dirname,'ui_new.json');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary','.jpg':'image/jpeg','.webp':'image/webp','.css':'text/css'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';let f=path.join(p==='/index.html'?ROOT:WT,p);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});
const ALL='pyro,cryo,storm,plague,necro,paladin,geo,windr,hemo,arcan,bers,dk,druid,hunter,assassin,shaman,monk,lock,inq,alch'.split(',');
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;let browser;const out={};const errs=[];
  try{({browser}=await gate.launch(pw,{label:'rarord-ui'}));const ctx=await gate.phoneContext(browser,{w:390,h:844});
    await ctx.addInitScript(()=>{try{localStorage.setItem('tysyacha-nick','Тест');}catch(e){}});
    const page=await ctx.newPage();page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200));});
    await page.goto(`http://127.0.0.1:${port}/index.html?debug&test=1`);await page.waitForFunction(()=>window.__ev&&window.__tc,null,{timeout:40000});
    const ev=c=>page.evaluate(c=>window.__ev(c),c);
    for(const c of ALL)for(const L of [50,160]){out[c+L]=await ev(`(()=>{bookOpen=true;selectClass('${c}');startGame();const R0=Math.random;Math.random=mpRng(${31+L});try{clearWorld();runFresh(${L});}finally{Math.random=R0;}
      computeStats();recalcStats();EQUIPPED=new Set(equippedIds());PWC=new Map();WKC=null;const I=rarInfo(),ids=[...CLS.pool],has=typeof talQ==='function';
      // порядок на одном ранге по показанной силе в живой игре (без билда: резонанс и реакции — как у чары вне билда)
      const keepE=EQUIPPED,keepN=RESO_N.slice(),kc=CR_OVR,kl=CLONE_OVR;EQUIPPED=new Set();RESO_N.fill(0);CR_OVR=1;CLONE_OVR=true;PWC=new Map();let inv=0,np=0,minM=9,inv0=0,minM0=9;const qs=[];
      const ord=(cb)=>{for(const act of [true,false]){const T=[0,1,2,3].map(()=>({min:Infinity,max:0,n:0}));
        for(const id of ids){const sk=SKILLS[id];if(sk.active!==act)continue;const p=skParts(sk,false).pw,t=T[I.map.get(id)|0];t.n++;t.min=Math.min(t.min,p);t.max=Math.max(t.max,p);if(has&&cb)qs.push(talQ(sk));}
        for(let r=0;r<3;r++){if(!T[r].n||!T[r+1].n)continue;cb(T[r+1].min/T[r].max);}}};
      try{ord(m=>{np++;minM=Math.min(minM,m);if(m<1)inv++;});const kt=S.talents;S.talents={};computeStats();recalcStats();try{ord(m=>{minM0=Math.min(minM0,m);if(m<1)inv0++;});}finally{S.talents=kt;computeStats();recalcStats();}}
      finally{EQUIPPED=keepE;for(let i=0;i<10;i++)RESO_N[i]=keepN[i];CR_OVR=kc;CLONE_OVR=kl;PWC=new Map();}
      // «Невозможная»: слабейшая легендарная, ставшая невозможной, против сильнейшей легендарной того же ранга
      const leg=ids.filter(id=>{if((I.map.get(id)|0)!==3||!SKILLS[id].active)return false;const p=skParts(SKILLS[id],false);return p.pw>0&&p.ext<.2*p.pw;});const pw0=id=>skParts(SKILLS[id],false).pw;leg.sort((a,b)=>pw0(a)-pw0(b));
      let imp=null;if(leg.length>1){const w=leg[0],s=leg[leg.length-1];const keepI=(S.imp||[]).slice();S.imp=keepI.concat([w]);impDirty();try{imp=+(pw0(w)/pw0(s)).toFixed(3);}finally{S.imp=keepI;impDirty();}}
      // тексты: разбивка силы у самой усиленной и самой неусиленной чары, подсказка «Ярости»
      let txt=null;if(has){const byQ=ids.map(id=>[id,talQ(SKILLS[id])]).sort((a,b)=>a[1]-b[1]);const lo=SKILLS[byQ[0][0]],hi=SKILLS[byQ[byQ.length-1][0]];
        const strip=h=>h.replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim();txt={capLo:+byQ[0][1].toFixed(3),capHi:+byQ[byQ.length-1][1].toFixed(3),bookLo:strip(pwBreakHtml(lo)).slice(0,600),bookHi:strip(pwBreakHtml(hi)).slice(0,600),wrath:TALENTS.find(t=>t.id==='wrath').d(3)};}
      const keep=S.talents;S.talents={};computeStats();const t1=performance.now();talSmart(S.lvl-1,S.lvl+2);const ms=Math.round(performance.now()-t1);S.talents=keep;computeStats();
      return {inv,np,minM:+minM.toFixed(3),inv0,minM0:+minM0.toFixed(3),qMin:qs.length?+Math.min(...qs).toFixed(3):1,qMax:qs.length?+Math.max(...qs).toFixed(3):1,imp,ms,txt};})()`);
      const o=out[c+L];console.log(c,L,'перевёрнуто',o.inv,'из',o.np,'запас ×'+o.minM,'| без талантов',o.inv0,'×'+o.minM0,'|','q',o.qMin+'–'+o.qMax,'невозм./легенд. ×'+o.imp,'Авто',o.ms+' мс');}
    // экран талантов и лист чары на телефоне: открыть, отрисовать, без ошибок
    out._sheet=await ev(`(()=>{selectClass('cryo');startGame();clearWorld();runFresh(160);computeStats();recalcStats();onBuildChanged();const id=[...CLS.pool].sort((a,b)=>talQ(SKILLS[a])-talQ(SKILLS[b]))[0];
      const h=sheetHtml(SKILLS[id]);renderTalents();tpSel='wrath';talHint('wrath');return {sheet:h.length,hint:document.getElementById('tpHint').textContent.slice(0,300)};})()`);
    console.log('лист чары',out._sheet.sheet,'знаков; подсказка «Ярости»:',out._sheet.hint);
    out._errs=errs.slice(0,20);console.log('ошибок страницы',errs.length,errs.slice(0,5).join('\n'));
  }finally{try{if(browser)await browser.close();}catch(e){}srv.close();fs.writeFileSync(OUT,JSON.stringify(out,null,1));}
})().catch(e=>{console.error('ПРОВАЛ',e);process.exitCode=1;});
