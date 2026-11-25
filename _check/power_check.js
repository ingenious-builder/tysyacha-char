#!/usr/bin/env node
// Проверка силы чар «Тысячи чар».
//   node _check/power_check.js            — быстро, без браузера: правило «редкость = сила», ступени, множители редкости,
//                                            и (если есть _check/real_dps.json) сверка оценки с последним замером
//   node _check/power_check.js --real     — замер реального урона всех чар в бою (браузер через D:/games/pw_gate.js,
//                                            ~1 мин), пишет _check/real_dps.json, затем проверки
//   node _check/power_check.js --real --k — только проверка множителя редкости в бою (дописывает в real_dps.json)
//   node _check/power_check.js --fit      — по real_dps.json печатает подогнанные таблицы FP (ph/e/m, k у призыва) —
//                                            для новых видов чар и после правок механик
//   node _check/power_check.js --pairs    — ещё и реальный урон критических пар редкостей с талантами (_check/pairs_check.js, браузер ~2 мин):
//                                            с талантами явно перевёрнутых пар не больше, чем без них
//   ключи: --root=<папка игры> (по умолчанию — родитель _check), --md=<файл отчёта> (таблицы в markdown)
// Выход: код 1, если правило редкости нарушено или оценка расходится с замером больше допуска.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ARG = process.argv.slice(2), flag = k => ARG.includes('--' + k), opt = (k, d) => { const a = ARG.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const ROOT = path.resolve(opt('root', path.join(__dirname, '..')));
const REAL = path.join(ROOT, '_check', 'real_dps.json');
const TOL = +opt('tol', 0.15);        // допуск оценки против замера
const W_ONE = 0.35;                   // доля боя «один враг рядом» у активных (остальное — поток толпы)

// ---------- игра в node: вырезаем данные и формулы силы из index.html ----------
function loadGame(root) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('не нашёл кусок ' + a + ' … ' + b); return html.slice(i, j); };
  let aff = ''; try { aff = cut('const CT_AFF=', '{const f0=skPower;'); } catch (e) {}   // особенность класса: сродство стихии и форм (int/v1331)
  const code = cut('const ELEMENTS=[', 'function weakest(') + '\n' + cut('const ADJP=', 'const hexOf=') + '\n' + cut('const SUMM_CLS=', 'const summLead=') + '\nvar CT_ON=0;\n' + aff;
  class Color { constructor(h) { this.h = h; } clone() { return this; } }
  const THREE = { Color }, doc = { querySelector: () => null, getElementById: () => null };
  const src = `(function(THREE,document,localStorage){const $=s=>null;const TAU=Math.PI*2;const rand=(a,b)=>a+Math.random()*(b-a);const randi=(a,b)=>Math.floor(rand(a,b+1));
const clamp=(v,a,b)=>v<a?a:v>b?b:v;const lerp=(a,b,t)=>a+(b-a)*t;const cap=s=>s[0].toUpperCase()+s.slice(1);const fmt=n=>String(n);const fmt2=n=>String(n);
const P={mpRegen:8,maxHp:120,pos:{x:0,z:0}};let __v;function cfStats(){}function cfMana(s){return skMana(s);}const isImp=()=>false;   // особенность класса (часть B) и «Невозможная» — в node без эффекта
${code}
return {get:n=>eval(n),set:(n,v)=>{__v=v;eval(n+'=__v');},P};})`;
  const G = vm.runInNewContext(src, { Math, Map, Set, Array, Object, JSON, Float64Array, Float32Array, String, Number, console })(THREE, doc, {});
  return G;
}
function useClass(G, cid, o = {}) {
  const C = G.get('CLASS_BY')[cid]; G.set('CLS', C);
  const S = { lvl: o.lvl || 1, xp: 0, ranks: o.ranks || {}, talents: o.talents || {}, mx: 0, sandbox: false, active: Array(8).fill(null), passive: Array(42).fill(null), learned: [] };
  G.set('S', S); G.get('computeStats')(); G.P.mpRegen = (8 + .4 * (S.lvl - 1)) * G.get('ST').mana * C.mp; G.P.maxHp = (120 + 24 * (S.lvl - 1)) * G.get('ST').hpMul * C.hp;
  G.set('CR_OVR', 1); G.set('CLONE_OVR', true); G.set('EQUIPPED', new Set());   // частота кастов для «4-го каста» — стандартная, как во внутренней силе
   G.get('RESO_N').fill(0); G.get('PWC').clear();
  return { C, S };
}

