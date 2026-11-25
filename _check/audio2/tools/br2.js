// Живые записи в браузере (через замок D:/games/pw_gate.js): node br2.js smoke | perf
// smoke: загрузка записей после касания, метка, нарезка, все ключи; отказ сети и без OfflineAudioContext — синтез/запасной путь без ошибок;
//        музыка боя: петля, шов в браузерном декодере (рендер OfflineAudioContext через loopEnd), продолжение с такта; настройки и «Благодарности».
// perf:  толпа 30 врагов — время JS на кадр: новая версия против прежней audio.js (9994a5c), 3 пары по очереди.
const path=require('path'),fs=require('fs'),http=require('http');
const PW='C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core';
const gate=require('D:/games/pw_gate.js');
const ROOT='D:/games/tc-wt-audio2',MODE=process.argv[2]||'smoke',OUT=path.join(__dirname,'..');
const OLD=fs.readFileSync('D:/games/_snd_dl_tools/audio_old.js');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.glb':'model/gltf-binary','.json':'application/json','.webmanifest':'application/json','.mp3':'audio/mpeg'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
  const pw=require(PW);
  const srv=http.createServer((q,r)=>{let f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith(path.sep)||f.endsWith('/'))f+='index.html';
    fs.readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end();}r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});r.end(b);});}).listen(0);
  const base=`http://127.0.0.1:${srv.address().port}/index.html`;
  const {browser}=await gate.launch(pw,{label:'audio2_'+MODE});
  const res={mode:MODE};
  try{
    async function open(q,opt={}){const ctx=await gate.phoneContext(browser,{w:440,h:956});
      await ctx.addInitScript(o=>{try{localStorage.setItem('tysyacha-nick','Тест');}catch(e){}if(o.noOff){window.OfflineAudioContext=undefined;window.webkitOfflineAudioContext=undefined;}},{noOff:!!opt.noOff});
      if(opt.block)await ctx.route(opt.block,r=>r.fulfill({status:404,body:''}));
      if(opt.old)await ctx.route(/\/audio\.js/,r=>r.fulfill({status:200,contentType:'text/javascript',body:OLD}));
      const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push('c:'+m.text().slice(0,200));});
      await p.goto(base+'?test=1&debug'+q);await p.waitForFunction(()=>!!window.__tc&&!!window.__ev&&!!document.getElementById('selPlay'),null,{timeout:60000});return {ctx,p,errs};}
    async function startGame(p,cls){await p.evaluate(c=>window.__tc.sel(c),cls);await p.evaluate(()=>document.getElementById('selPlay').click());
      await p.waitForFunction(()=>window.__tc.state().mode==='game',null,{timeout:30000});
      await p.evaluate(()=>window.__ev('S.autoLu=true;S.auto=true;if(typeof syncAuto==="function")syncAuto();'));
      for(let k=0;k<8;k++){const o=await p.evaluate(()=>window.__tc.lu().open);if(!o)break;await p.evaluate(()=>document.getElementById('luAuto').click());await sleep(250);}}
    const crowd=p=>p.evaluate(()=>window.__ev("const sp=()=>{const a=Math.random()*6.283,r=3+Math.random()*7;spawnEnemy(['goblin','slime','archer','wolf','skeleton'][Math.random()*5|0],P.pos.x+Math.cos(a)*r,P.pos.z+Math.sin(a)*r,3,{hpMul:25,aggro:true,hunt:true});};for(let i=0;i<30;i++)sp();window.__crowdI=setInterval(()=>{let n=aliveCount();while(n++<30)sp();},250);"));
    if(MODE==='smoke'){
      const R={};
      // 1) до касания — ни контекста, ни загрузки; после — оба спрайта, все ключи
      let {ctx,p,errs}=await open('&snd=1');const reqs=[];p.on('request',q=>{if(/assets\/audio\//.test(q.url()))reqs.push(q.url().replace(/^.*assets\/audio\//,''));});
      R.before={ctx:await p.evaluate(()=>window.TCSND.state().ctx),reqs:reqs.length};
      await p.touchscreen.tap(220,300);
      await p.waitForFunction(()=>{const s=window.TCSND.state();return s.recSt[0]>=2&&s.recSt[1]>=2&&s.queue===0;},null,{timeout:30000}).catch(()=>{});
      R.loaded=await p.evaluate(()=>{const s=window.TCSND.state(),r=window.TCSND.dbg.rec();return {ctx:s.ctx,recSt:s.recSt,rec:s.rec,keys:r.on.length,errs:s.stat.errs,recErr:s.stat.recErr||0};});
      R.reqsAfterTap=reqs.slice();
      // каждый ключ: вариантов, частота, длина; сыграть каждый — без ошибок
      R.keys=await p.evaluate(async()=>{const out={};for(const k of window.TCSND.dbg.rec().on){const v=window.TCSND.dbg.play(k,{g:.05,jit:0,pri:9,key:'t'+k});out[k]=v?('ok'):'нет голоса';if(v)try{v.s.stop();}catch(e){}await new Promise(r=>setTimeout(r,40));}return out;});
      // нарезка попала в клипы: перед клипом и после него тишина (≤ −45 дБ от пика), внутри — звук
      R.cutCheck=await p.evaluate(()=>{const bad=[];let n=0;for(const k of window.TCSND.dbg.rec().on){const B=window.TCSND.dbg.bufs(k);for(const b of B){n++;const x=b.getChannelData(0),sr=b.sampleRate,pk=x.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
        const rms=(a,c)=>{let e=0;for(let i=a;i<c;i++)e+=x[i]*x[i];return Math.sqrt(e/Math.max(1,c-a));};const pre=rms(Math.round(.0032*sr),Math.round(.0038*sr)),post=rms(x.length-Math.round(.007*sr),x.length-Math.round(.0035*sr));
        const db=v=>20*Math.log10(v/pk+1e-9);if(!(pk>.05)||db(pre)>-45||db(post)>-45)bad.push(k+' пик '+pk.toFixed(2)+' до '+db(pre).toFixed(0)+' после '+db(post).toFixed(0));}}return {buffers:n,bad};});
      R.keysNotPlayed=Object.entries(R.keys).filter(([k,v])=>v!=='ok').map(([k])=>k);
      await startGame(p,'pyro');await p.evaluate(()=>window.__ev('setInterval(()=>{if(!P.dead)P.hp=P.maxHp;},300);'));
      // 2) музыка боя: загрузка, запись вместо синтеза, параметры петли
      await p.evaluate(()=>window.TCSND.dbg.force('tense'));
      await p.waitForFunction(()=>window.TCSND.dbg.rec().bat,null,{timeout:30000}).catch(()=>{});
      await p.evaluate(()=>window.TCSND.dbg.force('calm'));await sleep(5500);await p.evaluate(()=>window.TCSND.dbg.force('tense'));await sleep(1500);
      R.bat1=await p.evaluate(()=>{const s=window.TCSND.state();return {mus:s.mus,bat:s.bat,batRec:s.batRec,rec:window.TCSND.dbg.rec()};});
      await sleep(4000);await p.evaluate(()=>window.TCSND.dbg.force('calm'));await sleep(5500);
      R.bat2=await p.evaluate(()=>{const s=window.TCSND.state();return {mus:s.mus,batRec:s.batRec,batPos:window.TCSND.dbg.rec().batPos};});
      await p.evaluate(()=>window.TCSND.dbg.force(''));
      // 3) шов петли в браузерном декодере: тот же файл, тот же разбор, рендер 2 с через loopEnd
      R.seam=await p.evaluate(async()=>{const ab=await (await fetch('assets/audio/battle.mp3?av=3')).arrayBuffer();
        const dec=await new Promise((ok,no)=>{const c=new OfflineAudioContext(1,1,32000);c.decodeAudioData(ab,ok,no);});
        const x=dec.getChannelData(0);let mi=0,mv=0;for(let i=0;i<6400;i++){const v=Math.abs(x[i]);if(v>mv){mv=v;mi=i;}}const off=.25+(mi/32000-.05),P=153.54;
        const oc=new OfflineAudioContext(1,64000,32000),s=oc.createBufferSource();s.buffer=dec;s.loop=true;s.loopStart=off;s.loopEnd=off+P;s.connect(oc.destination);s.start(0,off+P-1);
        const y=(await oc.startRendering()).getChannelData(0);const d=[];for(let i=1;i<y.length;i++)d.push(Math.abs(y[i]-y[i-1]));
        const near=Math.max(...d.slice(32000-80,32000+80)),srt=d.slice().sort((a,b)=>a-b),p99=srt[Math.floor(srt.length*.99)];
        // скачок в шве против соседей: отношение второй разности
        let worst=0;for(let i=32000-40;i<32000+40;i++){const a=Math.abs(y[i+1]-2*y[i]+y[i-1]);let e=0,n=0;for(let k=i-200;k<i+200;k++){if(Math.abs(k-i)<3)continue;const b=y[k+1]-2*y[k]+y[k-1];e+=b*b;n++;}worst=Math.max(worst,a/Math.sqrt(e/n));}
        return {markShiftMs:+((mi/32000-.05)*1000).toFixed(2),decSr:dec.sampleRate,decDur:+dec.duration.toFixed(3),maxStepSeam:+near.toFixed(4),p99Step:+p99.toFixed(4),worstD2Ratio:+worst.toFixed(1)};});
      // 4) метка у спрайтов в браузере (сдвиг декодера) и частота нарезки
      R.sprites=await p.evaluate(async()=>{const out={};for(const f of ['sfx1.mp3','sfx2.mp3']){const ab=await (await fetch('assets/audio/'+f+'?av=3')).arrayBuffer();
        const dec=await new Promise((ok,no)=>{const c=new OfflineAudioContext(1,1,24000);c.decodeAudioData(ab,ok,no);});const x=dec.getChannelData(0);let mi=0,mv=0;for(let i=0;i<4800;i++){const v=Math.abs(x[i]);if(v>mv){mv=v;mi=i;}}
        out[f]={sr:dec.sampleRate,dur:+dec.duration.toFixed(3),markShiftMs:+((mi/24000-.05)*1000).toFixed(2),mark:+mv.toFixed(2)};}return out;});
      // 5) толпа 20 с: голоса, ошибки, NaN
      await crowd(p);const st0=await p.evaluate(()=>window.TCSND.state());let vmax=0;const t0=Date.now();
      while(Date.now()-t0<20000){vmax=Math.max(vmax,await p.evaluate(()=>window.TCSND.state().voices));await sleep(250);}
      const st1=await p.evaluate(()=>window.TCSND.state());
      R.crowd={vmax,played:st1.stat.played-st0.stat.played,dropped:st1.stat.dropped-st0.stat.dropped,errs:st1.stat.errs,mus:st1.mus,maxGenMs:st1.stat.maxGenMs,by:await p.evaluate(()=>window.TCSND.dbg.by())};
      R.nan=await p.evaluate(()=>window.__ev('ENEMIES.filter(e=>!isFinite(e.pos.x)||!isFinite(e.pos.z)||!isFinite(e.hp)).length+(isFinite(P.pos.x)&&isFinite(P.pos.z)&&isFinite(P.hp)?0:1)'));
      // 6) «Благодарности»
      await p.evaluate(()=>window.__ev('clearInterval(window.__crowdI);'));await p.evaluate(()=>document.getElementById('setBtn').click());await sleep(500);
      R.credits=await p.evaluate(()=>{const h=[...document.querySelectorAll('#setBody h3')].find(h=>/Благодарности/.test(h.textContent));const t=h?h.parentNode.textContent:'';
        return {kevin:/Kevin MacLeod/.test(t),kenney:/Kenney/.test(t),jagged:/JaggedStone/.test(t),darsycho:/Darsycho/.test(t),pauliuw:/pauliuw/.test(t),heartfelt:/Heartfelt Battle/.test(t)&&/request/.test(t),own:/свои/.test(t)};});
      R.errs=errs.slice(0,10);await ctx.close();
      // 7) нет сети для записей — синтез, без ошибок страницы
      {const r=await open('&snd=1',{block:/assets\/audio\/(sfx|battle)/});await r.p.touchscreen.tap(220,300);await startGame(r.p,'pyro');await crowd(r.p);
        await r.p.evaluate(()=>window.TCSND.dbg.force('tense'));await sleep(6000);
        R.noNet=await r.p.evaluate(()=>{const s=window.TCSND.state();return {recSt:s.recSt,rec:s.rec,mus:s.mus,batRec:s.batRec,played:s.stat.played,errs:s.stat.errs,recErr:s.stat.recErr||0};});R.noNet.pageErrs=r.errs.slice(0,5);await r.ctx.close();}
      // 8) без OfflineAudioContext — декодирование общим контекстом (48 кГц), метка поправляет сдвиг
      {const r=await open('&snd=1',{noOff:true});await r.p.touchscreen.tap(220,300);
        await r.p.waitForFunction(()=>{const s=window.TCSND.state();return s.recSt[0]>=2&&s.recSt[1]>=2&&s.queue===0;},null,{timeout:30000}).catch(()=>{});
        R.noOffline=await r.p.evaluate(()=>{const s=window.TCSND.state();const v=window.TCSND.dbg.play('hit_f',{g:.05,jit:0});return {recSt:s.recSt,rec:s.rec,sr:v&&v.s.buffer.sampleRate,dur:v&&+v.s.buffer.duration.toFixed(3),errs:s.stat.errs};});
        R.noOffline.pageErrs=r.errs.slice(0,5);await r.ctx.close();}
      res.R=R;console.log(JSON.stringify(R,null,1));
    }else if(MODE==='perf'){
      const runs=[];const plan=[['new',{}],['old',{old:true}],['new',{}],['old',{old:true}],['new',{}],['old',{old:true}]];
      for(const [name,o] of plan){const {ctx,p,errs}=await open('&snd=1',o);await p.touchscreen.tap(220,300);await startGame(p,'pyro');
        await p.evaluate(()=>window.__ev('setInterval(()=>{if(!P.dead)P.hp=P.maxHp;},300);'));await p.evaluate(()=>window.__tc.xp(4000));
        await p.waitForFunction(()=>{const s=window.TCSND.state();return s.queue===0&&s.pend===0&&(!s.recSt||(s.recSt[0]>=2&&s.recSt[1]>=2));},null,{timeout:40000}).catch(()=>{});
        await p.evaluate(()=>window.TCSND.dbg.force('tense'));if(name==='new'){await p.waitForFunction(()=>window.TCSND.dbg.rec().bat,null,{timeout:30000}).catch(()=>{});await p.evaluate(()=>window.TCSND.dbg.force('calm'));await sleep(5000);await p.evaluate(()=>window.TCSND.dbg.force('tense'));}await crowd(p);await sleep(4000);
        const cdp=await ctx.newCDPSession(p);await cdp.send('Performance.enable');
        await p.evaluate(()=>{window.__fr=0;const f=()=>{window.__fr++;requestAnimationFrame(f);};requestAnimationFrame(f);});
        const m=async()=>{const r=await cdp.send('Performance.getMetrics');const g=k=>r.metrics.find(x=>x.name===k).value;return {sd:g('ScriptDuration'),td:g('TaskDuration'),fr:await p.evaluate(()=>window.__fr)};};
        const a=await m();await sleep(12000);const b=await m();const st=await p.evaluate(()=>window.TCSND.state());
        const r={name,frames:b.fr-a.fr,jsMsPerFrame:+(((b.sd-a.sd)*1000)/(b.fr-a.fr)).toFixed(3),taskMsPerFrame:+(((b.td-a.td)*1000)/(b.fr-a.fr)).toFixed(3),rec:st.rec||0,batRec:!!st.batRec,mus:st.mus,voices:st.voices,played:st.stat.played,errs:errs.slice(0,3)};
        runs.push(r);console.log(JSON.stringify(r));await ctx.close();}
      const avg=(n,k)=>{const a=runs.filter(r=>r.name===n);return a.reduce((s,r)=>s+r[k],0)/a.length;};
      res.runs=runs;res.summary={newJs:+avg('new','jsMsPerFrame').toFixed(3),oldJs:+avg('old','jsMsPerFrame').toFixed(3),diffPct:+((avg('new','jsMsPerFrame')/avg('old','jsMsPerFrame')-1)*100).toFixed(1),
        newTask:+avg('new','taskMsPerFrame').toFixed(3),oldTask:+avg('old','taskMsPerFrame').toFixed(3)};
      console.log('ИТОГ',JSON.stringify(res.summary));
    }
  }finally{await browser.close();srv.close();}
  fs.writeFileSync(path.join(OUT,'br_'+MODE+'.json'),JSON.stringify(res,null,1));
}
main().catch(e=>{console.error('СБОЙ',e);process.exit(1);});
