// Независимая проверка куска «Тимур Галиев» (рецензент). Один браузер через замок D:/games/pw_gate.js.
// node rev.js A|S|T|B|C|D [уровни]
//  A — урон 30 с (как balance.js) Тимур против 5 магов; S — выживаемость; T — ступени и все таланты Тимура (80 ур.);
//  B — снимки 360×740 и 440×956 (выбор, книга, бой); C — кооп: гость = Тимур, хост = Криомант; D — старое сохранение.
const fs = require('fs'), path = require('path'), http = require('http');
const pw = require('C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core');
const gate = require('D:/games/pw_gate.js');
const ROOT = 'D:/games', DIR = 'tc-wt-int1331', OUT = __dirname;
const PART = process.argv[2] || 'A', LV = (process.argv[3] || '20,60').split(',').map(Number);
const MAGES = (process.env.CLS || 'timur,pyro,cryo,storm,geo,arcan').split(','), HPK = +(process.env.HPK || 30), SEED = +(process.env.SEED || 7);
const T = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOG = path.join(OUT, 'rev_' + PART.replace(/,/g, '') + '.log');
const log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(s); fs.appendFileSync(LOG, s + '\n'); };
async function openPage(browser, BASE, o = {}) {
  const ctx = await gate.phoneContext(browser, { w: o.w || 440, h: o.h || 956 });
  await ctx.addInitScript(([nick, seed, save]) => { try { localStorage.setItem('tysyacha-nick', nick); if (save && !sessionStorage.getItem('done')) { localStorage.setItem('tysyacha-char-v3', save); sessionStorage.setItem('done', '1'); } } catch (e) {}
    if (seed) { let s = seed; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; } }, [o.nick || 'Тест', o.seed || 0, o.save || null]);
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 300))); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  const E = c => p.evaluate(x => window.__ev(x), c);
  const waitF = async (expr, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 20000)) { try { if (await E(expr)) return true; } catch (e) {} await sleep(150); } return false; };
  await p.goto(BASE + DIR + '/' + (o.qs || '?test=1&debug'));
  if (!await waitF("mode==='select'&&!!$('#selPlay')", 60000)) throw new Error('нет экрана выбора');
  return { ctx, p, E, waitF, errs };
}
const FREEZE = `luQueue=0;luOpen=false;$('#lvlup').hidden=true;try{hideUpg()}catch(e){};syncPause();S.auto=false;S.autoLu=true;S.autoBest=true;
  window.__sp0=window.__sp0||spawnPack;window.__sb0=window.__sb0||spawnBoss;spawnBoss=function(){};spawnPack=function(){};
  window.requestAnimationFrame=function(){return 0};window.__R=window.__R||render;window.__vt=window.__vt||last;
  window.__step=(sec)=>{const n=Math.max(1,Math.round(sec*60));render=function(){};for(let i=0;i<n;i++){__vt+=1000/60;loop(__vt);}render=__R;};true`;
const HOOKS = `(()=>{if(window.__rv)return true;window.__rv={feast:0,ball:0,table:0,kurai:0,saban:0,ech:0,nanTxt:0,peerMsg:0,spdBad:0};
  const w=(n,k)=>{const f0=window[n];window[n]=function(){__rv[k]++;return f0.apply(this,arguments);};};
  {const f0=ctTmFeast;ctTmFeast=function(){__rv.feast++;return f0.apply(this,arguments);};}
  {const f0=ctTmBall;ctTmBall=function(){__rv.ball++;return f0.apply(this,arguments);};}
  {const f0=ctTmTable;ctTmTable=function(){__rv.table++;return f0.apply(this,arguments);};}
  {const f0=tmKurai;tmKurai=function(){__rv.kurai++;return f0.apply(this,arguments);};}
  {const f0=NFRUN.s_sabantuy;NFRUN.s_sabantuy=function(){__rv.saban++;return f0.apply(this,arguments);};}
  {const f0=NFRUN.s_echpoch;NFRUN.s_echpoch=function(){__rv.ech++;return f0.apply(this,arguments);};}
  {const f0=float;float=function(p,t){if(/NaN|undefined|Infinity|null/.test(String(t)))__rv.nanTxt++;return f0.apply(this,arguments);};}
  return true;})()`;