// ---------- проверки без браузера ----------
function nodeChecks(G, out) {
  const CLASSES = G.get('CLASSES'), SKILLS = G.get('SKILLS'), RARITY = G.get('RARITY'), RAR_POW = G.get('RAR_POW');
  const RMAX = G.get('RANK_MAX'), rankAt = r => 1 + G.get('RANK_STEP') * (r - 1), NR = RARITY.length;
  let bad = 0; const rows = [], formStat = {};
  const LV = [1, 20, 80];   // правило должно держаться на любом уровне героя (мана с уровнем растёт)
  for (const C of CLASSES) for (const L of LV) {
    useClass(G, C.id, { lvl: L });
    const I = G.get('rarInfo')(), lS = G.get('lvlS')(L) * G.get('slotBoost')();   // надбавка слотов (A) — общий множитель уровня
    for (const act of [true, false]) {
      const ids = [...C.pool].filter(id => SKILLS[id].active === act);
      // сила при одинаковом (пустом) билде на 1-м уровне: skPower без резонанса = база × ранг
      const pw = (id, r) => { G.get('S').ranks = r > 1 ? { [id]: r } : {}; G.get('PWC').clear(); return G.get('skParts')(SKILLS[id], false).pw; };
      const tier = Array.from({ length: NR }, () => ({ min1: Infinity, maxM: 0, n: 0, idMin: null, idMax: null }));
      for (const id of ids) {
        const r = I.map.get(id) | 0, p1 = pw(id, 1), pm = pw(id, RMAX), t = tier[r]; t.n++;
        if (p1 < t.min1) { t.min1 = p1; t.idMin = id; } if (pm > t.maxM) { t.maxM = pm; t.idMax = id; }
        // база = замер оценки × множитель редкости (с точностью счёта)
        if (Math.abs(p1 / (I.B[id] * lS) - 1) > 2e-3) { bad++; if (bad < 6) console.log('  база не совпала', C.id, 'ур.' + L, id, p1, I.B[id] * lS); }
        if (L !== 1) continue;
        const f = SKILLS[id].F.id, fs_ = formStat[f] || (formStat[f] = { n: 0, r: Array(NR).fill(0), kmin: Infinity, kmax: 0, k: [] }); fs_.n++; fs_.r[r]++; fs_.kmin = Math.min(fs_.kmin, I.K[id]); fs_.kmax = Math.max(fs_.kmax, I.K[id]); fs_.k.push(I.K[id]);
      }
      G.get('S').ranks = {};
      for (let r = 0; r + 1 < NR; r++) {
        const lo = tier[r], hi = tier[r + 1]; if (!lo.n || !hi.n) continue;
        const ok = hi.min1 >= lo.maxM * (1 - 1e-9), m = hi.min1 / lo.maxM;
        rows.push({ cls: C.id + ' ур.' + L, grp: act ? 'акт' : 'пас', r, m, ok, a: SKILLS[lo.idMax], b: SKILLS[hi.idMin] });
        if (!ok) bad++;
      }
    }
  }
  const worst = rows.slice().sort((a, b) => a.m - b.m).slice(0, 5);
  out.push('## Правило «редкость = сила»', '', `Проверено ${rows.length} пар соседних редкостей (${CLASSES.length} классов × активные/пассивные × уровни героя ${LV.join(', ')}). Нарушений: **${rows.filter(r => !r.ok).length}**.`,
    `Ступени RAR_POW = ${RAR_POW.join(' / ')}, разброс внутри ступени +${G.get('RAR_W') * 100}%, ранг ${RMAX} = ×${rankAt(RMAX).toFixed(2)}.`,
    '', 'Самые тесные пары (слабейшая чара редкости выше на 1-м ранге / сильнейшая редкости ниже на 5-м):', '', '| класс | группа | пара | запас |', '|---|---|---|---|');
  for (const w of worst) out.push(`| ${w.cls} | ${w.grp} | ${RARITY[w.r].n} р.5 → ${RARITY[w.r + 1].n} р.1 | ×${w.m.toFixed(3)} |`);
  out.push('', '## Множитель редкости к урону по видам (rarK: во сколько раз урон вида подогнан к ступени)', '', '| вид | чар | обычн/редк/эпич/легенд | rarK мин–медиана–макс |', '|---|---|---|---|');
  for (const f in formStat) { const s = formStat[f], k = s.k.sort((a, b) => a - b); out.push(`| ${f} | ${s.n} | ${s.r.join('/')} | ${s.kmin.toFixed(2)}–${k[k.length >> 1].toFixed(2)}–${s.kmax.toFixed(2)} |`); }
  // справка: таланты, которые усиливают только свой вид (не ошибка — видно в разбивке силы как «таланты»)
  const TAL = { power: 5, cdr: 5, crit: 5, reso: 3, react: 3, mana: 5, wrath: 3, summ: 3, luck: 5, cascade: 3, orbit: 3 };
  let tp = 0, ti = 0; const tf = {};
  for (const C of CLASSES) { useClass(G, C.id, { lvl: 40, talents: TAL }); const I = G.get('rarInfo')();
    for (const act of [true, false]) { const ids = [...C.pool].filter(id => SKILLS[id].active === act);
      const pw = (id, r) => { G.get('S').ranks = r > 1 ? { [id]: r } : {}; return G.get('skParts')(SKILLS[id], false).pw; };
      const v = ids.map(id => ({ id, r: I.map.get(id) | 0, p1: pw(id, 1), p5: pw(id, RMAX), f: SKILLS[id].F.id }));
      for (const x of v) { const k = x.p1 / (I.B[x.id] * G.get('lvlS')(40) * G.get('slotBoost')()); tf[x.f] = Math.max(tf[x.f] || 0, k); }
      for (const a of v) for (const b of v) { if (b.r !== a.r + 1) continue; tp++; if (a.p5 > b.p1) ti++; } } }
  G.get('S').ranks = {};
  out.push('', '## Справка: таланты своего вида', '', `Все таланты взяты (40-й уровень): соседних пар, где чара низшей редкости на 5-м ранге сильнее высшей на 1-м: ${(ti / tp * 100).toFixed(1)}% (${ti} из ${tp}). Это таланты одного вида — в разбивке силы видны как «таланты».`, '',
    'Наибольший множитель талантов у вида (при всех талантах): ' + Object.entries(tf).sort((a, b) => b[1] - a[1]).map(([f, k]) => f + ' ×' + k.toFixed(2)).join(', ') + '.');
  // правило с талантами (25.11, потолок талантов talQ): на ОДНОМ ранге чара следующей редкости сильнее — при всех общих талантах
  // и полной ветке класса. Нарушение — ошибка.
  let sp = 0, sb = 0, sm = 9; const sw = [];
  let CTT = {}; try { CTT = G.get('CT_TAL'); } catch (e) {}
  for (const L of [40, 160]) for (const C of CLASSES) {
    const tal = Object.assign({}, TAL, { vit: 5, armor: 5, regen: 3, leech: 3 }); for (const t of CTT[C.id] || []) tal[t.id] = t.max;
    useClass(G, C.id, { lvl: L, talents: tal }); const I = G.get('rarInfo')();
    for (const act of [true, false]) { const tier = Array.from({ length: NR }, () => ({ min: Infinity, max: 0, n: 0 }));
      for (const id of [...C.pool]) { if (SKILLS[id].active !== act) continue; const p = G.get('skParts')(SKILLS[id], false).pw, t = tier[I.map.get(id) | 0]; t.n++; t.min = Math.min(t.min, p); t.max = Math.max(t.max, p); }
      for (let r = 0; r + 1 < NR; r++) { const lo = tier[r], hi = tier[r + 1]; if (!lo.n || !hi.n) continue; sp++; const m = hi.min / lo.max; sm = Math.min(sm, m); if (m < 1 - 1e-9) { sb++; sw.push(C.id + ' ур.' + L + ' ' + (act ? 'акт' : 'пас') + ' ' + RARITY[r].n + '→' + RARITY[r + 1].n + ' ×' + m.toFixed(3)); } } } }
  out.push('', '## Правило «редкость = сила» с талантами', '', `Все общие таланты и полная ветка класса (уровни 40, 160), один ранг: проверено ${sp} пар соседних редкостей, нарушений: **${sb}**, наименьший запас ×${sm.toFixed(3)} (потолок талантов ×${G.get('TAL_CAP')}).` + (sb ? ' Нарушены: ' + sw.slice(0, 5).join('; ') : ''));
  bad += sb;
  // правило с особенностью класса (int/v1331, решение Петра 25.11): сила × сродство (CT_AFF — «Пиромант: огонь ×1,2») — чара редкостью
  // выше на 1-м ранге не слабее чары ниже на 5-м, без талантов и со всеми талантами. Потолок talQ режет низшие чары основной стихии.
  let ap = 0, ab = 0, am = 9, aLoss = 1; const aw = [];
  if (G.get('typeof ctAff') === 'function') {
    G.set('CT_ON', 1);
    try {
      for (const [L, withTal] of [[1, false], [20, false], [80, false], [40, true], [160, true]]) for (const C of CLASSES) {
        const tal = withTal ? Object.assign({}, TAL, { vit: 5, armor: 5, regen: 3, leech: 3 }) : {}; if (withTal) for (const t of CTT[C.id] || []) tal[t.id] = t.max;
        useClass(G, C.id, { lvl: L, talents: tal }); G.set('CT_ON', 1); const I = G.get('rarInfo')(), af = G.get('ctAff');
        const pw = (id, r) => { G.get('S').ranks = r > 1 ? { [id]: r } : {}; G.get('PWC').clear(); return G.get('skParts')(SKILLS[id], false).pw * af(SKILLS[id]); };
        for (const act of [true, false]) { const tier = Array.from({ length: NR }, () => ({ min1: Infinity, maxM: 0, n: 0, a: null, b: null }));
          for (const id of [...C.pool]) { if (SKILLS[id].active !== act) continue; const r = I.map.get(id) | 0, t = tier[r], p1 = pw(id, 1), pm = pw(id, RMAX); t.n++;
            if (p1 < t.min1) { t.min1 = p1; t.b = id; } if (pm > t.maxM) { t.maxM = pm; t.a = id; }
            if (!withTal && L === 20 && r < 3) { const q = G.get('talQ')(SKILLS[id]); aLoss = Math.min(aLoss, q); } }
          for (let r = 0; r + 1 < NR; r++) { const lo = tier[r], hi = tier[r + 1]; if (!lo.n || !hi.n) continue; ap++; const m = hi.min1 / lo.maxM; am = Math.min(am, m);
            if (m < 1 - 1e-9) { ab++; aw.push(C.id + ' ур.' + L + (withTal ? ' с талантами ' : ' ') + (act ? 'акт' : 'пас') + ' ' + RARITY[r].n + ' р.5 ' + lo.a + ' → ' + RARITY[r + 1].n + ' р.1 ' + hi.b + ' ×' + m.toFixed(3)); } } } }
    } finally { G.set('CT_ON', 0); G.get('S').ranks = {}; G.get('PWC').clear(); }
    out.push('', '## Правило «редкость = сила» с особенностью класса', '', `Сила × сродство класса (CT_AFF), чара редкостью выше на 1-м ранге против чары ниже на 5-м, без талантов (ур. 1, 20, 80) и со всеми талантами (ур. 40, 160): проверено ${ap} пар, нарушений: **${ab}**, наименьший запас ×${am.toFixed(3)}; низшие чары основной стихии теряют до ×${aLoss.toFixed(3)}.`);
    if (aw.length) out.push('', ...aw.slice(0, 12).map(x => '- ' + x));
    bad += ab;
  }
  return bad;
}

