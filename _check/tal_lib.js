// общий помощник для браузерных проверок особенностей классов (через замок D:/games/pw_gate.js)
const http=require('http'),fs=require('fs'),path=require('path');
const pw=require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate=require('D:/games/pw_gate.js');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.css':'text/css','.glb':'model/gltf-binary','.jpg':'image/jpeg','.webp':'image/webp'};
function serve(root){return new Promise(res=>{const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(root,p);
  if(!f.startsWith(path.resolve(root))||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
  r.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);});
  srv.listen(0,'127.0.0.1',()=>res({srv,port:srv.address().port}));});}
async function withGame(root,label,fn,opts={}){const {srv,port}=await serve(root);let browser;
  try{({browser}=await gate.launch(pw,{label}));
    const ctx=await gate.phoneContext(browser,{w:opts.w||440,h:opts.h||956});
    await ctx.addInitScript(()=>{try{localStorage.setItem('tysyacha-nick','Тест');}catch(e){}});
    // без сервис-воркера: свой порт и свежая страница
    const page=await ctx.newPage();const errs=[];
    page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text());});
    const url=`http://127.0.0.1:${port}/index.html?`+(opts.q||'test=1&debug');
    await page.goto(url);await page.waitForFunction(()=>window.__ev&&window.__tc,null,{timeout:30000});
    const ev=c=>page.evaluate(c=>window.__ev(c),c);
    return await fn({page,ev,errs,ctx});
  }finally{try{if(browser)await browser.close();}catch(e){}srv.close();}}
module.exports={withGame,serve,pw,gate};
