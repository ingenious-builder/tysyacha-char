// Обвязка проверок волн: свой http-сервер над D:/games/tc-wt-int1331, один браузер через замок D:/games/pw_gate.js.
// /base/ — та же папка, но index.html прежний (v13.29, 7da02f9) из _check/waves/base_index.html: замер «до» рядом с «после».
const fs=require('fs'),http=require('http'),path=require('path');
const pw=require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate=require('D:/games/pw_gate.js');
const ROOT='D:/games/tc-wt-int1331';
const T={'.html':'text/html;charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.webmanifest':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.svg':'image/svg+xml','.css':'text/css'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function withBrowser(label,fn,lo){
  const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';
    let f=path.join(ROOT,u);if(u.startsWith('/base/'))f=u==='/base/index.html'?path.join(__dirname,'base_index.html'):path.join(ROOT,u.slice(6));
    if(!path.resolve(f).startsWith(path.resolve(ROOT))){s.writeHead(403);return s.end();}
    fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end();}s.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});s.end(d);});});
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));const BASE='http://127.0.0.1:'+srv.address().port+'/';
  const {browser}=await gate.launch(pw,lo?Object.assign({label},lo):{label});
  try{return await fn(browser,BASE);}finally{try{await browser.close();}catch(e){}srv.close();}}
async function openGame(browser,BASE,dir,o={}){
  const ctx=o.ctx||await gate.phoneContext(browser,{w:o.w||440,h:o.h||956});
  await ctx.addInitScript(([seed])=>{try{localStorage.setItem('tysyacha-nick','Тест');}catch(e){}
    if(seed){let s=seed;Math.random=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};}},[o.seed||0]);
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(dir+': '+String(e).slice(0,300)));p.on('console',m=>{if(m.type()==='error')errs.push(dir+' console: '+m.text().slice(0,300));});
  const E=c=>p.evaluate(x=>window.__ev(x),c);
  const waitF=async(expr,ms)=>{const t=Date.now();while(Date.now()-t<(ms||20000)){try{if(await E(expr))return true;}catch(e){}await sleep(100);}return false;};
  await p.goto(BASE+(dir?dir+'/':'')+'?'+(o.notest?'':'test=1&')+'debug');
  if(!await waitF("mode==='select'&&!!$('#selPlay')",60000))throw new Error(dir+': нет экрана выбора');
  return {ctx,p,E,waitF,errs};}
// старт класса и ручной шаг без отрисовки (rAF выключен); __step(сек) — игра идёт шагами 1/60 с
const START=(cid)=>`SAVE.chars={};selectClass('${cid}');startGame();true`;
const FREEZE=`luQueue=0;luOpen=false;$('#lvlup').hidden=true;try{hideUpg()}catch(e){};syncPause();
  window.requestAnimationFrame=function(){return 0};window.__R=window.__R||render;window.__vt=window.__vt||last;
  window.__step=(sec)=>{const n=Math.max(1,Math.round(sec*60));render=function(){};for(let i=0;i<n;i++){if(window.__dodge)__dodge();__vt+=1000/60;loop(__vt);}render=__R;};true`;
module.exports={withBrowser,openGame,START,FREEZE,sleep,gate,pw};