// ---------- сверка оценки с замером ----------
function realRows(file) { const R = JSON.parse(fs.readFileSync(file, 'utf8')); const by = {};
  for (const x of R.rows) { if (x.tag) continue; const k = x.id + '|' + x.cls; const o = by[k] || (by[k] = { id: x.id, cls: x.cls, one: null, fl: [], cyc: x.cyc }); if (x.scen === 'one') o.one = x.dps; else o.fl.push(x.dps); }
  return { sc: R.sc, list: Object.values(by).map(o => { const fl = o.fl.reduce((a, b) => a + b, 0) / Math.max(1, o.fl.length); o.real = o.one != null ? W_ONE * o.one + (1 - W_ONE) * fl : fl; return o; }) }; }
function checkK(G, out) {
  if (!fs.existsSync(REAL)) return 0; const R = JSON.parse(fs.readFileSync(REAL, 'utf8')), SKILLS = G.get('SKILLS'), m = {};
  for (const x of R.rows) { if (!x.tag) continue; const k = x.id + '|' + x.cls, o = m[k] || (m[k] = { id: x.id, cls: x.cls, k0: [0, 0], k1: [0, 0] }); const w = x.scen === 'one' ? W_ONE : SKILLS[x.id].active ? 1 - W_ONE : 1; o[x.tag][0] += w * x.dps; o[x.tag][1] += w; }
  let n = 0, bad = 0, worst = []; for (const o of Object.values(m)) { const a = o.k0[0] / o.k0[1], b = o.k1[0] / o.k1[1]; if (!(Math.min(a, b) >= 20)) continue; /* урон меньше 20 ед./с — округление до целых (2 → 2 при rarK 0,62) и шум, не множитель */ useClass(G, o.cls, { lvl: KLV }); const K = G.get('rarK')(SKILLS[o.id]), r = b / a / K; n++; if (Math.abs(r - 1) > .06) { bad++; worst.push([r, o.cls + ' ' + SKILLS[o.id].F.id + '/' + SKILLS[o.id].E.id + '/' + SKILLS[o.id].M.id]); } }
  out.push('', '## Множитель редкости в бою', '', `Чар проверено: ${n}; урон с множителем / без множителя = rarK с точностью 6%: ${n - bad} из ${n}.` + (bad ? ' Не сошлись: ' + worst.slice(0, 4).map(w => w[1] + ' ×' + w[0].toFixed(2)).join(', ') : ''));
  return bad > n * .1 ? 1 : 0; }
