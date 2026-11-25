// Стенды «Чувство редкости» внутри игры (через window.__ev, ?debug): фиксированный шаг без отрисовки (bookOpen=true).
//   __rf.build({cls,L,maxR,nImp,rank,tal}) — билд героя уровня L из всех чар класса редкости ≤ maxR (3 — с легендарными), ранг rank у всех,
//        таланты — «Авто» (talSmart) против врагов уровня L, nImp лучших легендарных билда — невозможные; «Лучший билд».
//   __rf.waves({d,n,waves,T,seed}) — волны по n врагов уровня L+d кольцом 7–9 м, враги бьют героя по-настоящему; герой стоит,
//        чары — по правилам автобоя, обычная атака. Итог: среднее время зачистки волны, смерти, доля потерянного здоровья.
(function () {
  if (window.__rf) return;
  const RF = {};
  const ORIG = { gainXp, dropLoot, die, dieFull };
  function stepWorld(dt) {
    time += dt; procBudget = 40; pBudget = 500; FDT = dt; FRK = dt > .0143 ? 1 : dt * 60; spawnT = 1e9; threat = 0;
    P.invulnT -= dt; if (P.shield > 0) { P.shieldT -= dt; if (P.shieldT <= 0) shieldBurst(); }
    if (P.dashT > 0) { P.dashT -= dt; P.pos.addScaledVector(P.dashV, dt); }
    for (const k in P.cds) P.cds[k] -= dt; P.castT -= dt; P.swingT -= dt; P.atkCd -= dt; P.mp = Math.min(P.maxMp, P.mp + P.mpRegen * dt); P.hp = Math.min(P.maxHp, P.hp + P.hpRegen * dt);
    NFS.sa = activeSlots(); NFS.sp = passiveSlots(); NFS.lv = S.lvl;
    updateLater(dt); updateEnemies(dt); updatePassives(dt); updateProj(dt); updateMeteors(dt); updateSummons(dt); updateWhirls(dt); updateRains(dt); updateTraps(dt); updateZones(dt); updateFx(dt);
    if (typeof updateDark === 'function') updateDark(dt);
    cfTick(dt); nfTick(dt);
  }
  RF.build = function (o) {
    const R0 = Math.random; Math.random = mpRng(o.seed || 777);
    try {
      selectClass(o.cls); startGame(); clearWorld(); bookOpen = true; luQueue = 0; luOpen = false;
      S.lvl = o.L; S.xp = 0; S.talents = {}; S.ranks = {}; S.imp = []; if (typeof IMP_OFFER !== 'undefined') IMP_OFFER.clear();
      const ids = [...CLS.pool].filter(id => rarBase(SKILLS[id]) <= o.maxR && (!SKILLS[id].F.lvl || o.L >= SKILLS[id].F.lvl));
      LEARNED = new Set(ids); S.learned = ids.slice(); for (const id of ids) S.ranks[id] = o.rank || 5;
      computeStats(); recalcStats(); applyBestBuild();
      if (o.tal !== false) { autoTalents(o.L); computeStats(); }
      if (o.nImp) { const legs = equippedIds().filter(id => rarBase(SKILLS[id]) >= 3).sort((a, b) => pwr(SKILLS[b]) - pwr(SKILLS[a])); S.imp = legs.slice(0, o.nImp); impDirty(); }
      computeStats(); recalcStats(); onBuildChanged(); applyBestBuild(); computeStats(); recalcStats();
      const eq = equippedIds(), h = [0, 0, 0, 0, 0]; for (const id of eq) h[rarOf(SKILLS[id])]++;
      let bp = 0; PWC = new Map(); for (const id of eq) bp += pwr(SKILLS[id]);
      RF.B = { a: S.active.slice(), p: S.passive.slice(), ranks: JSON.parse(JSON.stringify(S.ranks)), talents: JSON.parse(JSON.stringify(S.talents)), imp: (S.imp || []).slice(), lvl: S.lvl, learned: S.learned.slice() };
      return { h, n: eq.length, pw: Math.round(bp), tal: Object.values(S.talents).reduce((a, b) => a + b, 0), hp: Math.round(P.maxHp) };
    } finally { Math.random = R0; }
  };
  function restore() {
    const B = RF.B; S.lvl = B.lvl; S.active = B.a.slice(); S.passive = B.p.slice(); S.ranks = JSON.parse(JSON.stringify(B.ranks)); S.talents = JSON.parse(JSON.stringify(B.talents));
    S.learned = B.learned.slice(); LEARNED = new Set(S.learned); S.imp = B.imp.slice(); if (typeof impDirty === 'function') impDirty();
    computeStats(); recalcStats(); onBuildChanged(); rebuildPassives();
  }
  RF.waves = function (o) {
    const dt = 1 / 30, W = o.waves || 3, N = o.n || 8, TMAX = o.T || 40;
    const R0 = Math.random; Math.random = mpRng(o.seed || 4242);
    let deaths = 0; gainXp = () => { }; dropLoot = () => { }; die = function () { deaths++; P.dead = false; P.hp = P.maxHp; }; dieFull = die;
    const out = [];
    try {
      restore(); const mobs = Object.keys(MOBS).filter(k => !MOBS[k].boss && !MOBS[k].as).slice(0, 4);
      for (let w = 0; w < W; w++) {
        clearWorld(); for (const s of SUMMONS.slice()) killSummon(s, true); cfReset(); nfReset(); rebuildPassives();
        P.pos.set(0, 0, 0); P.prev.set(0, 0, 0); P.hp = P.maxHp; P.mp = P.maxMp; P.shield = 0; P.dead = false; for (const k in P.cds) delete P.cds[k]; target = null;
        const d0 = deaths; let lost = 0; const hp0 = { v: P.hp };
        for (let i = 0; i < N; i++) { const a = i / N * TAU + rand(-.2, .2), r = 7 + rand(0, 2); const en = spawnEnemy(mobs[i % mobs.length], Math.cos(a) * r, Math.sin(a) * r, S.lvl + o.d, { aggro: true, elite: !!o.el && i % o.el === 0 }); if (en) { en.aggro = true; } }
        let t = 0, lastCast = -9;
        for (; t < TMAX; t += dt) {
          const alive = ENEMIES.some(e => !e.dead); if (!alive) break;
          const tg = getTarget(30); if (tg) faceTo(tg.pos);
          const n = activeSlots(); for (let i = 0; i < n; i++) { const id = S.active[i]; if (id == null) continue; const sk = SKILLS[id]; if ((P.cds[id] || 0) > 0) continue; if (canCast(sk, false) === 'ok') { cast(sk); lastCast = t; break; } }
          if (P.atkCd <= 0 && tg) basicAttack();
          const hb = P.hp; stepWorld(dt); if (P.hp < hb) lost += hb - P.hp;
          if (P.dashT <= 0 && t - lastCast > .3) { P.pos.set(0, 0, 0); P.prev.set(0, 0, 0); if (hero) hero.g.position.set(0, 0, 0); }
          for (let i = ENEMIES.length - 1; i >= 0; i--) if (ENEMIES[i].dead && ENEMIES[i].deathT > .1) removeEnemy(i);
        }
        out.push({ t: +t.toFixed(2), left: ENEMIES.filter(e => !e.dead).length, deaths: deaths - d0, lost: +(lost / P.maxHp).toFixed(2) });
      }
    } finally { gainXp = ORIG.gainXp; dropLoot = ORIG.dropLoot; die = ORIG.die; dieFull = ORIG.dieFull; clearWorld(); Math.random = R0; }
    const m = k => out.reduce((a, x) => a + x[k], 0) / out.length;
    return { t: +m('t').toFixed(2), deaths: out.reduce((a, x) => a + x.deaths, 0), lost: +m('lost').toFixed(2), left: out.reduce((a, x) => a + x.left, 0), waves: out };
  };
  // разбор силы в карточке против силы чары (баг: «Сила 3537 = 108 ×1 ×2 ×8,08…» без множителя талантов, а в книге 4244)
  RF.pbCheck = function () {
    const r = []; for (const id of equippedIds()) { const sk = SKILLS[id]; PWC = new Map(); const p = pwr(sk); const b = powerBreak(sk); const html = pwBreakHtml(sk); const m = /Сила (\d+)/.exec(html); r.push({ id, pw: Math.round(p), total: Math.round(b.total), shown: m ? +m[1] : null, tal: +b.tal.toFixed(3), lvl: +b.lvl.toFixed(3) }); }
    return r;
  };
  window.__rf = RF;
})();
'ok';