const LVUP = L => `S.autoLu=true;S.autoBest=true;let g=0;while(S.lvl<${L}&&g++<500){gainXp(xpNeed(S.lvl)-S.xp+1);luAutoRun(luQueue);}`;
const FIGHT = (L, hpk, surv) => `(()=>{${LVUP(L)}
  ${surv ? '' : 'P.maxHp=P.hp=1e8;'}P.hp=P.maxHp;P.mp=P.maxMp;S.auto=true;clearWorld();P.pos.set(0,0,0);P.prev.copy(P.pos);for(const k in __rv)__rv[k]=0;
  const sp0=P.speed;let dmg=0,nan=0,taken=0,healed=0,refill=0,minHp=1;const d0=dealDamage,h0=hurtPlayer,he0=heal;
  dealDamage=function(en,b,el,o){if(!isFinite(b))nan++;const h=en.hp;const x=d0.apply(this,arguments);if(!isFinite(en.hp))nan++;dmg+=Math.max(0,h-Math.max(0,en.hp));return x;};
  hurtPlayer=function(){const h=P.hp;const x=h0.apply(this,arguments);taken+=Math.max(0,h-P.hp);minHp=Math.min(minHp,P.hp/P.maxHp);if(P.hp<P.maxHp*.2){refill++;P.hp=P.maxHp;}return x;};
  heal=function(n){const h=P.hp;const x=he0.apply(this,arguments);healed+=Math.max(0,P.hp-h);return x;};
  const mobs=Object.keys(MOBS).filter(k=>!MOBS[k].boss&&!MOBS[k].as);
  const wave=()=>{for(let i=0;i<10;i++){const a=i/10*TAU;const en=spawnEnemy(mobs[i%3],P.pos.x+Math.cos(a)*(6+i%3*2),P.pos.z+Math.sin(a)*(6+i%3*2),${L});if(en){en.aggro=true;en.maxHp*=${hpk};en.hp=en.maxHp;}}};
  const k0=S.kills;for(let t=0;t<10;t++){wave();__step(3);${surv ? '' : 'P.hp=P.maxHp;'}}dealDamage=d0;hurtPlayer=h0;heal=he0;
  const fin=[P.hp,P.mp,P.maxMp,P.maxHp,P.speed,S.xp,CT.tmPot||0,...ENEMIES.map(e=>e.hp)].every(v=>isFinite(v));
  return {cls:CLS.id,lvl:S.lvl,kills:S.kills-k0,dmg:Math.round(dmg),nan,fin,hud:CT.hudK,dead:P.dead,spd:[+sp0.toFixed(3),+P.speed.toFixed(3)],
    taken:+(taken/P.maxHp).toFixed(2),healed:+(healed/P.maxHp).toFixed(2),refill,minHp:+minHp.toFixed(2),maxHp:Math.round(P.maxHp),
    rv:CLS.id==='timur'?Object.assign({},__rv):undefined,act:S.active.filter(v=>v!=null).map(id=>SKILLS[id].F.id+'/'+SKILLS[id].E.id).join(' '),pas:S.passive.filter(v=>v!=null).map(id=>SKILLS[id].F.id+'/'+SKILLS[id].E.id).join(' ')};})()`;
