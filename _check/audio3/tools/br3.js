// Раунд 3 в браузере (через замок D:/games/pw_gate.js): node br3.js
// 1) до касания — ни контекста, ни загрузки; после — 3 спрайта; все ключи играют; у h_ice/h_earth варианты слились с прежними
// 2) фон: пещера → лес → ветер → синтез (болото): грузится только файл своего региона, петля включена, loopStart/End, переключения без ошибок
// 3) шов петель в браузерном декодере (рендер через loopEnd) при сдвигах ±0,1 с
// 4) нет сети — синтез фона и звуков, без ошибок страницы; 5) «Благодарности»
const path = require('path'), fs = require('fs'), http = require('http');
const PW = 'C:/Users/artem/AppData/Roaming/npm/node_modules/@playwright/mcp/node_modules/playwright-core';
const gate = require('D:/games/pw_gate.js');
const ROOT = 'D:/games/tc-wt-audio3', OUT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function main() {
  const pw = require(PW);
  const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith(path.sep) || f.endsWith('/')) f += 'index.html';
    fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); }).listen(0);
  const base = `http://127.0.0.1:${srv.address().port}/index.html`;
  const { browser } = await gate.launch(pw, { label: 'audio3_smoke' });
  const R = {};
  try {
    async function open(q, opt = {}) {
      const ctx = await gate.phoneContext(browser, { w: 440, h: 956 });
      await ctx.addInitScript(() => { try { localStorage.setItem('tysyacha-nick', 'Тест'); } catch (e) {} });
      if (opt.block) await ctx.route(opt.block, r => r.fulfill({ status: 404, body: '' }));
      const p = await ctx.newPage(); const errs = [], reqs = [];
      p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push('c:' + m.text().slice(0, 200)); });
      p.on('response', q => { if (/assets\/audio\//.test(q.url())) reqs.push(q.status() + ' ' + q.url().replace(/^.*assets\/audio\//, '')); });
      await p.goto(base + '?test=1&debug' + q); await p.waitForFunction(() => !!window.__tc && !!window.__ev && !!document.getElementById('selPlay'), null, { timeout: 60000 });
      return { ctx, p, errs, reqs };
    }
    async function startGame(p, cls) {
      await p.evaluate(c => window.__tc.sel(c), cls); await p.evaluate(() => document.getElementById('selPlay').click());
      await p.waitForFunction(() => window.__tc.state().mode === 'game', null, { timeout: 30000 });
    }
    let { ctx, p, errs, reqs } = await open('&snd=1');
    R.before = { ctx: await p.evaluate(() => window.TCSND.state().ctx), reqs: reqs.length };
    await p.touchscreen.tap(220, 300);
    await p.waitForFunction(() => { const s = window.TCSND.state(); return s.recSt[0] >= 2 && s.recSt[1] >= 2 && s.recSt[2] >= 2 && s.queue === 0; }, null, { timeout: 30000 }).catch(() => {});
    R.loaded = await p.evaluate(() => { const s = window.TCSND.state(), r = window.TCSND.dbg.rec(); return { ctx: s.ctx, recSt: s.recSt, keys: r.on.length, errs: s.stat.errs, recErr: s.stat.recErr || 0, has: ['h_fire', 'h_poison', 'h_wind', 'h_ice', 'h_earth'].map(k => k + ':' + window.TCSND.dbg.bufs(k).length) }; });
    R.keys = await p.evaluate(async () => { const out = {}; for (const k of ['h_fire', 'h_poison', 'h_wind', 'h_ice', 'h_earth', 'h_storm', 'h_blood']) { const v = window.TCSND.dbg.play(k, { g: .05, jit: 0, pri: 9, key: 't' + k }); out[k] = v ? 'ok' : 'нет голоса'; if (v) try { v.s.stop(); } catch (e) {} await new Promise(r => setTimeout(r, 40)); } return out; });
    R.cutCheck = await p.evaluate(() => { const bad = []; let n = 0; for (const k of ['h_fire', 'h_poison', 'h_wind', 'h_ice', 'h_earth']) { for (const b of window.TCSND.dbg.bufs(k)) { n++; const x = b.getChannelData(0), sr = b.sampleRate, pk = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      const rms = (a, c) => { let e = 0; for (let i = a; i < c; i++) e += x[i] * x[i]; return Math.sqrt(e / Math.max(1, c - a)); }; const pre = rms(Math.round(.0032 * sr), Math.round(.0038 * sr)), post = rms(x.length - Math.round(.007 * sr), x.length - Math.round(.0035 * sr));
      const db = v => 20 * Math.log10(v / pk + 1e-9); if (!(pk > .05) || db(pre) > -45 || db(post) > -45) bad.push(k + ' пик ' + pk.toFixed(2) + ' до ' + db(pre).toFixed(0) + ' после ' + db(post).toFixed(0)); } } return { buffers: n, bad }; });
    await startGame(p, 'pyro');
    R.regions = [];
    for (const k of ['cave', 'forest', 'windy', 'swamp', 'abyss', 'sky']) {
      await p.evaluate(k => window.TCSND.dbg.ambSet(k), k);
      await p.waitForFunction(k => { const a = window.TCSND.dbg.ambRec(); return a.kind === k && (!/^(cave|forest|windy|abyss|sky)$/.test(k) || a.tag === k + '@'); }, k, { timeout: 25000 }).catch(() => {});
      await sleep(600);
      R.regions.push(Object.assign({ want: k, reqs: reqs.filter(r => /amb_/.test(r)).join(',') }, await p.evaluate(() => { const a = window.TCSND.dbg.ambRec(), s = window.TCSND.state(); return Object.assign(a, { voices: s.voices, errs: s.stat.errs, ambErr: s.stat.ambErr || 0, buffers: s.beds }); })));
    }
    R.reqsAll = reqs.slice();
    // шов в браузерном декодере
    R.seam = await p.evaluate(async () => {
      const F = { cave: ['amb_cave.mp3', 91.3098, .6, 22050], forest: ['amb_forest.mp3', 41.736, .6, 22050], wind: ['amb_wind.mp3', 15.5, .6, 22050] }, out = {};
      const _s = await (await fetch('audio.js')).text(), AV = _s.match(/const AV=(\d+)/)[1];
      for (const k in F) { const [f, P, t0, sr] = F[k]; const ab = await (await fetch('assets/audio/' + f + '?av=' + AV)).arrayBuffer();
        const dec = await new Promise((ok, no) => { const c = new OfflineAudioContext(1, 1, sr); c.decodeAudioData(ab, ok, no); }); out[k] = { dur: +dec.duration.toFixed(3), sr: dec.sampleRate, sh: {} };
        for (const sh of [-.1, 0, .1]) { const ls = t0 + sh, le = ls + P; const oc = new OfflineAudioContext(1, sr * 2, sr), s = oc.createBufferSource(); s.buffer = dec; s.loop = true; s.loopStart = ls; s.loopEnd = le; s.connect(oc.destination); s.start(0, le - 1);
          const y = (await oc.startRendering()).getChannelData(0), n = sr, d = []; for (let i = 1; i < y.length; i++) d.push(Math.abs(y[i] - y[i - 1])); const srt = d.slice().sort((a, b) => a - b), p999 = srt[Math.floor(srt.length * .999)];
          let worst = 0; for (let i = n - 20; i < n + 20; i++) { const a = Math.abs(y[i + 1] - 2 * y[i] + y[i - 1]); let e = 0, m = 0; for (let q = i - 300; q < i + 300; q++) { if (Math.abs(q - i) < 3) continue; const b = y[q + 1] - 2 * y[q] + y[q - 1]; e += b * b; m++; } worst = Math.max(worst, a / Math.sqrt(e / m)); }
          out[k].sh[sh] = { seamStep: +Math.max(...d.slice(n - 40, n + 40)).toFixed(5), p999: +p999.toFixed(5), d2ratio: +worst.toFixed(2) }; } }
      return out; });
    // «Благодарности»
    await p.evaluate(() => document.getElementById('setBtn').click()); await sleep(500);
    R.credits = await p.evaluate(() => { const h = [...document.querySelectorAll('#setBody h3')].find(h => /Благодарности/.test(h.textContent)); const t = h ? h.parentNode.textContent : '';
      return { kenney: /Kenney/.test(t), jagged: /JaggedStone/.test(t), artisticdude: /artisticdude/.test(t), qubodup: /qubodup/.test(t), fg: /FGResources/.test(t), spring: /Spring Spring/.test(t), kevin: /Kevin MacLeod/.test(t) }; });
    R.errs = errs.slice(0, 10); await ctx.close();
    // нет сети — синтез
    { const r = await open('&snd=1', { block: /assets\/audio\/(sfx|battle|amb)/ }); await r.p.touchscreen.tap(220, 300); await startGame(r.p, 'pyro');
      await r.p.evaluate(() => window.TCSND.dbg.ambSet('cave')); await sleep(7000);
      R.noNet = await r.p.evaluate(() => { const s = window.TCSND.state(), a = window.TCSND.dbg.ambRec(); const v = window.TCSND.dbg.play('h_fire', { g: .05, jit: 0 }); return { recSt: s.recSt, amb: a, beds: s.beds, fire: !!v, errs: s.stat.errs, ambErr: s.stat.ambErr || 0 }; });
      R.noNet.pageErrs = r.errs.slice(0, 5); await r.ctx.close(); }
    console.log(JSON.stringify(R, null, 1));
  } finally { await browser.close(); srv.close(); }
  fs.writeFileSync(path.join(OUT, 'br3_smoke.json'), JSON.stringify(R, null, 1));
}
main().catch(e => { console.error('СБОЙ', e); process.exit(1); });