function compare(G, out) {
  if (!fs.existsSync(REAL)) { out.push('', '_Замера нет: запусти с --real._'); return 0; }
  const { list } = realRows(REAL), SKILLS = G.get('SKILLS'), byF = {}; let bad = 0;
  for (const o of list) {
    useClass(G, o.cls);
    const sk = SKILLS[o.id], est = G.get('skParts')(sk, true).dps;   // замер — без множителя редкости (RARK_OFF в стенде)
    const zero = est < 1e-6 && o.real < 0.5;   // без урона в оценке: замер ниже 0,5 ед./с — шум (урон от входящего удара 1)
    const ratio = zero ? 1 : o.real / Math.max(est, 1e-6);
    const f = sk.F.id, k = f === 'summon' ? f + ':' + G.get('summInfo')(sk, o.cls).k : f;
    const b = byF[k] || (byF[k] = { n: 0, r: [], worst: [] }); b.n++; b.r.push(ratio);
    if (!zero && (ratio > 1 + TOL || ratio < 1 / (1 + TOL))) b.worst.push([ratio, sk.E.id + '/' + sk.M.id]);
  }
  out.push('', `## Оценка против замера (допуск ±${Math.round(TOL * 100)}%)`, '', '| вид | чар | замер/оценка: медиана | мин–макс | вне допуска |', '|---|---|---|---|---|');
  for (const k of Object.keys(byF).sort()) { const b = byF[k], r = b.r.sort((x, y) => x - y), m = r[r.length >> 1];
    const share = b.worst.length / b.n; if ((b.worst.length >= 2 && share > .1) || m > 1.1 || m < 1 / 1.1) bad++;
    out.push(`| ${k} | ${b.n} | ${m.toFixed(2)} | ${r[0].toFixed(2)}–${r[r.length - 1].toFixed(2)} | ${b.worst.length}${b.worst.length ? ' (' + b.worst.sort((x, y) => Math.abs(Math.log(y[0])) - Math.abs(Math.log(x[0]))).slice(0, 2).map(w => w[1] + ' ×' + w[0].toFixed(2)).join(', ') + ')' : ''} |`); }
  return bad;
}

