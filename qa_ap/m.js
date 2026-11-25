const pw=require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');const gate=require('D:/games/pw_gate.js');
const http=require('http'),fs=require('fs'),path=require('path');const root='D:/games/tc-wt-ap';
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/')||f===root)f=path.join(root,'index.html');fs.readFile(f,(e,d)=>{if(e){r.statusCode=404;return r.end();}r.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.html')?'text/html':'application/octet-stream');r.end(d);});});
(async()=>{await new Promise(r=>srv.listen(8842,r));const {browser}=await gate.launch(pw,{label:'ap'});
try{const c=await gate.phoneContext(browser,{w:440,h:956});await c.addInitScript(()=>localStorage.setItem('tysyacha-nick','Тест'));
const p=await c.newPage();await p.goto(gate.url('http://localhost:8842/index.html','debug'));await p.waitForTimeout(2500);
await p.evaluate(()=>__ev("selectClass('pyro');S.sandbox=true;startGame();luQueue=1;openLevelUp()"));await p.waitForTimeout(500);
console.log(JSON.stringify(await p.evaluate(()=>[...document.querySelectorAll('#luCards .card')].map(c=>[c.clientHeight,c.scrollHeight,c.querySelector('.ct').scrollHeight]).concat([[document.querySelector('#luCards').clientHeight,document.querySelector('#luCards').scrollHeight]]))));
}finally{await browser.close();srv.close();}})();
