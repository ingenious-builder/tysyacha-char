// Браузер (через замок): реальный урон чар критических пар с талантами и без. node _check/rar/b_real.js <корень игры> <pairs.json> <выход.json>
const fs=require('fs'),path=require('path'),http=require('http');const {pw,gate}=require('../tal_lib');
const WT=path.resolve(__dirname,'../..');const [rootArg,pairsF,outF]=process.argv.slice(2);const ROOT=path.resolve(rootArg);
const PJ=JSON.parse(fs.readFileSync(pairsF,'utf8'));
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary','.jpg':'image/jpeg','.webp':'image/webp','.css':'text/css'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';let f=path.join(p==='/index.html'?ROOT:WT,p);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;let browser;const rows=[],t0=Date.now();const errs=[];
  try{({browser}=await gate.launch(pw,{label:'rarord-real'}));const ctx=await gate.phoneContext(browser,{w:440,h:956});
    await ctx.addInitScript(()=>{try{localStorage.setItem('tysyacha-nick','Тест');}catch(e){}});
    const page=await ctx.newPage();page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200));});
    await page.goto(`http://127.0.0.1:${port}/index.html?debug&test=1`);await page.waitForFunction(()=>window.__ev&&window.__tc,null,{timeout:40000});
    const ev=c=>page.evaluate(c=>window.__ev(c),c);
    await ev(`bookOpen=true;selectClass('pyro');startGame();clearWorld();luQueue=0;true`);
    await ev(fs.readFileSync(path.join(__dirname,'../rev2/sim_tal.js'),'utf8'));
    const all=await ev(`(()=>{const o={};for(const C of CLASSES){const a={};for(const t of TALENTS)a[t.id]=t.max;for(const t of CT_TAL[C.id]||[])a[t.id]=t.max;o[C.id]=a;}return o;})()`);
    const gen=await ev(`(()=>{const a={};for(const t of TALENTS)a[t.id]=t.max;return a;})()`);
    const TAL={c1:c=>all[c],g1:()=>gen,c0:()=>({}),g0:()=>({}),n1:()=>Object.assign({},gen,{cdr:0}),n0:()=>({})};
    const SD=JSON.parse(process.env.SEEDS||'[11]'),jobs=[];for(const j of PJ.jobs){const b={id:j.id,scen:j.scen,cls:j.cls,lvl:j.lvl,seed:j.seed,T:j.T,t:j.t,ct:j.ct!=null?j.ct:j.t[0]==='c'?1:0,tal:j.tal||TAL[j.t](j.cls)};if(b.scen==='flow')for(const seed of SD)jobs.push({...b,seed});else jobs.push(b);}
    for(let i=0;i<jobs.length;i+=12){const part=jobs.slice(i,i+12);rows.push(...await ev('__simt.batch('+JSON.stringify(part)+')'));
      if(i%240===0)console.log(rows.length+'/'+jobs.length,Math.round((Date.now()-t0)/1000)+' с');if(Date.now()-t0>9.3*60e3){errs.push('стоп по времени '+rows.length);break;}}
    console.log('ошибок страницы',errs.length,errs.slice(0,5).join('\n'));
  }finally{try{if(browser)await browser.close();}catch(e){}srv.close();fs.writeFileSync(outF,JSON.stringify({rows,errs},null,0));}
})().catch(e=>{console.error('ПРОВАЛ',e);process.exitCode=1;});