// ---------- подгонка таблиц FP по замеру ----------
function fit(G) {
  const { list } = realRows(REAL), SKILLS = G.get('SKILLS'), FORMS = G.get('FORMS'), ELN = G.get('ELEMENTS').length, MN = G.get('MODS').length;
  const r2 = x => +x.toFixed(2), res = {};
  for (const F of FORMS) {
    const f = F.id, a = [], sm = [];
    for (const o of list) { const sk = SKILLS[o.id]; if (sk.F.id !== f) continue; useClass(G, o.cls);
      const dmg = F.power * (sk.M.dmg || 1) * (sk.E.dmg || 1); let H = sk.active ? o.real * o.cyc / dmg : o.real / dmg; let key = '_';
      if (f === 'summon') { const inf = G.get('summInfo')(sk, o.cls); key = inf.k; if (/^(totem_heal|clone)$/.test(key)) continue; H /= inf.n / (inf.D.n || 1);
        if (key === 'skelmage') { H /= G.get('summE')(sk, key); sm.push({ m: sk.m, L: Math.log(H) }); continue; } }
      else if (o.cls !== (sk.F.sig || 'windr')) continue;   // фирменные — у своего класса
      if (sk.F.id === 'brand' || sk.F.id === 'orbit' || sk.F.id === 'surge') { /* поводы на стандартных частотах */ }
      if (H > 0) a.push({ e: sk.e, m: sk.m, key, L: Math.log(H) }); }
    if (!a.length) continue;
    let A = {}, b = Array(ELN).fill(0), c = Array(MN).fill(0); const W = 7, V = 4; // ветер, вампиризм = 1
    for (let it = 0; it < 50; it++) {
      for (const k of new Set(a.map(x => x.key))) { const q = a.filter(x => x.key === k); A[k] = q.reduce((s, x) => s + x.L - b[x.e] - c[x.m], 0) / q.length; }
      for (let e = 0; e < ELN; e++) { const q = a.filter(x => x.e === e); if (q.length) b[e] = q.reduce((s, x) => s + x.L - A[x.key] - c[x.m], 0) / q.length; }
      for (let m = 0; m < MN; m++) { const q = a.filter(x => x.m === m); if (q.length) c[m] = q.reduce((s, x) => s + x.L - A[x.key] - b[x.e], 0) / q.length; }
      const bw = b[W], cv = c[V]; b = b.map(x => x - bw); c = c.map(x => x - cv); for (const k in A) A[k] += bw + cv;
    }
    if (sm.length) A.skelmage = sm.reduce((s, x) => s + x.L - c[x.m], 0) / sm.length;   // скелет-маг: своя стихия (summE), отдельно
    const resid = a.map(x => Math.exp(x.L - A[x.key] - b[x.e] - c[x.m])), off = resid.filter(r => r > 1.12 || r < 1 / 1.12).length;
    res[f] = { ph: A._ != null ? r2(Math.exp(A._)) : undefined, k: A._ == null ? Object.fromEntries(Object.entries(A).map(([k, v]) => [k, r2(Math.exp(v))])) : undefined, e: b.map(x => r2(Math.exp(x))), m: c.map(x => r2(Math.exp(x))), off, n: a.length };
  }
  const n = x => String(x).replace(/^0\./, '.');
  for (const f in res) { const o = res[f], fp = G.get('FP')[f] || {};
    console.log(` ${f}:{${o.ph != null ? 'ph:' + n(o.ph) + ',' : ''}${fp.u ? 'u:' + n(fp.u) + ',' : ''}cat:'${fp.cat || 'pas'}',e:[${o.e.map(n)}],m:[${o.m.map(n)}]${o.k ? ',k:{' + Object.entries(o.k).map(([a, b]) => a + ':' + n(b)).join(',') + '}' : ''}},   // вне ±12%: ${o.off}/${o.n}`); }
}

