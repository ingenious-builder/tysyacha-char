// Браузер (через замок): у 20 классов на 20/50/100/160 — забег уровня L с «Авто»-талантами (как в игре, runFresh), билд и ранги;
// время полного «Авто» (talSmart на все очки). node _check/rar/b_auto.js <корень игры> <выход.json> [классы] [уровни]
// корень игры с index.html; остальные файлы (модели, vendor) берутся из worktree.
const fs=require('fs'),path=require('path'),http=require('http');
const {pw,gate}=require('../tal_lib');
const WT=path.resolve(__dirname,'../..');
const [rootArg,outArg,clsArg,lvArg]=process.argv.slice(2);const ROOT=path.resolve(rootArg||WT),OUT=outArg||path.join(__dirname,'auto_new.json');
const ALL='pyro,cryo,storm,plague,necro,paladin,geo,windr,hemo,arcan,bers,dk,druid,hunter,assassin,shaman,monk,lock,inq,alch'.split(',');
const CLS=clsArg?clsArg.split(','):ALL,LVS=(lvArg||'20,50,100,160').split(',').map(Number);
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary','.jpg':'image/jpeg','.webp':'image/webp','.css':'text/css'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';
  let f=path.join(p==='/index.html'?ROOT:WT,p);if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;let browser;const out={},t0=Date.now();
  try{({browser}=await gate.launch(pw,{label:'rarord-auto'}));const ctx=await gate.phoneContext(browser,{w:440,h:956});
    await ctx.addInitScript(()=>{try{localStorage.setItem('tysyacha-nick','Тест');}catch(e){}});
    const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200));});
    await page.goto(`http://127.0.0.1:${port}/index.html?debug&test=1`);await page.waitForFunction(()=>window.__ev&&window.__tc,null,{timeout:40000});
    const ev=c=>page.evaluate(c=>window.__ev(c),c);
    for(const c of CLS){out[c]={};for(const L of LVS){
      out[c][L]=await ev(`(()=>{bookOpen=true;selectClass('${c}');startGame();const R0=Math.random;Math.random=mpRng(${31+L});try{clearWorld();runFresh(${L});}finally{Math.random=R0;}
        computeStats();recalcStats();EQUIPPED=new Set(equippedIds());PWC=new Map();WKC=null;
        const tal=Object.assign({},S.talents),a=S.active.filter(x=>x!=null),p=S.passive.filter(x=>x!=null);
        const keep=S.talents;S.talents={};computeStats();const t1=performance.now();talSmart(S.lvl-1,S.lvl+2);const ms=performance.now()-t1;
        const same=JSON.stringify(S.talents)===JSON.stringify(tal);S.talents=keep;computeStats();
        return {tal,a,p,ranks:Object.assign({},S.ranks),ms:Math.round(ms),same};})()`);
      console.log(c,L,'Авто',out[c][L].ms+' мс',Object.keys(out[c][L].tal).length,'талантов',out[c][L].a.length+'+'+out[c][L].p.length,'чар');}
      if(Date.now()-t0>9*60e3){console.log('стоп по времени');break;}}
    out._errs=errs.slice(0,20);console.log('ошибок страницы',errs.length,errs.slice(0,5).join('\n'));
  }finally{try{if(browser)await browser.close();}catch(e){}srv.close();fs.writeFileSync(OUT,JSON.stringify(out,null,1));}
})().catch(e=>{console.error('ПРОВАЛ',e);process.exitCode=1;});
