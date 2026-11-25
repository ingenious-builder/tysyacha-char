// Модели героев «Тысячи чар»: KayKit Adventurers 1.0 (Kay Lousberg, CC0) — один общий скелет,
// части тел и предметы собираются под каждого героя, атлас перекрашивается на холсте под его цвета,
// анимации двумя слоями (ноги — бег/стойка, верх — удар/чары), чтобы бить и колдовать на бегу.
// Зависит только от THREE (r128) и THREE.GLTFLoader. Игра работает и без этого файла (процедурные герои).
(function () {
  'use strict';
  const T = THREE, SAN = n => T.PropertyBinding.sanitizeNodeName(n);
  const HM = { ready: false, failed: false, st: 0, lib: null, img: {}, texC: {}, SC: 0.78, HEAD: 0.86, runV: 4, inst: new Set() };
  // клетки атласа (8×4, у текстуры 256 — 32×64): роль → список «столбец,строка»
  HM.CELLS = {
    knight: { skin: ['0,0'], hair: ['1,0'], eye: ['2,0'], armor: ['3,0'], armor2: ['7,0'], dark: ['7,1', '2,1'], plate4: ['4,0'], leather: ['6,0'], cloth: ['0,1'], white: ['1,1'], blade: ['3,1'], grip: ['5,1'], shield: ['6,1'], gem: ['2,2'] },
    barbarian: { skin: ['0,0'], hair: ['1,0'], eye: ['2,0'], leather: ['6,0'], fur: ['7,0'], trim: ['2,1'], cloth: ['0,1', '1,1'], blade: ['2,2'], pants: ['3,2'], metal: ['3,0', '3,1'], dark: ['7,1'], strap: ['7,2'], wood: ['5,1', '0,2'] },
    mage: { skin: ['0,0', '7,2'], hair: ['1,0'], eye: ['2,0'], robe: ['0,1'], hat: ['1,1'], robe2: ['7,1'], cape: ['2,1', '1,2'], trim: ['5,0'], inner: ['3,0', '4,0'], gem: ['6,2'], teal: ['2,2'], pants: ['3,2'], wood: ['5,1'], metal: ['3,1'] },
    rogue: { skin: ['0,0'], hair: ['1,0'], eye: ['2,0'], hood: ['1,1'], tunic: ['0,1'], leather: ['5,0', '6,0'], glove: ['5,2'], grey: ['3,0'], pants: ['3,2'], boots: ['7,1'], blade: ['2,1'], metal: ['3,1', '6,1'], wood: ['0,2', '5,1'], bomb: ['6,2'] },
  };
  HM.BASE_TEX = { K: 'knight', B: 'barbarian', M: 'mage', R: 'rogue', H: 'rogue' };

  // ---------- загрузка ----------
  HM.load = function (base) {
    if (HM.st) return HM.p; HM.st = 1; base = base || '';
    const V = HM.V || 1;
    const img = n => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = base + 'assets/models/kk_' + n + '.png?v=' + V; });
    const glb = new Promise((ok, no) => new T.GLTFLoader().load(base + 'assets/models/kk_heroes.glb?v=' + V, ok, undefined, no));
    HM.p = Promise.all([glb, img('knight'), img('barbarian'), img('mage'), img('rogue')]).then(([g, a, b, c, d]) => {
      HM.img = { knight: a, barbarian: b, mage: c, rogue: d };
      prepLib(g); HM.ready = true; HM.st = 2; return HM;
    }).catch(e => { HM.failed = true; HM.st = 3; console.warn('модели героев не загрузились', e); throw e; });
    return HM.p;
  };
  const LOWER = new Set(['root', 'hips', 'upperlegl', 'lowerlegl', 'footl', 'toesl', 'upperlegr', 'lowerlegr', 'footr', 'toesr']);
  function prepLib(g) {
    const L = { parts: {}, props: {}, clips: {}, U: {}, Lo: {} };
    const sc = g.scene; sc.updateMatrixWorld(true);
    let rig = null; sc.traverse(o => { if (o.name === 'Rig') rig = o; });
    const detach = [];
    sc.traverse(o => {
      if (o.isSkinnedMesh) {
        L.parts[o.name] = { geo: o.geometry, tex: o.material.name.replace('kk_', '') };
        if (!L.jointNames) { L.jointNames = o.skeleton.bones.map(b => b.name); L.boneInv = o.skeleton.boneInverses.map(m => m.clone()); }
      } else if (o.isMesh) {
        L.props[o.name] = { geo: o.geometry, tex: o.material.name.replace('kk_', ''), parent: o.parent.name, pos: o.position.clone(), quat: o.quaternion.clone(), scl: o.scale.clone() };
        detach.push(o);
      }
    });
    detach.forEach(o => o.parent.remove(o));
    L.rig = rig;
    for (const c of g.animations) {
      L.clips[c.name] = c;
      const up = c.tracks.filter(t => !LOWER.has(t.name.split('.')[0])), lo = c.tracks.filter(t => LOWER.has(t.name.split('.')[0]));
      L.U[c.name] = new T.AnimationClip(c.name + '#U', c.duration, up);
      L.Lo[c.name] = new T.AnimationClip(c.name + '#L', c.duration, lo);
      // вторая копия — чтобы повтор того же удара шёл с плавным переходом, а не рывком
      L.U[c.name + '~'] = new T.AnimationClip(c.name + '#U2', c.duration, up);
      L.Lo[c.name + '~'] = new T.AnimationClip(c.name + '#L2', c.duration, lo);
    }
    HM.lib = L;
    HM.runV = measureRun(L) || 4;
  }
  // скорость бега «родной» анимации: скорость стопы назад в момент касания земли (в единицах модели без масштаба)
  function measureRun(L) {
    try {
      const root = new T.Group(), rig = L.rig.clone(true); root.add(rig);
      const mx = new T.AnimationMixer(root), a = mx.clipAction(L.clips.Running_A); a.play();
      const D = L.clips.Running_A.duration, N = 96, fl = [], fr = [];
      let footL = null, footR = null; rig.traverse(o => { if (o.name === 'footl') footL = o; if (o.name === 'footr') footR = o; });
      const v = new T.Vector3();
      for (let i = 0; i <= N; i++) { mx.setTime(D * i / N); root.updateMatrixWorld(true); footL.getWorldPosition(v); fl.push(v.clone()); footR.getWorldPosition(v); fr.push(v.clone()); }
      const sp = [];
      for (const f of [fl, fr]) {
        let mn = Infinity; f.forEach(p => mn = Math.min(mn, p.y));
        for (let i = 1; i < N; i++) if (f[i].y < mn + 0.015) sp.push(-(f[i + 1].z - f[i - 1].z) / (2 * D / N));
      }
      mx.stopAllAction(); mx.uncacheRoot(root);
      const s = sp.filter(x => x > 0).sort((a, b) => a - b); const med = s.length ? s[s.length >> 1] : 0;
      HM.runDbg = { n: sp.length, med, all: s.map(x => +x.toFixed(2)) };
      return med > 0.5 ? med : 0;
    } catch (e) { return 0; }
  }

  // ---------- перекраска атласа ----------
  const hexRgb = h => [(h >> 16 & 255) / 255, (h >> 8 & 255) / 255, (h & 255) / 255];
  function recolor(tex, pal, glow) {
    const src = HM.img[tex], W = 256, c = document.createElement('canvas'); c.width = W; c.height = W;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0, W, W);
    const em = glow ? document.createElement('canvas') : null;
    let ex = null; if (em) { em.width = W; em.height = W; ex = em.getContext('2d'); ex.fillStyle = '#000'; ex.fillRect(0, 0, W, W); }
    const cells = HM.CELLS[tex]; if (!pal && !glow) return { map: c };
    const id = x.getImageData(0, 0, W, W), d = id.data;
    const eid = ex ? ex.getImageData(0, 0, W, W) : null;
    const paint = (role, hex, toEm, k) => {
      for (const cr of (cells[role] || [])) {
        const [cc, rr] = cr.split(',').map(Number), x0 = cc * 32, y0 = rr * 64, w = rr === 3 && tex !== 'mage' && tex !== 'rogue' ? W : 32;
        let lm = 0, n = 0; for (let y = y0; y < y0 + 64; y++) for (let xx = x0; xx < x0 + w; xx++) { const i = (y * W + xx) * 4; lm += .3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2]; n++; }
        lm = Math.max(1, lm / n); const t = hexRgb(hex);
        for (let y = y0; y < y0 + 64; y++) for (let xx = x0; xx < x0 + w; xx++) {
          const i = (y * W + xx) * 4, l = .3 * d[i] + .59 * d[i + 1] + .11 * d[i + 2], f = 1 + (l / lm - 1) * (k || .85);
          if (toEm) { for (let q = 0; q < 3; q++) eid.data[i + q] = Math.min(255, Math.round(t[q] * 255 * Math.max(.4, f))); }
          else { for (let q = 0; q < 3; q++) d[i + q] = Math.min(255, Math.max(0, Math.round(t[q] * 255 * f))); }
        }
      }
    };
    if (pal) for (const r in pal) if (pal[r] != null) paint(r, pal[r], false, pal._k);
    if (glow) for (const r in glow) paint(r, glow[r], true);
    x.putImageData(id, 0, 0); if (ex) ex.putImageData(eid, 0, 0);
    return { map: c, em };
  }
  // какая текстура у плаща героя и какие её роли — «плащ» (их и тянем к цвету мастерства)
  HM.CAPE = { mage: ['cape'], knight: ['cloth'], barbarian: ['fur'], rogue: ['hood'] };
  function capeTex(sp) {
    if (sp._ct !== undefined) return sp._ct; sp._ct = null;
    for (const p of (sp.props || [])) { const n = typeof p === 'string' ? p : p.n; if (/_Cape$/.test(n) && HM.lib && HM.lib.props[n]) sp._ct = HM.lib.props[n].tex; }
    return sp._ct;
  }
  function heroTex(cid, sp, tex, tint) {
    const pal = Object.assign({}, (sp.pal || {})[tex] || {});
    if (tint && tex === capeTex(sp)) for (const r of HM.CAPE[tex]) { const a = pal[r] != null ? pal[r] : tint.hex, A = hexRgb(a), B = hexRgb(tint.hex); pal[r] = (Math.round((A[0] + (B[0] - A[0]) * tint.k) * 255) << 16) | (Math.round((A[1] + (B[1] - A[1]) * tint.k) * 255) << 8) | Math.round((A[2] + (B[2] - A[2]) * tint.k) * 255); }
    return getTex(cid, tex, pal, (sp.glow || {})[tex], tint ? tint.hex + ':' + tint.k : '');
  }
  function getTex(cid, tex, pal, glow, capeKey) {
    const k = cid + '|' + tex + '|' + (capeKey || '');
    if (HM.texC[k]) return HM.texC[k];
    const r = recolor(tex, pal, glow);
    const mk = cv => { const t = new T.CanvasTexture(cv); t.flipY = false; t.generateMipmaps = false; t.minFilter = T.LinearFilter; t.magFilter = T.LinearFilter; t.encoding = T.LinearEncoding; return t; };
    return (HM.texC[k] = { map: mk(r.map), em: r.em ? mk(r.em) : null });
  }

  // ---------- сборка героя ----------
  HM.has = cid => !!(HM.ready && HM.SPEC[cid]);
  HM.make = function (cid, opt) {
    opt = opt || {}; const sp = HM.SPEC[cid], L = HM.lib; if (!sp || !L) return null;
    const root = new T.Group(); root.name = 'hm_' + cid;
    const inner = new T.Group(); inner.scale.setScalar(HM.SC * (sp.sc || 1)); root.add(inner);
    const rig = L.rig.clone(true); inner.add(rig);
    const bones = {}; rig.traverse(o => { bones[o.name] = o; });
    const skel = new T.Skeleton(L.jointNames.map(n => bones[n]), L.boneInv);
    const mats = [], rimMats = [], texMats = {}, mcache = {};
    const matFor = (tex, skinned) => {
      const key = tex + (skinned ? 's' : 'r'); if (mcache[key]) return mcache[key];
      const tx = opt.raw ? { map: (() => { const t = new T.Texture(HM.img[tex]); t.flipY = false; t.needsUpdate = true; return t; })() } : heroTex(cid, sp, tex, opt.tint);
      const m = new T.MeshLambertMaterial({ map: tx.map, skinning: !!skinned });
      if (tx.em) { const k = sp.emK != null ? sp.emK : 1; m.emissiveMap = tx.em; m.emissive = new T.Color(k, k, k); }
      mats.push(m); rimMats.push(m); (texMats[tex] = texMats[tex] || []).push(m); return (mcache[key] = m);
    };
    const meshes = [];
    const parts = sp.parts || [sp.b + '_Body', (sp.h === 'H' ? 'H_Head_Hooded' : (sp.h || sp.b) + '_Head')];
    for (const pn of parts) {
      const pd = L.parts[pn]; if (!pd) continue;
      const m = new T.SkinnedMesh(pd.geo, matFor(pd.tex, true)); m.name = pn; m.bind(skel, new T.Matrix4()); m.frustumCulled = false; inner.add(m); meshes.push(m);
    }
    for (const pr of (sp.props || [])) {
      const nm = typeof pr === 'string' ? pr : pr.n, pd = L.props[nm]; if (!pd) continue;
      const m = new T.Mesh(pd.geo, matFor(pd.tex, false)); m.name = nm;
      m.position.copy(pd.pos); m.quaternion.copy(pd.quat); m.scale.copy(pd.scl);
      let par = bones[pd.parent];
      if (typeof pr === 'object') {
        if (pr.bone) par = bones[pr.bone];
        if (pr.p) m.position.fromArray(pr.p); if (pr.r) m.quaternion.setFromEuler(new T.Euler(pr.r[0], pr.r[1], pr.r[2])); if (pr.s) m.scale.setScalar(pr.s);
      }
      par.add(m); meshes.push(m);
    }
    // свои детали (рога, клюв, лук, молот…) — простая геометрия
    // запечены в 1–2 меша на деталь (цвета в вершинах): матовые — Lambert, светящиеся — без освещения
    let litM = null, glowM = null;
    for (const e of exGeo(cid, sp)) {
      let mt; if (e.glow) { if (!glowM) { glowM = new T.MeshBasicMaterial({ vertexColors: true }); mats.push(glowM); } mt = glowM; }
      else { if (!litM) { litM = new T.MeshLambertMaterial({ vertexColors: true }); mats.push(litM); rimMats.push(litM); } mt = litM; }
      const m = new T.Mesh(e.geo, mt); m.name = 'ex'; (bones[e.bone] || inner).add(m); meshes.push(m);
    }
    if (bones.head && sp.head !== 1) bones.head.scale.setScalar(sp.head || HM.HEAD);
    meshes.forEach(m => { m.castShadow = true; m.userData.hm = 1; });
    // кончик оружия: там висят огонёк и ореол стихии (масштаб обратный — их размеры в мировых единицах)
    const inv = 1 / inner.scale.x;
    const tip = new T.Object3D(); tip.name = 'tip';
    const tw = sp.tip || { bone: 'handslotr', p: [0, 0.9, 0] };
    (bones[tw.bone] || inner).add(tip); tip.position.fromArray(tw.p); tip.scale.setScalar(inv);
    if (opt.dbgTip) tip.add(new T.Mesh(new T.SphereGeometry(.12, 8, 6), new T.MeshBasicMaterial({ color: 0xff00ff })));
    const fistL = new T.Object3D(), fistR = new T.Object3D(); (bones.handslotl || inner).add(fistL); (bones.handslotr || inner).add(fistR); fistL.scale.setScalar(inv); fistR.scale.setScalar(inv);
    const inst = new Inst(cid, sp, root, inner, rig, bones, mats, rimMats, tip, [fistL, fistR], opt);
    inst.texMats = texMats;
    if (opt.mat) inst.setMat(opt.mat, opt.matSk);
    HM.inst.add(inst);
    return inst;
  };

  // ---------- анимация ----------
  const PICK = {
    staff: { idle: 'Unarmed_Idle', atk: ['Spellcast_Shoot'], cast: ['Spellcast_Raise'], castT: .55, atkT: .42 },
    book: { idle: 'Idle', atk: ['Spellcast_Shoot'], cast: ['Spellcast_Long'], castT: .6, atkT: .42 },
    bow: { idle: 'Idle', atk: ['1H_Ranged_Shoot'], cast: ['Spellcast_Shoot'], castT: .5, atkT: .42 },
    xbow: { idle: 'Unarmed_Idle', atk: ['2H_Ranged_Shoot'], cast: ['Spellcast_Shoot'], castT: .5, atkT: .42 },
    xbow1: { idle: 'Unarmed_Idle', atk: ['1H_Ranged_Shoot'], cast: ['Spellcast_Shoot'], castT: .5, atkT: .42 },
    sword: { idle: 'Unarmed_Idle', atk: ['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Slice_Horizontal'], cast: ['Spellcast_Shoot'], castT: .5, atkT: .4 },
    big: { idle: '2H_Melee_Idle', atk: ['2H_Melee_Attack_Chop', '2H_Melee_Attack_Slice'], cast: ['Spellcast_Shoot'], castT: .5, atkT: .42 },
    dual: { idle: 'Idle', atk: ['Dualwield_Melee_Attack_Chop', 'Dualwield_Melee_Attack_Slice', 'Dualwield_Melee_Attack_Stab'], cast: ['Spellcast_Shoot'], castT: .5, atkT: .38 },
    fists: { idle: 'Unarmed_Idle', atk: ['Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Punch_B', 'Unarmed_Melee_Attack_Kick'], cast: ['Spellcast_Shoot'], castT: .5, atkT: .38 },
    throw: { idle: 'Idle', atk: ['Throw'], cast: ['Spellcast_Shoot'], castT: .5, atkT: .42 },
  };
  class Inst {
    constructor(cid, sp, root, inner, rig, bones, mats, rimMats, tip, fists, opt) {
      Object.assign(this, { cid, sp, root, inner, rig, bones, mats, rimMats, tip, fists, opt });
      this.mixer = new T.AnimationMixer(inner);
      this.pk = PICK[sp.w] || PICK.staff;
      this.Ly = { U: { a: null, n: '', once: false, end: 0 }, Lo: { a: null, n: '', once: false, end: 0 } };
      this.ai = 0; this.hitCd = 0; this.dead = false; this.t = 0; this.move = false;
      this.play('U', this.pk.idle, {}); this.play('Lo', this.pk.idle, {});
      this.mixer.update(0);
    }
    play(k, name, o) {
      const ly = this.Ly[k], lib = k === 'U' ? HM.lib.U : HM.lib.Lo;
      let nm = name; if (o.once && ly.n === name) nm = name + '~'; // тот же клип подряд — берём копию
      const clip = lib[nm]; if (!clip) return;
      if (ly.n === nm && !o.once) { if (o.ts) ly.a.timeScale = o.ts; return; }
      const a = this.mixer.clipAction(clip);
      a.reset(); a.setLoop(o.once ? T.LoopOnce : T.LoopRepeat, Infinity); a.clampWhenFinished = !!o.clamp; a.timeScale = o.ts || 1; a.setEffectiveWeight(1);
      if (o.off) a.time = o.off * clip.duration;
      if (ly.a && ly.a !== a) { a.crossFadeFrom(ly.a, o.fade != null ? o.fade : .15, false); }
      a.play();
      ly.a = a; ly.n = nm; ly.once = !!o.once; ly.full = !!o.full; ly.end = o.once ? this.t + (clip.duration * (1 - (o.off || 0))) / (o.ts || 1) : 0;
    }
    // st: {move, spd, swing, cast, dead, hit, kind}
    drive(st) {
      const pk = this.pk;
      if (st.dead) {
        if (!this.dead) { this.dead = true; this.play('U', 'Death_A', { once: true, clamp: true, fade: .12 }); this.play('Lo', 'Death_A', { once: true, clamp: true, fade: .12 }); }
        return;
      }
      if (this.dead) { this.dead = false; this.Ly.U.once = this.Ly.Lo.once = false; this.Ly.U.n = this.Ly.Lo.n = ''; }
      const mv = !!st.move && (st.spd == null || st.spd > .6);
      // новое действие
      let act = null, ts = 1, full = !mv;
      if (st.swing) { act = pk.atk[this.ai++ % pk.atk.length]; const c = HM.lib.clips[act]; ts = c ? Math.max(1, c.duration / (pk.atkT || .42)) : 1.8; }
      else if (st.cast) { act = pk.cast[this.ai++ % pk.cast.length]; const c = HM.lib.clips[act]; ts = c ? Math.max(1, c.duration / (pk.castT || .55)) : 1.8; }
      else if (st.hit && this.hitCd <= 0 && !this.Ly.U.once) { act = 'Hit_A'; ts = 1.6; this.hitCd = 1.4; }
      if (act) {
        const off = act.indexOf('Spellcast_Long') === 0 ? .25 : act === 'Spellcast_Raise' ? .15 : 0;
        this.play('U', act, { once: true, ts, fade: .08, off });
        if (full) this.play('Lo', act, { once: true, ts, fade: .08, off });
      }
      // ноги
      const lo = this.Ly.Lo, up = this.Ly.U;
      const runTs = Math.min(3, Math.max(.65, (st.spd || 6) / (HM.runV * HM.SC * (this.sp.sc || 1))));
      if (mv) { this.play('Lo', 'Running_A', { ts: runTs, fade: lo.once ? .12 : .18 }); lo.once = false; }
      else if (!lo.once || this.t >= lo.end - .1) { this.play('Lo', pk.idle, { fade: .2 }); lo.once = false; }
      // верх
      if (up.once && this.t >= up.end - .1) up.once = false;
      if (!up.once) { if (mv) this.play('U', 'Running_A', { ts: runTs, fade: .2 }); else this.play('U', pk.idle, { fade: .25 }); }
      this.move = mv;
      // синхронизируем фазу бега верха и ног
      if (mv && up.n.indexOf('Running_A') === 0 && lo.n.indexOf('Running_A') === 0 && up.a && lo.a && Math.abs(up.a.time - lo.a.time) > .05 && up.a.getEffectiveWeight() > .99) up.a.time = lo.a.time;
    }
    update(dt) { this.t += dt; this.hitCd -= dt; this.mixer.update(dt); }
    setMat(m, msk) { // общий материал (силуэт в лобби); для скиннинга нужен отдельный (r128: skinning:true)
      this.inner.traverse(o => { if (o.isMesh) { o.material = o.isSkinnedMesh ? (msk || m) : m; o.castShadow = false; } });
    }
    // оттенок плаща по мастерству: hex — к чему тянуть, k — насколько (null — исходный)
    setCapeTint(hex, k) {
      const tex = capeTex(this.sp), key = hex == null ? '' : hex + ':' + k; if (!tex || key === (this.tintKey || '')) return;
      this.tintKey = key; const tx = heroTex(this.cid, this.sp, tex, hex == null ? null : { hex, k });
      for (const m of (this.texMats[tex] || [])) m.map = tx.map;
    }
    dispose() {
      this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.inner); this.mats.forEach(m => m.dispose()); HM.inst.delete(this);
      if (this.root.parent) this.root.parent.remove(this.root);
    }
  }
  HM.Inst = Inst;
  // ---------- свои детали: простая геометрия в стиле KayKit (кэш геометрий на всех) ----------
  const GC = {};
  const geo = (k, f) => GC[k] || (GC[k] = f());
  const msh = (g, m, p, r, s) => { const o = new T.Mesh(g, m); if (p) o.position.fromArray(p); if (r) o.rotation.set(r[0], r[1], r[2]); if (s) o.scale.fromArray(s); return o; };
  const cone = (r, h, n) => geo('co' + r + '|' + h + '|' + n, () => new T.ConeGeometry(r, h, n || 8));
  const cyl = (a, b, h, n) => geo('cy' + a + '|' + b + '|' + h + '|' + n, () => new T.CylinderGeometry(a, b, h, n || 10));
  const box = (x, y, z) => geo('bx' + x + '|' + y + '|' + z, () => new T.BoxGeometry(x, y, z));
  const sph = (r, a, b) => geo('sp' + r + '|' + a + '|' + b, () => new T.SphereGeometry(r, a || 10, b || 8));
  const tor = (R, r, arc, n) => geo('to' + R + '|' + r + '|' + arc + '|' + n, () => new T.TorusGeometry(R, r, 6, n || 18, arc || Math.PI * 2));
  HM.EX = {
    // рога: e.c цвет, e.em свечение, e.curl — загнутые назад (демон)
    horns(e, M) {
      const g = new T.Group(), m = M(e.c || 0xe8dcc0, e.em);
      for (const s of [-1, 1]) {
        if (e.curl) { g.add(msh(cyl(.07, .12, .4, 10), m, [s * .4, .98, .02], [-.2, 0, -s * .9])); g.add(msh(cyl(.045, .07, .34, 10), m, [s * .62, 1.15, -.06], [-.9, 0, -s * .55])); g.add(msh(cone(.045, .3, 10), m, [s * .72, 1.25, -.3], [-1.9, 0, -s * .2])); }
        else { g.add(msh(cone(.14, .62, 10), m, [s * .52, .95, .02], [0, 0, -s * .8])); g.add(msh(cone(.08, .46, 10), m, [s * .8, 1.36, .02], [0, 0, -s * .12])); }
      }
      return g;
    },
    // клюв чумного доктора и круглые стёкла
    beak(e, M) {
      const g = new T.Group(), bone = M(0xe8e0d0), gl = M(e.glass || 0x9be84a, .9), rim = M(0x2a2a2a);
      g.add(msh(cone(.15, .62, 10), bone, [0, .3, .78], [Math.PI / 2 + .25, 0, 0]));
      for (const s of [-1, 1]) { g.add(msh(cyl(.11, .11, .06, 14), rim, [s * .19, .47, .5], [Math.PI / 2, 0, 0])); g.add(msh(cyl(.085, .085, .07, 14), gl, [s * .19, .47, .515], [Math.PI / 2, 0, 0])); }
      return g;
    },
    // широкополая шляпа (инквизитор, чумной доктор)
    widehat(e, M) {
      const g = new T.Group(), m = M(e.c || 0x1c1c20), b = M(e.band || 0xf2c46b);
      g.add(msh(cyl(.82, .86, .05, 24), m, [0, .9, 0], [.06, 0, 0]));
      g.add(msh(cyl(.4, .46, e.tall ? .55 : .4, 18), m, [0, e.tall ? 1.2 : 1.12, -.02], [.06, 0, 0]));
      g.add(msh(cyl(.47, .47, .08, 18), b, [0, .97, -.01], [.06, 0, 0]));
      return g;
    },
    // рога-ветви друида с листьями
    antlers(e, M) {
      const g = new T.Group(), w = M(e.c || 0x6b4a2a), lf = M(e.leaf || 0x6fbf4a, .15);
      for (const s of [-1, 1]) {
        g.add(msh(cyl(.035, .05, .6), w, [s * .38, 1.05, -.02], [0, 0, -s * .55]));
        g.add(msh(cyl(.025, .035, .34), w, [s * .62, 1.42, -.02], [0, 0, -s * .1]));
        g.add(msh(cyl(.022, .03, .3), w, [s * .44, 1.38, -.02], [0, 0, s * .5]));
        g.add(msh(cyl(.02, .028, .26), w, [s * .78, 1.26, -.02], [0, 0, -s * 1.2]));
        g.add(msh(sph(.09), lf, [s * .3, .98, .3], null, [1, .5, 1.4]));
      }
      return g;
    },
    // перья и повязка шамана
    feathers(e, M) {
      const g = new T.Group(), band = M(e.band || 0xc89a5a), cs = e.cs || [0xd2453a, 0x3a8ad2, 0xffe45c];
      g.add(msh(tor(.52, .05, 0, 20), band, [0, .78, 0], [Math.PI / 2, 0, 0]));
      cs.forEach((c, i) => g.add(msh(cone(.07, .62, 6), M(c, .12), [(i - 1) * .17, 1.15, -.38], [-.35, 0, (i - 1) * -.35], [1, 1, .35])));
      return g;
    },
    // деревянная маска шамана
    mask(e, M) {
      const g = new T.Group(), m = M(e.c || 0xc89a5a), d = M(0x2a1a10), gl = M(e.glow || 0xffe45c, 1);
      g.add(msh(box(.66, .74, .08), m, [0, .42, .55]));
      for (const s of [-1, 1]) g.add(msh(box(.16, .06, .04), gl, [s * .15, .52, .6]));
      g.add(msh(box(.26, .05, .04), d, [0, .22, .6]));
      g.add(msh(box(.06, .2, .04), M(0xd2453a), [0, .66, .6]));
      return g;
    },
    // очки алхимика на лбу
    goggles(e, M) {
      const g = new T.Group(), st = M(0x3a2a1a), rim = M(0xb8a070), gl = M(e.glow || 0x9be84a, .8);
      g.add(msh(tor(.53, .04, 0, 22), st, [0, .74, 0], [Math.PI / 2 - .12, 0, 0]));
      for (const s of [-1, 1]) { g.add(msh(cyl(.14, .14, .1, 14), rim, [s * .2, .8, .48], [Math.PI / 2 - .4, 0, 0])); g.add(msh(cyl(.105, .105, .11, 14), gl, [s * .2, .8, .495], [Math.PI / 2 - .4, 0, 0])); }
      return g;
    },
    // повязка монаха
    band(e, M) {
      const g = new T.Group(), m = M(e.c || 0xd9822b);
      g.add(msh(tor(.53, .055, 0, 22), m, [0, .74, 0], [Math.PI / 2, 0, 0]));
      for (const s of [-1, 1]) g.add(msh(box(.08, .34, .03), m, [s * .08, .6, -.55], [.3, 0, s * .35]));
      return g;
    },
    // ---- оружие (в руке handslotr: ось +Y — вдоль оружия) ----
    hammer(e, M) {
      const g = new T.Group(), wd = M(0x6a4a2a), mt = M(e.metal || 0xd8dce6), gd = M(e.c || 0xf2c46b, e.em);
      g.add(msh(cyl(.045, .05, 1.35), wd, [0, .28, 0]));
      g.add(msh(sph(.07), gd, [0, -.42, 0]));
      g.add(msh(box(.52, .3, .3), mt, [0, 1.0, 0]));
      g.add(msh(box(.55, .08, .33), gd, [0, 1.0, 0]));
      for (const s of [-1, 1]) g.add(msh(box(.06, .34, .34), gd, [s * .28, 1.0, 0]));
      g.add(msh(cone(.07, .2, 6), gd, [0, 1.25, 0]));
      return g;
    },
    scythe(e, M) {
      const g = new T.Group(), wd = M(0x2a1e2a), bl = M(0xc8ccd8), gl = M(e.c || 0xb07bff, .7);
      g.add(msh(cyl(.035, .04, 2.3), wd, [0, .3, 0]));
      g.add(msh(tor(.62, .06, 1.9, 20), bl, [0, 1.15, .28], [0, Math.PI / 2, .25], [1, 1, .35]));
      g.add(msh(tor(.64, .02, 1.9, 20), gl, [0, 1.15, .28], [0, Math.PI / 2, .25], [1, 1, .35]));
      g.add(msh(box(.09, .16, .09), gl, [0, 1.42, 0]));
      return g;
    },
    bow(e, M) {
      const g = new T.Group(), wd = M(e.c || 0x6a4a2a), gd = M(e.trim || 0x8ff5d2, .35), str = M(0xeeeeee);
      const R = .78, arc = 2.3, inner = new T.Group();
      inner.add(msh(tor(R, .05, arc, 20), wd, [-R, 0, 0], [0, 0, -arc / 2]));
      for (const s of [-1, 1]) inner.add(msh(cone(.05, .16, 6), gd, [-R + R * Math.cos(arc / 2), s * R * Math.sin(arc / 2), 0], [0, 0, s < 0 ? Math.PI : 0]));
      inner.add(msh(cyl(.006, .006, 2 * R * Math.sin(arc / 2)), str, [-R + R * Math.cos(arc / 2), 0, 0]));
      inner.add(msh(box(.08, .2, .08), gd, [0, 0, 0]));
      inner.rotation.set(e.rx || 0, e.ry || 0, e.rz || 0); g.add(inner);
      return g;
    },
    lantern(e, M) {
      const g = new T.Group(), wd = M(0x3a2a1a), fr = M(0x2a2a2a), gl = M(e.c || 0x9be84a, 1);
      g.add(msh(cyl(.03, .035, 2.5), wd, [0, .5, 0]));
      g.add(msh(box(.42, .04, .04), wd, [.17, 1.72, 0]));
      g.add(msh(cyl(.008, .008, .16), fr, [.36, 1.63, 0]));
      g.add(msh(box(.2, .26, .2), fr, [.36, 1.43, 0]));
      g.add(msh(box(.15, .2, .21), gl, [.36, 1.43, 0]));
      g.add(msh(box(.21, .2, .15), gl, [.36, 1.43, 0]));
      g.add(msh(cone(.13, .1, 4), fr, [.36, 1.6, 0], [0, Math.PI / 4, 0]));
      return g;
    },
  };
  // свои детали героя → общие на всех экземпляры геометрии (кэш по герою): матовая часть и светящаяся
  HM.exC = {};
  function exGeo(cid, sp) {
    if (HM.exC[cid]) return HM.exC[cid];
    const out = [];
    for (const ex of (sp.ex || [])) {
      const o = HM.EX[ex.k](ex, (c, em) => ({ c, em: em || 0 })); if (!o) continue; o.updateMatrixWorld(true);
      const lit = [], glow = [];
      o.traverse(m => {
        if (!m.isMesh) return; const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(m.matrixWorld);
        const col = new T.Color(m.material.c), em = m.material.em; if (em > 0 && em < .5) col.multiplyScalar(1 + em);
        (em >= .5 ? glow : lit).push({ g, col });
      });
      for (const [list, gl] of [[lit, false], [glow, true]]) {
        if (!list.length) continue; let n = 0; list.forEach(x => n += x.g.attributes.position.count);
        const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3); let o3 = 0;
        for (const x of list) { const c = x.g.attributes.position.count; P.set(x.g.attributes.position.array, o3); N.set(x.g.attributes.normal.array, o3); for (let i = 0; i < c; i++) { C[o3 + i * 3] = x.col.r; C[o3 + i * 3 + 1] = x.col.g; C[o3 + i * 3 + 2] = x.col.b; } o3 += c * 3; x.g.dispose(); }
        const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3)); geo.setAttribute('color', new T.BufferAttribute(C, 3));
        out.push({ geo, glow: gl, bone: ex.bone || 'head' });
      }
    }
    return (HM.exC[cid] = out);
  }
  // ---------- 20 героев ----------
  // b — тело, h — голова (K рыцарь, B варвар, M маг, R разбойница, H капюшон), w — набор анимаций,
  // props — детали KayKit, ex — свои детали, pal — перекраска атласа по ролям, glow — свечение клеток, tip — где огонёк чар.
  const TIP = { staff: { bone: 'handslotr', p: [0, 1.12, 0] }, wand: { bone: 'handslotr', p: [0, .72, 0] }, xbow: { bone: 'handslotr', p: [.95, .06, 0] }, xbow1: { bone: 'handslotr', p: [.8, .05, 0] }, knife: { bone: 'handslotr', p: [0, .85, 0] }, hand: { bone: 'handslotr', p: [0, .05, 0] }, bomb: { bone: 'handslotr', p: [0, .2, 0] }, sword1: { bone: 'handslotr', p: [0, 1.25, 0] }, sword2: { bone: 'handslotr', p: [0, 1.75, 0] }, axe: { bone: 'handslotr', p: [-.3, .8, 0] }, hammer: { bone: 'handslotr', p: [0, 1.05, 0] }, scythe: { bone: 'handslotr', p: [0, 1.42, 0] }, bow: { bone: 'handslotr', p: [0, 0, 0] }, lantern: { bone: 'handslotr', p: [.36, 1.43, 0] } };
  HM.SPEC = {
    pyro: { b: 'M', h: 'B', w: 'staff', props: ['Mp_2H_Staff', 'Mp_Hat', 'Mp_Cape'], tip: TIP.staff,
      pal: { mage: { robe: 0x9a2e1c, hat: 0x7a1f14, robe2: 0x4a1410, cape: 0x5a1a12, trim: 0xffb347, inner: 0xd8b070, teal: 0xff7a33, pants: 0x3a2418 }, barbarian: { hair: 0xe9e6f2 } },
      glow: { mage: { gem: 0xff7a33 } } },
    cryo: { b: 'M', h: 'H', w: 'staff', props: ['Mp_2H_Staff', 'Mp_Cape'], tip: TIP.staff,
      pal: { mage: { robe: 0x3f6fb0, hat: 0x2a4a7a, robe2: 0x1f3a66, cape: 0xdff4ff, trim: 0xdff4ff, inner: 0xb8d8f0, teal: 0x8fdcff, pants: 0x2a3a55 }, rogue: { hood: 0xdff4ff, hair: 0xe8f4ff } },
      glow: { mage: { gem: 0x8fdcff }, rogue: { eye: 0x9fe8ff } } },
    storm: { b: 'M', h: 'K', w: 'book', props: ['Mp_Spellbook_open', 'Mp_1H_Wand', 'Mp_Cape'], tip: TIP.wand, ex: [{ k: 'horns', c: 0xffe45c, em: .45 }],
      pal: { mage: { robe: 0x2c2f5a, hat: 0x2c2f5a, robe2: 0x1c1e3a, cape: 0x1c1e3a, trim: 0xffe45c, inner: 0x9aa0b0, teal: 0xffe45c, pants: 0x2a2a3a }, knight: { hair: 0xc8ccd8 } },
      glow: { mage: { gem: 0xffe45c, teal: 0xffe45c } } },
    plague: { b: 'M', h: 'K', w: 'staff', props: ['Mp_Cape'], tip: TIP.lantern, ex: [{ k: 'beak' }, { k: 'widehat', c: 0x1a1a1e, band: 0x9be84a, tall: 1 }, { k: 'lantern', bone: 'handslotr' }],
      pal: { mage: { robe: 0x2a2a2e, hat: 0x2a2a2e, robe2: 0x1a1a1e, cape: 0x1a1a1e, trim: 0x9be84a, inner: 0x5a5a5e, teal: 0x9be84a, pants: 0x1e1e22 }, knight: { hair: 0x2a2a2a } } },
    necro: { b: 'M', h: 'H', w: 'staff', props: ['Mp_Cape'], tip: TIP.scythe, ex: [{ k: 'scythe', bone: 'handslotr' }],
      pal: { mage: { robe: 0x241a33, hat: 0x241a33, robe2: 0x120c1c, cape: 0x120c1c, trim: 0xb07bff, inner: 0x3a2a4a, teal: 0xb07bff, pants: 0x1a1422 }, rogue: { hood: 0x1f1530, hair: 0xd8d8e8 } },
      glow: { rogue: { eye: 0xb07bff } } },
    paladin: { b: 'K', w: 'sword', props: ['Kp_Helmet', 'Kp_Cape', 'Kp_Badge_Shield'], tip: TIP.hammer, ex: [{ k: 'hammer', bone: 'handslotr' }],
      pal: { knight: { armor: 0xeeeae0, armor2: 0xd8d2c0, dark: 0xb8ae98, plate4: 0xc8c0a8, leather: 0x8a6a40, cloth: 0xf6f0dc, shield: 0xf2c46b, grip: 0x8a6a40 } } },
    geo: { b: 'M', h: 'B', w: 'staff', props: ['Mp_2H_Staff', 'Mp_Cape'], tip: TIP.staff,
      pal: { mage: { robe: 0x6b4e33, hat: 0x6b4e33, robe2: 0x3f2e20, cape: 0x3f2e20, trim: 0xd39a5a, inner: 0x8a7a60, teal: 0xd39a5a, pants: 0x3a2a1a }, barbarian: { hair: 0x8a6a4a } },
      glow: { mage: { gem: 0xe0a060 } } },
    windr: { b: 'R', h: 'R', w: 'bow', props: ['Rp_Cape'], tip: TIP.bow, ex: [{ k: 'bow', bone: 'handslotr' }],
      pal: { rogue: { tunic: 0x3e6b5a, hood: 0x2f5246, leather: 0x5a4030, glove: 0x4a3020, pants: 0x2a3a30, boots: 0x3a2a20, hair: 0xd8b878 } } },
    hemo: { b: 'M', h: 'R', w: 'book', props: ['Mp_Spellbook_open', 'Mp_1H_Wand', 'Mp_Cape'], tip: TIP.wand,
      pal: { mage: { robe: 0x5a0f1e, hat: 0x5a0f1e, robe2: 0x2e0a10, cape: 0x2e0a10, trim: 0xff3b5c, inner: 0x6a2a30, teal: 0xff3b5c, pants: 0x2a1014 }, rogue: { hair: 0x1a0a0e } },
      glow: { mage: { gem: 0xff3b5c }, rogue: { eye: 0xff3b5c } } },
    arcan: { b: 'M', h: 'M', w: 'book', props: ['Mp_Hat', 'Mp_Spellbook', 'Mp_1H_Wand', 'Mp_Cape'], tip: TIP.wand,
      pal: { mage: { robe: 0x23306b, hat: 0x1b2350, robe2: 0x141a3a, cape: 0x1b2350, trim: 0xf2c46b, inner: 0xd8d8e8, teal: 0x5b9bff, pants: 0x1a1a2a, hair: 0xd8d8e8 } },
      glow: { mage: { gem: 0x5b9bff, teal: 0x5b9bff } } },
    bers: { b: 'B', h: 'B', w: 'dual', props: ['Bp_1H_Axe', 'Bp_1H_Axe_Offhand', 'Bp_Hat'], tip: TIP.axe,
      pal: { barbarian: { cloth: 0x9a2a2a, leather: 0x4a3020, fur: 0x5a3a28, hair: 0xa0522d, pants: 0x2a1a14 } } },
    dk: { b: 'K', w: 'big', props: ['Kp_Helmet', 'Kp_Cape', 'Kp_2H_Sword'], tip: TIP.sword2,
      pal: { knight: { armor: 0x3a3d4a, armor2: 0x2a2d3a, dark: 0x1a1c26, plate4: 0x2a2d3a, leather: 0x2a2a30, cloth: 0x1a2a40, blade: 0x8fdcff, grip: 0x23252f, hair: 0x8a96a0 } },
      glow: { knight: { gem: 0x8fdcff } }, emK: .6 },
    druid: { b: 'M', h: 'K', w: 'staff', props: ['Mp_2H_Staff', 'Mp_Cape'], tip: TIP.staff, ex: [{ k: 'antlers' }],
      pal: { mage: { robe: 0x3f5a2c, hat: 0x3f5a2c, robe2: 0x2f4420, cape: 0x2f4420, trim: 0x9be84a, inner: 0x6b5a40, teal: 0x9be84a, pants: 0x3a2a1a, wood: 0x5a4030 }, knight: { hair: 0x6b4a2a } },
      glow: { mage: { gem: 0x9be84a } } },
    hunter: { b: 'R', h: 'H', w: 'xbow', props: ['Rp_2H_Crossbow', 'Rp_Cape'], tip: TIP.xbow,
      pal: { rogue: { tunic: 0x5a6a78, hood: 0xdfe8ee, leather: 0x6a7a88, glove: 0x4a5560, pants: 0x3a4450, boots: 0x2a3038, grey: 0xb8c4cc, hair: 0xe8f0f4 } },
      glow: { rogue: { eye: 0x9fe8ff } } },
    assassin: { b: 'R', h: 'H', w: 'dual', props: ['Rp_Knife', 'Rp_Knife_Offhand', 'Rp_Cape'], tip: TIP.knife,
      pal: { rogue: { tunic: 0x241f2e, hood: 0x18141f, leather: 0x2a2430, glove: 0x14121a, pants: 0x1a1820, boots: 0x0e0c12, grey: 0x4a4458, hair: 0x14121a } },
      glow: { rogue: { eye: 0x9be84a, blade: 0x9be84a } }, emK: .8 },
    shaman: { b: 'B', h: 'B', w: 'staff', props: ['Mp_2H_Staff', 'Bp_Cape'], tip: TIP.staff, ex: [{ k: 'feathers' }],
      pal: { barbarian: { cloth: 0x7a5a3a, leather: 0x5a3f28, fur: 0x8a6a4a, trim: 0xffe45c, hair: 0x6a6a72, pants: 0x4a3220 }, mage: { wood: 0x6a4a2a, teal: 0xffe45c } },
      glow: { mage: { gem: 0xffe45c }, barbarian: { eye: 0xffe45c } } },
    monk: { b: 'B', h: 'K', w: 'fists', props: [], tip: TIP.hand, ex: [{ k: 'band', c: 0xd9822b }],
      pal: { barbarian: { cloth: 0xd9822b, leather: 0x8a5a2a, fur: 0xfff1b8, trim: 0xfff1b8, pants: 0xb86a20, dark: 0x6a4a2a }, knight: { hair: 0x1a1a1a } } },
    lock: { b: 'M', h: 'H', w: 'book', props: ['Mp_Spellbook_open', 'Mp_1H_Wand', 'Mp_Cape'], tip: TIP.wand, ex: [{ k: 'horns', c: 0x6a1a12, em: .2, curl: 1 }],
      pal: { mage: { robe: 0x3a1020, hat: 0x3a1020, robe2: 0x1a0a14, cape: 0x1a0a14, trim: 0xff7a33, inner: 0x4a2030, teal: 0xff7a33, pants: 0x1a1014 }, rogue: { hood: 0x1f0a14, hair: 0x2a1a14 } },
      glow: { mage: { gem: 0xff7a33 }, rogue: { eye: 0xff7a33 } } },
    inq: { b: 'K', h: 'K', w: 'xbow1', props: ['Kp_Cape', 'Rp_1H_Crossbow'], tip: TIP.xbow1, ex: [{ k: 'widehat', c: 0x1c1c20, band: 0xf2c46b }],
      pal: { knight: { armor: 0x3a3a40, armor2: 0x2a2a2e, dark: 0x1a1a1e, plate4: 0x2a2a2e, leather: 0x3a2a1a, cloth: 0x6a1a1a, hair: 0x3a2a1a }, rogue: { wood: 0x3a2a1a, metal: 0xf2c46b } } },
    alch: { b: 'R', h: 'R', w: 'throw', props: ['Rp_Throwable'], tip: TIP.bomb, ex: [{ k: 'goggles' }],
      pal: { rogue: { tunic: 0x6b4a2e, hood: 0x9be84a, leather: 0x4a3220, glove: 0x3a2a1a, pants: 0x3a2a1a, boots: 0x2a1a10, bomb: 0x9be84a, hair: 0x6a3a1a } },
      glow: { rogue: { bomb: 0x9be84a } } },
  };
  window.HM = HM;
})();