// ---------- задания для замера ----------
const KLV = 30;
function jobsAll(G, konly) {
  const SKILLS = G.get('SKILLS'), CLASSES = G.get('CLASSES'), J = [];
  const summCls = Object.keys(G.get('SUMM_CLS'));
  const slow = new Set(['brand', 'orbit']), SEEDS = { brand: [11, 29, 47, 71, 83, 97], orbit: [11, 29, 47, 71] }, TT = { brand: 200, orbit: 120 };
  if (!konly) for (const sk of SKILLS) { if (!sk) continue; const f = sk.F.id;   // SKILLS с дырами: фирменные — только в своей стихии
    const add = cls => { if (sk.active) { J.push({ id: sk.id, scen: 'one', cls }); J.push({ id: sk.id, scen: 'flow', cls, seed: 11 }); J.push({ id: sk.id, scen: 'flow', cls, seed: 29 }); }
      else for (const seed of SEEDS[f] || [11, 29]) J.push({ id: sk.id, scen: 'flow', cls, seed, T: TT[f] || 24 }); };
    add(sk.F.sig || 'windr');
    if (f === 'summon') for (const c of summCls) { const C = CLASSES.find(x => x.id === c); if ([C.p, C.s, C.t].includes(sk.E.id)) add(c); } }
  // множитель редкости в бою: те же чары у трёх классов без множителя и с ним — отношение должно быть rarK (30-й уровень:
  // урон крупный, округление до целых не мешает)
  for (const c of ['pyro', 'necro', 'paladin']) { const C = CLASSES.find(x => x.id === c), ids = [...C.pool];
    for (let i = 0; i < ids.length; i += 17) { const id = ids[i], sk = SKILLS[id]; for (const withK of [false, true]) {
      if (sk.active) { J.push({ id, scen: 'one', cls: c, withK, lvl: KLV, tag: withK ? 'k1' : 'k0' }); J.push({ id, scen: 'flow', cls: c, seed: 11, withK, lvl: KLV, tag: withK ? 'k1' : 'k0' }); }
      else J.push({ id, scen: 'flow', cls: c, seed: 11, T: 60, withK, lvl: KLV, tag: withK ? 'k1' : 'k0' }); } } }
  return J;
}

