const pw=require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');const gate=require('D:/games/pw_gate.js');
const http=require('http'),fs=require('fs'),path=require('path');
const root='D:/games/tc-wt-ap',out=root+'/qa_ap/';
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/')||f===root)f=path.join(root,'index.html');fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end();}r.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':'application/octet-stream');r.end(d);});});
(async()=>{await new Promise(r=>srv.listen(8841,r));const {browser}=await gate.launch(pw,{label:'ap'});
try{const c=await gate.phoneContext(browser,{w:440,h:956});await c.addInitScript(()=>localStorage.setItem('tysyacha-nick','Тест'));
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto(gate.url('http://localhost:8841/index.html','debug'));await p.waitForTimeout(2500);
await p.evaluate(()=>__ev("selectClass('pyro');S.sandbox=true;startGame()"));await p.waitForTimeout(1500);
// окно выбора: ищем набор с активной и пассивной
let ok=false;for(let i=0;i<8&&!ok;i++){await p.evaluate(()=>__ev("luQueue=1;openLevelUp()"));await p.waitForTimeout(300);
 ok=await p.evaluate(()=>document.querySelectorAll('#luCards .aptag.a').length>0&&document.querySelectorAll('#luCards .aptag.p').length>0);if(!ok)await p.evaluate(()=>__ev("closeLevelUp()"));}
await p.screenshot({path:out+'1_levelup.png'});
await p.evaluate(()=>__ev("closeLevelUp()"));
await p.evaluate(()=>__ev("for(const sk of classSkills().slice(0,40))learn(sk.id,true);openBook('lib')"));await p.waitForTimeout(600);
await p.screenshot({path:out+'2_book_list.png'});
await p.evaluate(()=>{const l=document.querySelector('#list');l.scrollTop=[...l.querySelectorAll('.aph')].pop().offsetTop-10});await p.waitForTimeout(300);await p.screenshot({path:out+'2b_book_list_mid.png'});
await p.evaluate(()=>__ev("showTab('build')"));await p.waitForTimeout(500);await p.screenshot({path:out+'3_build.png'});
await p.evaluate(()=>__ev("showTab('lib')"));await p.waitForTimeout(300);
await p.evaluate(()=>document.querySelector('#list .row').click());await p.waitForTimeout(400);await p.screenshot({path:out+'4_sheet_active.png'});
await p.evaluate(()=>__ev("(()=>{const sk=classSkills().find(s=>!s.active&&isLearned(s.id));openSheet(sk.id)})()"));await p.waitForTimeout(400);await p.screenshot({path:out+'5_sheet_passive.png'});
console.log('ok',ok,'errs',JSON.stringify(errs));await c.close();}
finally{await browser.close();srv.close();}})();