async function fightRun(g, cid, L, hpk, surv, pre) {
  await g.E(`SAVE.chars={};selectClass('${cid}');startGame();true`); await g.waitF("mode==='game'", 15000); await g.E(FREEZE); await g.E(HOOKS);
  if (pre) await g.E(pre);
  const x = await g.E(FIGHT(L, hpk, surv));
  await g.E(`S.auto=false;spawnPack=__sp0;spawnBoss=__sb0;toSelect();true`); await g.waitF("mode==='select'", 10000);
  return x;
}
async function partA(browser, BASE) {
  const g = await openPage(browser, BASE, { seed: SEED }); const res = [];
  try { for (const L of LV) { const row = {}; for (const c of MAGES) { const x = await fightRun(g, c, L, HPK, false); res.push(x); row[c] = x.dmg;
        log('A', c, 'ур.' + L, 'hpk', HPK, 'урон', x.dmg, 'убито', x.kills, x.nan || !x.fin ? 'NaN!' : '', x.rv ? JSON.stringify(x.rv) : '', x.hud, x.cls === 'timur' ? '| ' + x.act + ' | ' + x.pas + ' | скорость ' + x.spd : ''); }
      const m = MAGES.filter(c => c !== 'timur').map(c => row[c]), am = m.reduce((s, v) => s + v, 0) / m.length, gm = Math.exp(m.reduce((s, v) => s + Math.log(Math.max(1, v)), 0) / m.length);
      const med = [...m].sort((a, b) => a - b)[m.length >> 1];
      log('ИТОГ ур.' + L, 'Тимур/среднее', (row.timur / am).toFixed(3), 'Тимур/геом', (row.timur / gm).toFixed(3), 'Тимур/медиана', (row.timur / med).toFixed(3)); }
  } finally { log('A ошибки страницы', g.errs.length, g.errs.slice(0, 6)); await g.ctx.close(); }
}
async function partS(browser, BASE) {
  const g = await openPage(browser, BASE, { seed: SEED });
  try { for (const L of LV) for (const c of MAGES) { const x = await fightRun(g, c, L, +(process.env.SHPK || 2), true);
      log('S', c, 'ур.' + L, 'здоровье', x.maxHp, 'получил', x.taken, 'вылечил', x.healed, 'падений<20%', x.refill, 'мин', x.minHp, 'убито', x.kills, 'урон', x.dmg, x.nan || !x.fin ? 'NaN!' : ''); }
  } finally { log('S ошибки страницы', g.errs.length, g.errs.slice(0, 6)); await g.ctx.close(); }
}
// все ступени и таланты Тимура: 80 ур., все ветки на максимум (в т.ч. «Застолье»)
async function partT(browser, BASE) {
  const g = await openPage(browser, BASE, { seed: SEED });
  try {
    for (const tal of ['', 'ti_honey:5,ti_fast:2,ti_balls:3,ti_feast:3,ti_table:1']) for (const L of [30, 55, 80]) {
      const pre = tal ? `(()=>{${LVUP(L)}for(const kv of '${tal}'.split(',')){const [k,v]=kv.split(':');S.talents[k]=+v;}computeStats();recalcStats();onBuildChanged&&onBuildChanged();return true;})()` : null;
      const x = await fightRun(g, 'timur', L, 30, false, pre);
      log('T', tal || 'без талантов', 'ур.' + L, 'ступень', await g.E('ctTier()'), 'урон', x.dmg, x.nan || !x.fin ? 'NaN!' : '', JSON.stringify(x.rv), 'скорость', x.spd, x.hud);
    }
    // описания талантов и особенности без NaN/undefined
    await g.E(`SAVE.chars={};selectClass('timur');true`);
    const txt = await g.E(`(()=>{const o=[];for(const t of CT_TAL.timur)for(let v=0;v<=t.max;v++)o.push(t.f(v,3)+' | '+(t.d?t.d(v,3):''));o.push(CT_DEF.timur.d,...CT_DEF.timur.t);return o.join('\\n');})()`);
    log('T тексты талантов:\n' + txt); log('T плохие тексты', /NaN|undefined|null/.test(txt));
  } finally { log('T ошибки страницы', g.errs.length, g.errs.slice(0, 6)); await g.ctx.close(); }
}
async function partB(browser, BASE) {
  for (const [w, h] of [[360, 740], [440, 956]]) {
    const g = await openPage(browser, BASE, { qs: '?debug', w, h }); const shot = n => g.p.screenshot({ path: path.join(OUT, n + '_' + w + '.png') });
    try {
      await g.E("SAVE.chars={};selectClass('timur');true"); await sleep(2500);
      await g.E("(()=>{const el=$('#classes .cls.on');if(el)el.scrollIntoView({block:'nearest',inline:'center'});return true;})()"); await sleep(400);
      await shot('vybor');
      const ov = await g.E("(()=>{const d=document.documentElement;return JSON.stringify({sw:d.scrollWidth,cw:d.clientWidth,n:$('#classes').children.length})})()"); log('B', w, 'выбор', ov);
      await g.E('startGame();true'); await g.waitF("mode==='game'", 20000);
      await g.E(`S.autoLu=true;S.autoBest=true;let k=0;while(S.lvl<25&&k++<300){gainXp(xpNeed(S.lvl)-S.xp+1);luAutoRun(luQueue);}luQueue=0;luOpen=false;$('#lvlup').hidden=true;try{hideUpg()}catch(e){};syncPause();P.hp=P.maxHp;P.mp=P.maxMp;true`);
      await sleep(1500);
      await g.E(`(()=>{for(let i=0;i<8;i++){const a=i/8*TAU,d=5+i%3*1.5;const en=spawnEnemy(['goblin','skeleton','wolf'][i%3],P.pos.x+Math.cos(a)*d,P.pos.z+Math.sin(a)*d,S.lvl);if(en){en.maxHp*=20;en.hp=en.maxHp;en.aggro=true;}}S.auto=true;return true;})()`);
      await sleep(4000); await shot('boi');
      log('B', w, 'худ', await g.E('CT.hudK'), 'активные', await g.E("S.active.filter(v=>v!=null).map(i=>SKILLS[i].F.id).join(' ')"));
      await g.E("S.auto=false;openBook('lib');true"); await sleep(800); await shot('kniga');
      await g.E("openBook('tal');true"); await sleep(600); await g.E("(()=>{const b=document.querySelector('#tpTabs [data-tab=cls]');if(b)b.click();return true;})()"); await sleep(500); await shot('talanty');
      await g.E('closeBook();true');
    } finally { log('B', w, 'ошибки страницы', g.errs.length, g.errs.slice(0, 6)); await g.ctx.close(); }
  }
}
// кооп: гость — Тимур, хост — Криомант
async function partC(browser, BASE) {
  const A = await openPage(browser, BASE, { nick: 'Хост', qs: '?debug' }); let B = null;
  try {
    await A.E("selectClass('cryo');true"); await A.p.click('#selCoop'); await sleep(600);
    if (await A.p.isVisible('[data-a=create]').catch(() => false)) await A.p.click('[data-a=create]');
    await A.p.waitForSelector('#lobPanel', { timeout: 30000 }); await sleep(1200);
    const code = await A.E('MP.code'); log('C комната', code);
    B = await openPage(browser, BASE, { nick: 'Гость', qs: '?room=' + code + '&debug' });
    if (await B.p.isVisible('#nickIn').catch(() => false)) { await B.p.fill('#nickIn', 'Гость'); await B.p.click('#nickOk'); await sleep(400); }
    await B.E("selectClass('timur');true"); await sleep(500); await B.p.click('#selJoin');
    const link = await A.waitF('!!(MP.peer&&MP.peerId)', 90000) && await B.waitF('!!(MP.peer&&MP.peerId)', 60000); log('C связь', link);
    if (!link) return;
    await B.waitF('LOB.on&&!!LOB.ph', 20000); await A.waitF('LOB.on&&!!LOB.ph', 20000); await sleep(800);
    log('C хост видит в лобби класс гостя:', await A.E('MP.peer.cls'));
    await B.p.click('[data-l=rdy]').catch(e => log('rdyB', e.message)); await sleep(600); await A.p.click('[data-l=rdy]').catch(e => log('rdyA', e.message)); await sleep(900);
    await A.p.click('[data-l=go]').catch(e => log('go', e.message)); await sleep(600); if (await A.p.$('.lob-warn')) await A.p.click('[data-l=go]').catch(() => {});
    const game = await A.waitF("mode==='game'", 40000) && await B.waitF("mode==='game'", 40000); log('C в игре', game, await A.E('PLAY'), 'гость класс', await B.E('CLS.id'));
    if (!game) return;
    await sleep(2500);
    for (const g of [A, B]) await g.E("S.sandbox=true;S.lvl=25;computeStats();recalcStats();P.hp=P.maxHp;P.mp=P.maxMp;luQueue=0;luOpen=false;$('#lvlup').hidden=true;try{hideUpg()}catch(e){};syncPause();true");
    await A.E(`window.__hc={heal:0,hmsg:0};{const f0=ctPeerFx;ctPeerFx=function(m){if(m.hl>0)__hc.hmsg++;return f0.apply(this,arguments);};}true`);
    await A.E('P.pos.set(MP.peer.pos.x+2.5,0,MP.peer.pos.z+1);P.prev.copy(P.pos);true'); await sleep(1500);
    log('C модель Тимура у хоста:', await A.E("JSON.stringify({cls:MP.peer.cls,hero:!!MP.peer.hero,mdl:!!(MP.peer.hero&&MP.peer.hero.mdl)})"));
    // враги у хоста рядом с гостем
    await A.E(`(()=>{const c=MP.peer.pos;window.__ens=[];for(let i=0;i<8;i++){const a=i/8*TAU,d=4+i%2*1.5;const en=spawnEnemy(['goblin','skeleton'][i%2],c.x+Math.cos(a)*d,c.z+Math.sin(a)*d,S.lvl);if(en){en.maxHp*=40;en.hp=en.maxHp;en.aggro=true;__ens.push(en);}}return true;})()`);
    await sleep(1500);
    const hp0 = await A.E('P.hp=Math.round(P.maxHp*.5);P.hp');
    // Сабантуй гостя: оглушает ли он врагов на хосте?
    await B.E(`(()=>{const id=[...CLS.pool].find(i=>SKILLS[i].F.id==='s_sabantuy'&&SKILLS[i].m===0);P.mp=P.maxMp;P.cds[id]=0;cast(SKILLS[id]);return true;})()`);
    let stunMax = 0, hopN = 0;
    for (let i = 0; i < 12; i++) { await sleep(250); const s = await A.E(`JSON.stringify(__ens.filter(e=>!e.dead).map(e=>[+(e.stun||0).toFixed(2),e.hop?1:0]))`); const arr = JSON.parse(s); for (const [st, hp] of arr) { stunMax = Math.max(stunMax, st); hopN += hp; } }
    log('C Сабантуй гостя → у хоста: макс. оглушение врагов', stunMax, 'подлётов', hopN, 'бодрость хоста', await A.E('time<(NFS.tmBuffT||0)'));
    await B.E('CT.tmN=ctTmNeed()-1;ctTmAdd(1);true'); await sleep(1500);
    const hp1 = await A.E('Math.round(P.hp)'); log('C лечение хоста от угощения гостя', hp0, '→', hp1, 'сообщений', await A.E('JSON.stringify(__hc)'));
    await B.E(`(()=>{const id=[...CLS.pool].find(i=>SKILLS[i].F.id==='s_echpoch'&&SKILLS[i].m===0);P.mp=P.maxMp;P.cds[id]=0;cast(SKILLS[id]);return true;})()`); await sleep(1200);
    await A.p.screenshot({ path: path.join(OUT, 'koop_host_vidit_timura.png') }); await B.p.screenshot({ path: path.join(OUT, 'koop_gost_timur.png') });
    log('C урон врагам у хоста', await A.E('JSON.stringify(__ens.map(e=>Math.round(100*e.hp/e.maxHp)))'));
  } catch (e) { log('C ошибка', e.message); }
  finally { log('C ошибки страницы хост', A.errs.length, A.errs.slice(0, 5), 'гость', B ? B.errs.length : '-', B ? B.errs.slice(0, 5) : '');
    try { await A.ctx.close(); } catch (e) {} if (B) try { await B.ctx.close(); } catch (e) {} }
}
// старое сохранение v13.8: грузится, Тимур выбирается, после игры Тимуром сохраняется и читается снова
async function partD(browser, BASE) {
  const save = fs.readFileSync('D:/games/_sc_check/save_v138.json', 'utf8');
  const g = await openPage(browser, BASE, { save, seed: SEED });
  try {
    log('D старое: классы', await g.E("JSON.stringify(Object.keys(SAVE.chars))"), 'Тимур в списке', await g.E("!!$('#classes [data-c=timur]')"));
    await g.E("selectClass('timur');startGame();true"); await g.waitF("mode==='game'", 20000); await g.E(FREEZE);
    await g.E(`${LVUP(12)}S.auto=true;true`); await g.E('__step(5);true');
    await g.E('S.auto=false;spawnPack=__sp0;spawnBoss=__sb0;toSelect();true'); await g.waitF("mode==='select'", 10000);
    log('D после игры Тимуром: сохранено', await g.E("JSON.stringify(SAVE.chars.timur&&{lvl:SAVE.chars.timur.lvl||SAVE.chars.timur.best||1})"), 'другие классы', await g.E("Object.keys(SAVE.chars).length"));
    await g.p.reload(); await g.waitF("mode==='select'&&!!$('#selPlay')", 60000);
    log('D после перезагрузки', await g.E("JSON.stringify({timur:!!SAVE.chars.timur,n:Object.keys(SAVE.chars).length,sel:selId})"));
  } finally { log('D ошибки страницы', g.errs.length, g.errs.slice(0, 6)); await g.ctx.close(); }
}
// кооп 2: гость — Тимур, хост — Берсерк (без своего контроля): несут ли удары Сабантуя гостя оглушение на хост; лечение хоста при неуязвимости
async function partC2(browser, BASE) {
  const A = await openPage(browser, BASE, { nick: 'Хост', qs: '?debug' }); let B = null;
  try {
    await A.E("selectClass('bers');true"); await A.p.click('#selCoop'); await sleep(600);
    if (await A.p.isVisible('[data-a=create]').catch(() => false)) await A.p.click('[data-a=create]');
    await A.p.waitForSelector('#lobPanel', { timeout: 30000 }); await sleep(1200);
    const code = await A.E('MP.code');
    B = await openPage(browser, BASE, { nick: 'Гость', qs: '?room=' + code + '&debug' });
    if (await B.p.isVisible('#nickIn').catch(() => false)) { await B.p.fill('#nickIn', 'Гость'); await B.p.click('#nickOk'); await sleep(400); }
    await B.E("selectClass('timur');true"); await sleep(500); await B.p.click('#selJoin');
    const link = await A.waitF('!!(MP.peer&&MP.peerId)', 90000) && await B.waitF('!!(MP.peer&&MP.peerId)', 60000); log('C2 связь', link); if (!link) return;
    await B.waitF('LOB.on&&!!LOB.ph', 20000); await A.waitF('LOB.on&&!!LOB.ph', 20000); await sleep(800);
    await B.p.click('[data-l=rdy]').catch(() => {}); await sleep(600); await A.p.click('[data-l=rdy]').catch(() => {}); await sleep(900);
    await A.p.click('[data-l=go]').catch(() => {}); await sleep(600); if (await A.p.$('.lob-warn')) await A.p.click('[data-l=go]').catch(() => {});
    const game = await A.waitF("mode==='game'", 40000) && await B.waitF("mode==='game'", 40000); log('C2 в игре', game); if (!game) return;
    await sleep(2500);
    for (const g of [A, B]) await g.E("S.sandbox=true;S.lvl=25;computeStats();recalcStats();P.hp=P.maxHp;P.mp=P.maxMp;luQueue=0;luOpen=false;$('#lvlup').hidden=true;try{hideUpg()}catch(e){};syncPause();true");
    await A.E(`window.__hh={msgs:0,sx:0};{const f0=mpHostHit;mpHostHit=function(m){__hh.msgs++;if(m.sx)__hh.sx++;return f0.apply(this,arguments);};}
      window.__st=0;{const f0=stunEn;stunEn=function(en,t){__st++;return f0.apply(this,arguments);};}
      {const f0=hop;hop=function(){window.__hop=(window.__hop||0)+1;return f0.apply(this,arguments);};}true`);
    await A.E('P.pos.set(MP.peer.pos.x+2.5,0,MP.peer.pos.z+1);P.prev.copy(P.pos);P.invulnT=1e6;true'); await sleep(1200);
    await A.E(`(()=>{const c=MP.peer.pos;window.__ens=[];for(let i=0;i<6;i++){const a=i/6*TAU,d=4;const en=spawnEnemy('goblin',c.x+Math.cos(a)*d,c.z+Math.sin(a)*d,S.lvl);if(en){en.maxHp*=60;en.hp=en.maxHp;en.aggro=true;__ens.push(en);}}return true;})()`);
    await sleep(1500);
    await A.E('__hh.msgs=0;__hh.sx=0;__st=0;window.__hop=0;true');
    await B.E(`(()=>{const id=[...CLS.pool].find(i=>SKILLS[i].F.id==='s_sabantuy'&&SKILLS[i].m===0);P.mp=P.maxMp;P.cds[id]=0;cast(SKILLS[id]);return true;})()`);
    let stunMax = 0; for (let i = 0; i < 18; i++) { await sleep(250); stunMax = Math.max(stunMax, await A.E('Math.max(0,...__ens.filter(e=>!e.dead).map(e=>e.stun||0))')); }
    log('C2 Сабантуй гостя: у хоста ударов от гостя', await A.E('JSON.stringify(__hh)'), 'вызовов stunEn', await A.E('__st'), 'подлётов', await A.E('window.__hop'), 'макс. оглушение', +stunMax.toFixed(2));
    const hp0 = await A.E('P.hp=Math.round(P.maxHp*.5);P.hp'); await B.E('CT.tmN=ctTmNeed()-1;ctTmAdd(1);true'); await sleep(1500);
    log('C2 хост неуязвим, лечение от чак-чака гостя', hp0, '→', await A.E('Math.round(P.hp)'), 'из', await A.E('Math.round(P.maxHp)'));
  } catch (e) { log('C2 ошибка', e.message); }
  finally { log('C2 ошибки страницы хост', A.errs.length, A.errs.slice(0, 5), 'гость', B ? B.errs.length : '-', B ? B.errs.slice(0, 5) : '');
    try { await A.ctx.close(); } catch (e) {} if (B) try { await B.ctx.close(); } catch (e) {} }
}
// разное: размер пула чар у героев; скорость после Курая возвращается
async function partX(browser, BASE) {
  const g = await openPage(browser, BASE, { seed: SEED });
  try {
    log('X пулы', await g.E("CLASSES.map(c=>c.id+':'+c.pool.length).join(' ')"));
    await g.E(`SAVE.chars={};selectClass('timur');startGame();true`); await g.waitF("mode==='game'", 15000); await g.E(FREEZE);
    const r = await g.E(`(()=>{${LVUP(20)}S.auto=false;clearWorld();P.pos.set(0,0,0);const kp=[...CLS.pool].find(i=>SKILLS[i].F.id==='s_kurai');if(!S.passive.includes(kp))S.passive[0]=kp;onBuildChanged();
      const base=P.speed;for(let i=0;i<6;i++){const en=spawnEnemy('goblin',P.pos.x+3+i*.3,P.pos.z,S.lvl);en.maxHp*=50;en.hp=en.maxHp;}P.hp=P.maxHp*.5;
      const s=[];for(let t=0;t<8;t++){__step(1);s.push(+P.speed.toFixed(2));}clearWorld();P.hp=P.maxHp;__step(4);const after=P.speed;
      computeStats();recalcStats();const re=P.speed;return JSON.stringify({base,s,after,re});})()`);
    log('X скорость с Кураем', r);
  } finally { log('X ошибки страницы', g.errs.length, g.errs.slice(0, 6)); await g.ctx.close(); }
}
// скорость с Кураем без подлога: естественный билд 60-го и ровно один Курай (с эхом и без); можно ли поставить два Курая через equip()
async function partX2(browser, BASE) {
  const g = await openPage(browser, BASE, { seed: SEED });
  try {
    await g.E(`SAVE.chars={};selectClass('timur');startGame();true`); await g.waitF("mode==='game'", 15000); await g.E(FREEZE);
    const probe = `(()=>{const ku=S.passive.filter(v=>v!=null&&SKILLS[v].F.id==='s_kurai');const pa=(NFS.pa||[]).filter(a=>a.sk&&a.sk.F.id==='s_kurai').length;
      clearWorld();P.pos.set(0,0,0);for(let i=0;i<6;i++){const en=spawnEnemy('goblin',P.pos.x+3+i*.3,P.pos.z,S.lvl);en.maxHp*=500;en.hp=en.maxHp;en.spd=0;}
      const base=P.speed;const s=[];for(let t=0;t<12;t++){P.hp=P.maxHp*.5;__step(1);s.push(+P.speed.toFixed(2));}clearWorld();P.hp=P.maxHp;__step(5);
      return JSON.stringify({kurai:ku.map(v=>SKILLS[v].M.name),nfp:pa,base,s,after:+P.speed.toFixed(3)});})()`;
    await g.E(`(()=>{${LVUP(60)}S.auto=false;return true;})()`);
    log('X2 естественный билд 60', await g.E(probe), '| пассивки', await g.E("S.passive.filter(v=>v!=null).map(v=>SKILLS[v].F.id+'/'+SKILLS[v].M.name).join(' ')"));
    for (const want of ['echo', 'none']) {
      const r = await g.E(`(()=>{computeStats();recalcStats();for(let i=0;i<S.passive.length;i++){const v=S.passive[i];if(v!=null&&SKILLS[v].F.id==='s_kurai')S.passive[i]=null;}
        const L=[...LEARNED].concat(Object.keys(SKILLS).map(Number)).filter(i=>SKILLS[i]&&SKILLS[i].F.id==='s_kurai');const id=L.find(i=>'${want}'==='echo'?SKILLS[i].M.echo:!SKILLS[i].M.echo&&!(SKILLS[i].M.count>1));
        const j=S.passive.findIndex((v,i)=>i<passiveSlots()&&v==null);S.passive[j>=0?j:0]=id;onBuildChanged();return SKILLS[id].M.name;})()`);
      log('X2 один Курай (' + r + ')', await g.E(probe));
    }
    // два варианта Курая через equip(): второй должен заменить первый (одна база)
    log('X2 equip двух вариантов', await g.E(`(()=>{const L=Object.keys(SKILLS).map(Number).filter(i=>SKILLS[i]&&SKILLS[i].F.id==='s_kurai');for(const id of L)LEARNED.add(id);equip(L[0]);equip(L[1]);return S.passive.filter(v=>v!=null&&SKILLS[v].F.id==='s_kurai').length;})()`));
  } finally { log('X2 ошибки страницы', g.errs.length, g.errs.slice(0, 6)); await g.ctx.close(); }
}
// лобби коопа 360×740 (21 герой) и «Герои» в книге
async function partL(browser, BASE) {
  const g = await openPage(browser, BASE, { qs: '?debug', w: 360, h: 740 });
  try {
    await g.E("selectClass('timur');true"); await g.p.click('#selCoop'); await sleep(600);
    if (await g.p.isVisible('[data-a=create]').catch(() => false)) await g.p.click('[data-a=create]');
    await g.p.waitForSelector('#lobPanel', { timeout: 30000 }); await sleep(1500);
    await g.p.screenshot({ path: path.join(OUT, 'lobbi_360.png') });
    log('L лобби', await g.E("(()=>{const d=document.documentElement;return JSON.stringify({sw:d.scrollWidth,cw:d.clientWidth,n:document.querySelectorAll('.lcl').length,on:(document.querySelector('.lcl.on')||{}).textContent})})()"));
    const tl = await g.p.$('.lcl[data-c=timur]'); if (tl) { await tl.scrollIntoViewIfNeeded().catch(() => {}); await sleep(300); await g.p.screenshot({ path: path.join(OUT, 'lobbi_360_timur.png') }); }
  } finally { log('L ошибки страницы', g.errs.length, g.errs.slice(0, 6)); await g.ctx.close(); }
  const h = await openPage(browser, BASE, { qs: '?debug', w: 360, h: 740 });
  try {
    await h.E("SAVE.chars={};selectClass('timur');startGame();true"); await h.waitF("mode==='game'", 20000); await sleep(1500);
    await h.E("openBook('lib');true"); await sleep(700); await h.p.click('#heroBtn').catch(e => log('heroBtn', e.message)); await sleep(800);
    await h.p.screenshot({ path: path.join(OUT, 'geroi_360.png') });
    log('L «Герои»: Тимур упомянут', await h.E("document.body.innerText.includes('Тимур')"));
  } finally { log('L2 ошибки страницы', h.errs.length, h.errs.slice(0, 6)); await h.ctx.close(); }
}
// «Авто»/«Лучший билд»: ставит ли он фирменные чары героя (активную, пассивную, ульту) — Тимур против остальных 20
async function partY(browser, BASE) {
  const g = await openPage(browser, BASE, { seed: SEED }); const ids = (process.env.YCLS || 'timur,pyro,cryo,storm,plague,necro,paladin,geo,windr,hemo,arcan,bers,dk,druid,hunter,assassin,shaman,monk,lock,inq,alch').split(',');
  try { for (const L of [20, 40, 60, 100]) { const row = [];
      for (const c of ids) { await g.E(`SAVE.chars={};selectClass('${c}');startGame();true`); await g.waitF("mode==='game'", 15000); await g.E(FREEZE);
        const r = await g.E(`(()=>{${LVUP(L)}const eq=new Set([...S.active,...S.passive].filter(v=>v!=null).map(v=>SKILLS[v].F.id));return CLS.sig.map(s=>eq.has(s)?'+':'-').join('');})()`);
        row.push(c + ':' + r); await g.E(`S.auto=false;spawnPack=__sp0;spawnBoss=__sb0;toSelect();true`); await g.waitF("mode==='select'", 10000); }
      log('Y ур.' + L, row.join(' ')); }
  } finally { log('Y ошибки страницы', g.errs.length, g.errs.slice(0, 6)); await g.ctx.close(); }
}
(async () => {
  const srv = http.createServer((q, s) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); if (!path.resolve(f).startsWith(path.resolve(ROOT))) { s.writeHead(403); return s.end(); }
    fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); s.end(d); }); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port + '/';
  const { browser } = await gate.launch(pw, { label: 'rev-timur-' + PART, launch: { args: [...gate.ARGS, '--disable-features=WebRtcHideLocalIpsWithMdns'] } });
  const t0 = Date.now();
  try { for (const pp of PART.split(',')) { try { await ({ A: partA, S: partS, T: partT, B: partB, C: partC, C2: partC2, D: partD, X: partX, X2: partX2, Y: partY, L: partL })[pp](browser, BASE); } catch (e) { log('ЧАСТЬ', pp, 'ОШИБКА', e.stack || e.message); } } }
  finally { await browser.close(); srv.close(); log('время', Math.round((Date.now() - t0) / 1000), 'с'); }
})().catch(e => { log('ОШИБКА', e.stack || e.message); process.exit(1); });
