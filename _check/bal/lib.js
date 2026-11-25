// Общая обвязка проверки: свой http-сервер над D:/games, один браузер через замок, страницы 440x956.
const fs=require('fs'),http=require('http'),path=require('path');
const pw=require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate=require('D:/games/pw_gate.js');
const ROOT='D:/games';
const T={'.html':'text/html;charset=utf-8','.js':'text/javascript','.json':'application/json','.png':'image/png','.webmanifest':'application/json','.glb':'model/gltf-binary','.webp':'image/webp','.svg':'image/svg+xml'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function withBrowser(label,fn){
  const srv=http.createServer((q,s)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';const f=path.join(ROOT,u);if(!path.resolve(f).startsWith(path.resolve(ROOT))){s.writeHead(403);return s.end();}
    fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end();}s.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});s.end(d);});});
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));const BASE='http://127.0.0.1:'+srv.address().port+'/';
  const {browser}=await gate.launch(pw,{label});
  try{return await fn(browser,BASE);}finally{await browser.close();srv.close();}
}
async function openGame(browser,BASE,dir,o={}){
  const ctx=await gate.phoneContext(browser,{w:440,h:956});
  await ctx.addInitScript(([save,seed])=>{try{localStorage.setItem('tysyacha-nick','Тест');if(save&&!sessionStorage.getItem('done')){localStorage.setItem('tysyacha-char-v3',save);sessionStorage.setItem('done','1');}}catch(e){}
    if(seed){let s=seed;Math.random=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};}},[o.save||null,o.seed||0]);
  const p=await ctx.newPage();const errs=[];
  p.on('pageerror',e=>errs.push(dir+': '+String(e).slice(0,300)));p.on('console',m=>{if(m.type()==='error')errs.push(dir+' console: '+m.text().slice(0,300));});
  if(o.cpu>1){const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:o.cpu});}
  const E=c=>p.evaluate(x=>window.__ev(x),c);
  const waitF=async(expr,ms)=>{const t=Date.now();while(Date.now()-t<(ms||20000)){try{if(await E(expr))return true;}catch(e){}await sleep(100);}return false;};
  await p.goto(BASE+dir+'/?'+(o.notest?'':'test=1&')+'debug');
  if(!await waitF("mode==='select'&&!!$('#selPlay')",60000))throw new Error(dir+': нет экрана выбора');
  return {ctx,p,E,waitF,errs};
}
// старт класса в ручном шаге (без rAF), без своих волн
const START=(cid,lvl,fresh)=>`${fresh?'SAVE.chars={};':''}selectClass('${cid}');startGame();true`;
const FREEZE=(lvl)=>`luQueue=0;luOpen=false;$('#lvlup').hidden=true;try{hideUpg()}catch(e){};syncPause();S.auto=false;S.autoLu=true;S.autoBest=true;
  window.__sp0=window.__sp0||spawnPack;window.__sb0=window.__sb0||spawnBoss;spawnBoss=function(){};spawnPack=function(){};
  window.requestAnimationFrame=function(){return 0};window.__R=window.__R||render;window.__vt=window.__vt||last;
  window.__step=(sec)=>{const n=Math.max(1,Math.round(sec*60));render=function(){};for(let i=0;i<n;i++){__vt+=1000/60;loop(__vt);}render=__R;};
  ${lvl?`S.lvl=${lvl};computeStats();recalcStats();P.hp=P.maxHp;P.mp=P.maxMp;`:''}true`;
module.exports={withBrowser,openGame,START,FREEZE,sleep,gate};
