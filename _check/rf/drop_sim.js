#!/usr/bin/env node
// Симуляция выпадения чар по забегу с 1-го уровня (node, без браузера): выбор уровня с авто-выбором, свитки, автозамена,
// «Невозможная». Модель забега: за уровень — 1 выбор из 3 карт и ~s(L) свитков (Пуассон), 10% свитков — с боссов;
// время боя на уровне — (0,4 + 0,02·L) мин, вес края для шанса Невозможной — по уровню (IMP_ZW).
//   node drop_sim.js [--root=../..] [--runs=8] [--cls=all|pyro,necro] [--scr=1] [--vet=0] [--json=out.json]
//   --scr — множитель числа свитков (0.5 — мало врагов, 2 — много), --vet=N — у героя уже N невозможных из прошлых забегов
const path = require('path'), fs = require('fs');
const { loadFull, rng } = require('./game_node.js');
const ARG = process.argv.slice(2), opt = (k, d) => { const a = ARG.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const ROOT = path.resolve(__dirname, opt('root', '../..'));
const BEST = ARG.includes('--best'), RUNS = +opt('runs', 8), SCR = +opt('scr', 1), VET = +opt('vet', 0), LMAX = +opt('lmax', 100);
const MARK = (opt('marks', '') ? opt('marks').split(',').map(Number) : [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]).filter(x => x <= LMAX);
const G = loadFull(ROOT);
const SKILLS = G.get('SKILLS'), CLASSES = G.get('CLASSES');
const CL = opt('cls', 'all') === 'all' ? CLASSES.map(c => c.id) : opt('cls').split(',');
const scrMean = L => SCR * (L < 5 ? 1 : L < 30 ? 2.5 : 3);
const minPerLvl = L => .4 + .02 * L;
const IMP_ZW = G.get('IMP_ZW');
const zoneW = L => IMP_ZW[Math.max(0, Math.min(IMP_ZW.length - 1, Math.floor(L / 10)))];
function poisson(r, m) { let k = 0, p = Math.exp(-m), s = p; const u = r(); while (u > s && k < 30) { k++; p *= m / k; s += p; } return k; }

function oneRun(cid, seed) {
  const r = rng(seed); G.MathR.random = r;
  const C = G.get('CLASS_BY')[cid]; G.set('CLS', C);
  const S = G.get('newChar')(C); S.autoLu = true; S.autoBest = true; S.imp = []; S.impAcc = 0; S.impPend = 0; S.mx = 0;
  G.set('S', S); G.set('LEARNED', new Set(S.learned)); G.set('BOOK', new Set()); G.set('LU_LAST', []);
  G.run('IMP_OFFER.clear();for(const k in INTRC)delete INTRC[k];');
  if (VET) { const legs = [...C.pool].filter(id => (G.get('rarInfo')().map.get(id) | 0) >= 3); const NEWI = G.run('typeof IMP_L0!=="undefined"'), tgt = NEWI ? (S.impBook = []) : S.imp; for (let i = 0; i < VET && legs.length; i++) tgt.push(legs.splice(Math.floor(r() * legs.length), 1)[0]); }
  G.get('computeStats')(); G.run('onBuildChanged()');
  const out = { cls: cid, seed, snap: {}, firstLeg: null, firstLegEq: null, fullLeg: null, firstImp: null, leg80: null, impAt: {}, legAt: {} };
  const rarOf = G.get('rarOf'), isImp = G.get('isImp'), rarBase = G.get('rarBase');
  const learnRandom = G.get('learnRandom'), IMP = G.get('IMP');
  for (let L = 2; L <= LMAX; L++) {
    // бой на прошлом уровне: шанс невозможной копится (как impTick), свитки с врагов
    const zl = Math.max(0, Math.min(IMP_ZW.length - 1, Math.floor((L - 1) / 10))); G.set('zoneOf', () => zl);
    G.get('impTick')(minPerLvl(L - 1) * 60);
    const ns = poisson(r, scrMean(L - 1));
    for (let i = 0; i < ns; i++) learnRandom(r() < .1 ? 'boss' : '');
    S.lvl = L; G.get('computeStats')(); G.run('onBuildChanged();luQueue=1;luAutoRun(1);'+(BEST?'applyBestBuild();':''));
    const eq = [...G.get('EQUIPPED')], learned = [...G.get('LEARNED')].filter(id => C.pool.has(id));
    const legL = learned.filter(id => rarBase(SKILLS[id]) >= 3).length;
    if (out.firstLeg == null && legL) out.firstLeg = L;
    if (out.firstLegEq == null && eq.some(id => rarOf(SKILLS[id]) >= 3)) out.firstLegEq = L;
    const nSlots = G.get('activeSlots')() + G.get('passiveSlots')();
    if (out.fullLeg == null && eq.length >= nSlots && eq.every(id => rarOf(SKILLS[id]) >= 3)) out.fullLeg = L;
    if (out.leg80 == null && eq.length >= nSlots && eq.filter(id => rarOf(SKILLS[id]) >= 3).length >= .8 * nSlots) out.leg80 = L;
    const nImp = learned.filter(id => isImp(id)).length;
    if (out.firstImp == null && nImp) out.firstImp = L;
    if (MARK.includes(L)) {
      const h = [0, 0, 0, 0, 0]; for (const id of eq) h[rarOf(SKILLS[id])]++;
      G.run('PWC=new Map()'); out.snap[L] = { pw: G.get('buildPower')().all, h, n: eq.length, slots: nSlots, learned: learned.length, legL, imp: nImp };
    }
  }
  return out;
}
const t0 = Date.now(), res = [];
for (const cid of CL) for (let k = 0; k < RUNS; k++) res.push(oneRun(cid, 1000 + k * 7919 + CL.indexOf(cid) * 131));
const med = a => { const b = a.filter(v => v != null).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : null; };
const pctile = (a, q) => { const b = a.filter(v => v != null).sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * q))] : null; };
const never = a => a.filter(v => v == null).length;
console.log(`Забегов: ${res.length} (${CL.length} кл. × ${RUNS}), свитки ×${SCR}, невозможных из прошлого: ${VET}, ${((Date.now() - t0) / 1000).toFixed(1)} с`);
console.log('Ур. | обыч | редк | эпик | легенд | невозм | слоты | изучено | легенд изучено | невозм (ср.)');
for (const L of MARK) {
  const s = res.map(x => x.snap[L]), tot = [0, 0, 0, 0, 0]; let n = 0, ln = 0, lg = 0, im = 0, sl = 0;
  for (const q of s) { for (let i = 0; i < 5; i++) tot[i] += q.h[i]; n += q.n; ln += q.learned; lg += q.legL; im += q.imp; sl += q.slots; }
  const f = i => (100 * tot[i] / Math.max(1, n)).toFixed(0).padStart(3) + '%';
  console.log(`${String(L).padStart(3)} | ${f(0)} | ${f(1)} | ${f(2)} | ${f(3)}   | ${f(4)}   | ${(sl / s.length).toFixed(1).padStart(5)} | ${(ln / s.length).toFixed(0).padStart(7)} | ${(lg / s.length).toFixed(1).padStart(14)} | ${(im / s.length).toFixed(2)}`);
}
const fl = res.map(x => x.firstLeg), fe = res.map(x => x.firstLegEq), fu = res.map(x => x.fullLeg), fi = res.map(x => x.firstImp);
console.log(`Первая легендарная изучена: медиана ${med(fl)}, 10% забегов раньше ${pctile(fl, .1)}, нет до ${LMAX}: ${never(fl)}`);
console.log(`Первая легендарная в билде: медиана ${med(fe)}`);
const f8 = res.map(x => x.leg80);
console.log(`Билд ≥ 80% легендарный: медиана ${med(f8)}, 10% раньше ${pctile(f8, .1)}, 90% к ${pctile(f8, .9)}, не вышло до ${LMAX}: ${never(f8)}`);
console.log(`Весь билд легендарный: медиана ${med(fu)}, 10% раньше ${pctile(fu, .1)}, 90% к ${pctile(fu, .9)}, не вышло до ${LMAX}: ${never(fu)}`);
console.log(`Первая невозможная: медиана ${med(fi)}, 10% раньше ${pctile(fi, .1)}, нет до ${LMAX}: ${never(fi)}; к ${LMAX}-му в среднем ${(res.reduce((a, x) => a + x.snap[LMAX].imp, 0) / res.length).toFixed(2)}`);
console.log('Сила билда (медиана, без талантов): ' + MARK.map(L => L + ': ' + Math.round(med(res.map(x => x.snap[L].pw)))).join(' · '));
const J = opt('json', null); if (J) fs.writeFileSync(J, JSON.stringify(res));
