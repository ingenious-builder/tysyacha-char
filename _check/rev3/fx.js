// node _check/fix/fx.js <задача.js> [страница=index.html] [ширина высота]
// Один браузер через замок D:/games/pw_gate.js; задача — модуль: module.exports=async({ev,page,errs,file,log})=>результат
// страница: index.html (новая) или _check/fix/index_base.html (как было на 4a8f4f8)
const fs=require('fs'),path=require('path'),http=require('http');
const pw=require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate=require('D:/games/pw_gate.js');
const ROOT=path.resolve(__dirname,'../..');
const [taskF,file='index.html',W='440',H='956']=process.argv.slice(2);
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.css':'text/css','.glb':'model/gltf-binary','.gz':'application/gzip','.jpg':'image/jpeg','.webp':'image/webp'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=p==='/index_base.html'?path.join(__dirname,'index_base.html'):path.join(ROOT,p);
  if(!f.startsWith(ROOT.slice(0,-0)||ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const port=srv.address().port;let browser,release;const t0=Date.now();
  try{({browser,release}=await gate.launch(pw,{label:'balrar-rev3'}));const ctx=await gate.phoneContext(browser,{w:+W,h:+H});
    await ctx.addInitScript(()=>{try{localStorage.setItem('tysyacha-nick','Тест');}catch(e){}});
    const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push('pageerror: '+e.message.slice(0,200)));page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text().slice(0,200));});
    await page.goto(`http://127.0.0.1:${port}/${file}?debug&test=1`);await page.waitForFunction(()=>window.__ev&&window.__tc,null,{timeout:60000});
    const ev=c=>page.evaluate(c=>window.__ev(c),c);
    const task=require(path.resolve(taskF));
    const res=await task({ev,page,errs,file,log:(...a)=>console.log(Math.round((Date.now()-t0)/1000)+'с',...a),stand:()=>ev(fs.readFileSync(path.join(__dirname,'r_stand2.js'),'utf8'))});
    if(res!==undefined)console.log(JSON.stringify(res));
    console.log('ошибок страницы',errs.length,[...new Set(errs)].slice(0,5).join('\n'));
  }finally{try{if(browser)await browser.close();}catch(e){}try{release&&release();}catch(e){}srv.close();}
})().catch(e=>{console.error('ПРОВАЛ',e.message);process.exitCode=1;});