module.exports = { loadGame, useClass, realRows };
if (require.main === module) (async () => {
  const G = loadGame(ROOT); const out = ['# Проверка силы чар', '', `Игра: ${ROOT}, ${new Date().toISOString().slice(0, 16)}`, ''];
  if (flag('real')) {
    const { measure } = require(path.join(__dirname, 'real_run.js'));
    const konly = flag('k'), jobs = jobsAll(G, konly); console.log('замер:', jobs.length, 'прогонов');
    const r = await measure(ROOT, { jobs, progress: (a, b, ms) => { if (a % 960 < 24) console.log(`  ${a}/${b} · ${Math.round(ms / 1000)} с`); } });
    if (r.errs.length) console.log('ошибки страницы:', r.errs.slice(0, 5));
    let rows = r.rows; if (konly && fs.existsSync(REAL)) rows = JSON.parse(fs.readFileSync(REAL, 'utf8')).rows.filter(x => !x.tag).concat(r.rows);   // --real --k: только проверка множителя
    fs.writeFileSync(REAL, JSON.stringify({ sc: r.sc, rows, at: new Date().toISOString() }));
    out.push(`Замер: ${r.rows.length} прогонов, ошибок страницы ${r.errs.length}.`, '');
    if (r.errs.length) process.exitCode = 1;
  }
  if (flag('fit')) { fit(G); return; }
  let bad = nodeChecks(G, out); bad += compare(G, out); bad += checkK(G, out);
  if (flag('pairs')) { try { const t = require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'pairs_check.js'), '--root=' + ROOT], { timeout: 1500e3 }).toString(); out.push('', '## Реальный урон пар с талантами', '', ...t.trim().split('\n')); } catch (e) { bad++; out.push('', '## Реальный урон пар с талантами — НАРУШЕНИЕ', '', String(e.stdout || e.message).trim()); } }
  const md = opt('md', null); if (md) fs.writeFileSync(md, out.join('\n') + '\n');
  console.log(out.join('\n')); console.log(bad ? `\nИТОГ: есть нарушения (${bad})` : '\nИТОГ: всё в порядке');
  if (bad) process.exitCode = 1;
})().catch(e => { console.error('ОШИБКА', e); process.exit(1); });
