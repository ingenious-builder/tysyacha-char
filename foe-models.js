// Модели врагов и призывов «Тысячи чар»: открытые модели Quaternius (CC0) и KayKit Skeletons (CC0, Kay Lousberg).
// Скорость на телефоне — главное: анимации заранее «запекаются» в текстуру костей (кадры всех клипов модели),
// каждый враг берёт свои два кадра и долю смешения через юниформу своего материала. Ни миксеров, ни костей
// на кадр: экземпляр = один скиннированный меш + один материал (1 вызов отрисовки), стоимость кадра — пара чисел.
// Перекраска под регион — цвет в вершинах по «ролям» (тело, глаза, оружие…), свои детали (корона, бомба, коса)
// уже вшиты в модель и прячутся/показываются ролью. Зависит только от THREE (r128) и THREE.GLTFLoader.
// Игра работает и без этого файла (прежние враги из примитивов).
(function () {
  'use strict';
  const T = THREE;
  const FM = { ready: false, failed: false, st: 0, lib: {}, atl: {}, V: '1', geoC: {} };
  const IDENT = new T.Matrix4();

  // ---------- загрузка ----------
  function fetchBuf(url) { return fetch(url).then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r; }); }
  FM.load = function (base) {
    if (FM.st && FM.st !== 3) return FM.p; FM.st = 1; FM.failed = false; base = base || '';
    const u = base + 'assets/models/kk_foes.glb', V = FM.V;
    // сжатый файл (1,6 МБ вместо 4) — если браузер умеет распаковывать сам; иначе обычный
    const gz = typeof DecompressionStream === 'function'
      ? fetchBuf(u + '.gz?v=' + V).then(r => new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer())
      : Promise.reject(new Error('no gzip'));
    FM.p = gz.catch(() => fetchBuf(u + '?v=' + V).then(r => r.arrayBuffer()))
      .then(buf => new Promise((ok, no) => new T.GLTFLoader().parse(buf, base, ok, no)))
      .then(g => { prep(g); FM.ready = true; FM.st = 2; return FM; })
      .catch(e => { FM.failed = true; FM.st = 3; console.warn('модели врагов не загрузились', e); throw e; });
    return FM.p;
  };
  function prep(g) {
    const byName = {}; for (const c of g.animations) byName[c.name] = c;
    for (const root of g.scene.children.slice()) {
      if (!/^M_/.test(root.name)) continue;
      const id = root.name.slice(2), ex = root.userData || {};
      let mesh = null; root.traverse(o => { if (o.isSkinnedMesh) mesh = o; });
      if (!mesh) continue;
      g.scene.remove(root); root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.set(1, 1, 1); root.updateMatrixWorld(true);
      const geo = mesh.geometry, fmc = geo.attributes._fmc;
      const clips = {}; for (const k in (ex.clips || {})) { const c = byName[id + '|' + k]; if (c) clips[k] = c; }
      const nodes = []; root.traverse(o => { if (o !== mesh && o !== root) nodes.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); });
      const bx = ex.box || [-1, 0, -1, 1, 2, 1];
      FM.lib[id] = { id, root, mesh, geo, fmc: fmc.array, roles: ex.roles || [], clips, dur: ex.clips || {}, nb: mesh.skeleton.bones.length, names: ex.names || {},
        box: new T.Box3(new T.Vector3(bx[0], bx[1], bx[2]), new T.Vector3(bx[3], bx[4], bx[5])), nodes };
    }
  }

  // ---------- запекание клипов в текстуру костей ----------
  // кадров в секунду: стойка медленная — 15, остальное — 24
  const FPS = k => k === 'idle' ? 15 : 24;
  const ONCE = { atk: 1, atk2: 1, atk3: 1, hit: 1, die: 1, cast: 1, spawn: 1, shoot: 1, summon: 1, bhit: 1, jump: 1 };
  // morph: {кость: [sx,sy,sz]} — переделка пропорций (медведь, лев из волка)
  FM.bake = function (id, morph, mkey) {
    const key = id + (mkey ? '#' + mkey : ''); if (FM.atl[key]) return FM.atl[key];
    const L = FM.lib[id]; if (!L) return null;
    const nb = L.nb, list = [], t0 = performance.now(); let F = 0;
    for (const k in L.clips) { const d = Math.max(.05, L.clips[k].duration), once = !!ONCE[k], n = Math.max(2, Math.round(d * FPS(k)) + (once ? 1 : 0)); list.push({ k, d, n, once, off: F }); F += n; }
    const texels = F * nb * 4; let size = 4; while (size * size < texels) size *= 2;
    const data = new Float32Array(size * size * 4);
    const root = L.root, mesh = L.mesh, bones = mesh.skeleton.bones, inv = mesh.skeleton.boneInverses, bm = mesh.bindMatrix;
    const mixer = new T.AnimationMixer(root), m = new T.Matrix4();
    const mb = morph ? Object.keys(morph).map(n => [root.getObjectByName(L.names[n] || n), morph[n]]).filter(x => x[0]) : null;
    const info = {};
    for (const c of list) {
      for (const [o, p, q, s] of L.nodes) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); }
      const a = mixer.clipAction(L.clips[c.k]); a.reset(); a.play(); a.setEffectiveWeight(1);
      for (let f = 0; f < c.n; f++) {
        a.time = c.once ? c.d * f / (c.n - 1) : c.d * f / c.n; mixer.update(0);
        if (mb) for (const [o, sv] of mb) o.scale.set(o.scale.x * sv[0], o.scale.y * sv[1], o.scale.z * sv[2]);
        root.updateMatrixWorld(true);
        for (let b = 0; b < nb; b++) { m.multiplyMatrices(bones[b].matrixWorld, inv[b]).multiply(bm); m.toArray(data, ((c.off + f) * nb + b) * 16); }
        if (mb) for (const [o, sv] of mb) o.scale.set(o.scale.x / sv[0], o.scale.y / sv[1], o.scale.z / sv[2]);
      }
      a.stop(); mixer.uncacheAction(L.clips[c.k]);
      info[c.k] = c;
    }
    mixer.uncacheRoot(root);
    for (const [o, p, q, s] of L.nodes) { o.position.copy(p); o.quaternion.copy(q); o.scale.copy(s); }
    const tex = new T.DataTexture(data, size, size, T.RGBAFormat, T.FloatType); tex.needsUpdate = true;
    const skel = new T.Skeleton([new T.Bone()]); skel.boneTexture = tex; skel.boneTextureSize = size; skel.update = function () {};
    const A = { key, id, nb, tex, size, skel, clips: info, ms: performance.now() - t0, data };
    A.rv = runSpeed(A, L);
    return (FM.atl[key] = A);
  };
  // «родная» скорость бега клипа run: самые низкие вершины-кости (стопы) в фазе опоры, медиана скорости назад
  function runSpeed(A, L) {
    const c = A.clips.run || A.clips.walk; if (!c) return 0;
    try {
      const nb = A.nb, d = A.data, ys = [];
      // позиции костей = матрица кадра × точка кости в позе привязки (обратная к IBM)
      const bp = []; for (let b = 0; b < nb; b++) { const im = L.mesh.skeleton.boneInverses[b].clone().invert(); bp.push(new T.Vector3().setFromMatrixPosition(im)); }
      const M = new T.Matrix4(), v = new T.Vector3(), P = [];
      for (let f = 0; f < c.n; f++) { const row = []; for (let b = 0; b < nb; b++) { M.fromArray(d, ((c.off + f) * nb + b) * 16); row.push(v.copy(bp[b]).applyMatrix4(M).clone()); } P.push(row); }
      let mn = Infinity; for (const row of P) for (const p of row) mn = Math.min(mn, p.y);
      const h = L.box.max.y - L.box.min.y, sp = [], dt = c.d / c.n;
      for (let b = 0; b < nb; b++) for (let f = 0; f < c.n; f++) {
        const p = P[f][b]; if (p.y > mn + h * .04) continue;
        const a = P[(f - 1 + c.n) % c.n][b], z = P[(f + 1) % c.n][b]; sp.push(-(z.z - a.z) / (2 * dt));
      }
      const s = sp.filter(x => x > 0).sort((a, b) => a - b); return s.length > 3 ? s[s.length >> 1] : 0;
    } catch (e) { return 0; }
  }

  // ---------- перекраска (цвет вершин по ролям) ----------
  const hexRgb = h => [(h >> 16 & 255), (h >> 8 & 255), (h & 255)];
  const lum = c => .3 * c[0] + .59 * c[1] + .11 * c[2];
  // pal: {роль: 0xRRGGBB | null}; glow: {роль: 0..1}; hide: [роли]
  function palGeo(L, pal, glow, hide, key) {
    const gk = L.id + '|' + key; if (FM.geoC[gk]) return FM.geoC[gk];
    const src = L.fmc, n = src.length / 4, out = new Uint8Array(n * 4), roles = L.roles;
    const rm = roles.map(r => pal && pal[r] != null ? hexRgb(pal[r]) : null), gl = roles.map(r => glow && glow[r] != null ? glow[r] : 0), hd = roles.map(r => !!(hide && hide.indexOf(r) >= 0));
    // средняя яркость роли — чтобы перекраска сохраняла светотень текстуры (у KayKit цвет в вершинах неровный)
    const sum = roles.map(() => [0, 0]); for (let i = 0; i < n; i++) { const r = src[i * 4 + 3]; if (rm[r]) { sum[r][0] += lum([src[i * 4], src[i * 4 + 1], src[i * 4 + 2]]); sum[r][1]++; } }
    for (let i = 0; i < n; i++) {
      const r = src[i * 4 + 3], t = rm[r];
      if (t) { const k = Math.max(.5, Math.min(1.6, lum([src[i * 4], src[i * 4 + 1], src[i * 4 + 2]]) / Math.max(1, sum[r][0] / sum[r][1]))); for (let q = 0; q < 3; q++) out[i * 4 + q] = Math.min(255, Math.round(t[q] * k)); }
      else for (let q = 0; q < 3; q++) out[i * 4 + q] = src[i * 4 + q];
      out[i * 4 + 3] = hd[r] ? 255 : Math.round(Math.min(.99, gl[r]) * 255);
    }
    const g = new T.BufferGeometry(), a = L.geo.attributes;
    g.setIndex(L.geo.index); g.setAttribute('position', a.position); g.setAttribute('normal', a.normal); g.setAttribute('skinIndex', a.skinIndex); g.setAttribute('skinWeight', a.skinWeight);
    g.setAttribute('fmc', new T.BufferAttribute(out, 4, true));
    const c = L.box.getCenter(new T.Vector3()), sz = L.box.getSize(new T.Vector3());
    g.boundingSphere = new T.Sphere(c, Math.max(sz.x, sz.y, sz.z) * .9 + .2); g.boundingBox = L.box.clone();
    return (FM.geoC[gk] = g);
  }

  // ---------- материал: один на всех врагов ----------
  // Свои числа экземпляра (кадры A/B и доля, вспышка, ободок) лежат в его bindMatrix: three r128 шлёт её в шейдер
  // для каждого скиннированного меша отдельно, даже когда материал общий (как и текстуру костей). Поэтому материал
  // один на всех, без пересылки всех юниформ на каждого врага. bindMatrix: [0] кадр A, кадр B, доля; [1] вспышка rgb, сила
  // ободка; [2] цвет ободка. Скиннинг ниже свой — без bindMatrix как матрицы.
  // второй кадр читаем, только когда есть смешение (дальние враги — без него: вдвое меньше выборок)
  const SKIN_V = ['X', 'Y', 'Z', 'W'].map((c, i) => `mat4 boneMat${c} = getBoneMatrix( skinIndex.${'xyzw'[i]} + bindMatrix[0].x );`).join('\n\t') +
    '\n\tif ( bindMatrix[0].z > 0.0 ) {\n\t\t' + ['X', 'Y', 'Z', 'W'].map((c, i) => `boneMat${c} += ( getBoneMatrix( skinIndex.${'xyzw'[i]} + bindMatrix[0].y ) - boneMat${c} ) * bindMatrix[0].z;`).join('\n\t\t') + '\n\t}';
  const SKIN_P = `vec4 skinned = vec4( 0.0 );
	vec4 skinVertex = vec4( transformed, 1.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = skinned.xyz;`;
  const SKIN_N = `mat4 skinMatrix = skinWeight.x * boneMatX + skinWeight.y * boneMatY + skinWeight.z * boneMatZ + skinWeight.w * boneMatW;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;`;
  const VARY = `varying vec4 vFm;
varying vec3 vEm;
varying vec4 vRimC;
varying float vRim;
`;
  function patchV(sh, full) {
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'attribute vec4 fmc;\n' + (full ? VARY : '') + 'void main() {' + (full ? '\n\tvFm = fmc; vEm = bindMatrix[1].xyz; vRimC = vec4( bindMatrix[2].xyz, bindMatrix[1].w );' : ''))
      .replace('#include <skinbase_vertex>', SKIN_V).replace('#include <skinning_vertex>', SKIN_P).replace('#include <skinnormal_vertex>', SKIN_N)
      .replace('#include <project_vertex>', '#include <project_vertex>\n\tif ( fmc.a > 0.999 ) gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );' + (full ? '\n\tvRim = pow( 1. - clamp( dot( normalize( transformedNormal ), normalize( -mvPosition.xyz ) ), 0., 1. ), 2.4 );' : ''));
  }
  FM.mat = function () {
    if (FM._m) return FM._m;
    const m = new T.MeshLambertMaterial({ skinning: true });
    m.customProgramCacheKey = () => 'fm2';
    m.onBeforeCompile = sh => {
      patchV(sh, true);
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', VARY + 'void main() {')
        .replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.rgb *= vFm.rgb;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += vEm + vFm.rgb * vFm.a * 1.3;')
        .replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', 'gl_FragColor = vec4( outgoingLight + vRimC.rgb * vRim * vRimC.a, diffuseColor.a );');
    };
    const d = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, skinning: true });
    d.customProgramCacheKey = () => 'fmd2'; d.onBeforeCompile = sh => patchV(sh, false);
    return (FM._m = { m, d });
  };

  // ---------- экземпляр ----------
  // px — «материал» для кода игры: вспышка (emissive) и ободок (userData.rimU) пишутся сюда, update() переносит их в bindMatrix
  class Inst {
    constructor(A, L, sp, geo, rimCol, rimK) {
      this.A = A; this.L = L; this.sp = sp;
      this.g = new T.Group(); this.inner = new T.Group(); this.g.add(this.inner);
      const M = FM.mat(), mesh = new T.SkinnedMesh(geo, M.m); mesh.bind(A.skel, IDENT); mesh.bindMode = 'detached'; mesh.customDepthMaterial = M.d; mesh.castShadow = true; mesh.name = 'fm';
      const px = this.px = { emissive: new T.Color(0, 0, 0), userData: { rimU: { value: new T.Color(rimCol != null ? rimCol : 0x8fb0ff) } }, rimK: rimK != null ? rimK : .42, dispose() {} };
      mesh.userData.fmRim = (c, k) => { px.userData.rimU.value.set(c); px.rimK = k; return px.userData.rimU; };
      this.mesh = mesh; this.inner.add(mesh); this.mat = px;
      this.cur = null; this.prev = null; this.fade = 0; this.fadeD = .15; this.dead = false; this.hitCd = 0; this.ai = 0; this.t = 0;
      this.play('idle', { off: Math.random() });
    }
    has(k) { return !!this.A.clips[k]; }
    play(k, o) {
      o = o || {}; const c = this.A.clips[k]; if (!c) return false;
      if (this.cur && this.cur.k === k && !o.once && !c.once) { if (o.ts) this.cur.ts = o.ts; return true; }
      if (this.cur && o.fade !== 0) { this.prev = this.cur; this.fadeD = o.fade != null ? o.fade : .14; this.fade = this.fadeD; } else { this.prev = null; this.fade = 0; }
      this.cur = { k, c, t: (o.off || 0) * c.d, ts: o.ts || 1, once: c.once, clamp: o.clamp !== false };
      return true;
    }
    // кадр клипа: [индекс кадра A, B, доля]
    fr(s) {
      const c = s.c;
      if (s.once) { const x = Math.min(1, Math.max(0, s.t / c.d)) * (c.n - 1), f = Math.floor(x); return [c.off + f, c.off + Math.min(c.n - 1, f + 1), x - f]; }
      const x = ((s.t / c.d) % 1 + 1) % 1 * c.n, f = Math.floor(x) % c.n; return [c.off + f, c.off + (f + 1) % c.n, x - Math.floor(x)];
    }
    get busy() { const s = this.cur; return !!(s && s.once && s.t < s.c.d - .02); }
    // far — далеко от камеры: ближайший кадр без смешения (кроме перехода между клипами) и без настоящей тени
    update(dt, far) {
      const s = this.cur; if (!s) return; this.t += dt; this.hitCd -= dt;
      s.t += dt * s.ts; if (this.prev) { this.prev.t += dt * this.prev.ts; this.fade -= dt; if (this.fade <= 0) this.prev = null; }
      const nb = this.A.nb, a = this.fr(s), e = this.mesh.bindMatrix.elements, px = this.px, rc = px.userData.rimU.value;
      if (this.prev) { const p = this.fr(this.prev); e[0] = Math.round(p[0] + p[2]) * nb; e[1] = Math.round(a[0] + a[2]) * nb; e[2] = 1 - this.fade / this.fadeD; }
      else if (far) { e[0] = (a[2] < .5 ? a[0] : a[1]) * nb; e[1] = e[0]; e[2] = 0; }
      else { e[0] = a[0] * nb; e[1] = a[1] * nb; e[2] = a[2]; }
      this.mesh.castShadow = !far;
      e[4] = px.emissive.r; e[5] = px.emissive.g; e[6] = px.emissive.b; e[7] = px.rimK; e[8] = rc.r; e[9] = rc.g; e[10] = rc.b;
    }
    // st: {move, spd (м/с), sc (внешний масштаб), atk:'atk'|'atk2'|…, atkT (длительность удара, с), hit, cast, dead}
    drive(st) {
      if (st.dead) { if (!this.dead) { this.dead = true; const c = this.A.clips.die; if (!this.play('die', { fade: .1, ts: c && st.dieT ? Math.min(2.5, Math.max(.6, c.d / st.dieT)) : 1 })) this.cur.ts = 0; } return; }
      if (this.dead) { this.dead = false; this.play('idle', { fade: 0 }); }
      let act = st.act;
      if (act && this.has(act)) { const c = this.A.clips[act]; this.play(act, { fade: .08, ts: st.actT ? Math.min(3, Math.max(.6, c.d / st.actT)) : (st.actTs || 1) }); return; }
      if (st.hit && this.hitCd <= 0 && !this.busy && this.has('hit')) { this.play('hit', { fade: .06, ts: 1.4 }); this.hitCd = 1.2; return; }
      if (this.busy) return;
      const mv = !!st.move && (st.spd == null || st.spd > .4);
      if (mv && (this.has('run') || this.has('walk'))) {
        const k = this.has('run') ? 'run' : 'walk', rv = this.sp.rv || this.A.rv || 0;
        const ts = rv > .05 ? Math.min(2.6, Math.max(.55, (st.spd || 4) / (rv * (st.sc || 1)))) : (st.runTs || 1);
        this.play(k, { ts, fade: .16 });
      } else this.play('idle', { fade: .2, ts: st.idleTs || 1 });
    }
    reset() { this.dead = false; this.prev = null; this.play('idle', { fade: 0, off: Math.random() }); }
    dispose() { if (this.g.parent) this.g.parent.remove(this.g); }
  }
  FM.Inst = Inst;

  // ---------- сборка по описанию ----------
  // o: {m: модель, h: рост (м), pal, glow, hide, morph, mkey, ry, rv, y}
  FM.make = function (o, rimCol, rimK) {
    const L = FM.lib[o.m]; if (!L) return null;
    const A = FM.bake(o.m, o.morph, o.mkey); if (!A) return null;
    const key = JSON.stringify([o.pal || 0, o.glow || 0, o.hide || 0]);
    const geo = palGeo(L, o.pal, o.glow, o.hide, key);
    const I = new Inst(A, L, o, geo, rimCol, rimK); I.update(0);
    const hh = L.box.max.y - L.box.min.y, k = (o.h || 2) / Math.max(.01, hh);
    I.inner.scale.setScalar(k); I.inner.position.y = -L.box.min.y * k + (o.y || 0); if (o.ry) I.inner.rotation.y = o.ry;
    I.k = k;
    return I;
  };
  // несколько копий одной модели в одной группе (гидра — три головы-змеи): тот же интерфейс, что у Inst
  class Multi {
    constructor(list) {
      this.parts = list; this.g = new T.Group(); this.k = list[0].I.k; this.A = list[0].I.A; this.mats = [];
      for (const p of list) { const I = p.I; I.g.position.set(p.x || 0, 0, p.z || 0); I.g.rotation.y = p.ry || 0; I.g.scale.setScalar(p.s || 1); this.g.add(I.g); this.mats.push(I.mat); p.lag = p.lag || 0; }
    }
    has(k) { return this.parts[0].I.has(k); }
    get busy() { return this.parts[0].I.busy; }
    get dead() { return this.parts[0].I.dead; }
    play(k, o) { for (const p of this.parts) p.I.play(k, o); }
    drive(st) { for (const p of this.parts) p.I.drive(Object.assign({}, st, p.lag && st.act ? { act: null } : null)); for (const p of this.parts) if (p.lag && st.act) setTimeout(() => p.I.drive(st), p.lag * 1000); }
    update(dt, far) { for (const p of this.parts) p.I.update(dt, far); }
    reset() { for (const p of this.parts) p.I.reset(); }
  }

  // ---------- кто есть кто: тип врага → модель, перекраска, детали ----------
  // tint: {роль: k} — роль красится в цвет врага (t.col) с яркостью ×k; pal: {роль: 0xRRGGBB} — свой цвет;
  // hide: роли, которых у этого типа нет; glow: свечение ролей; hk: рост к t.h; y: подъём; act: свои клипы действий
  const BONES = ['head', 'jaw', 'arm', 'leg'];
  const MOB = {
    slime: { m: 'blob', hide: ['crown'], tint: { main: 1 }, hk: 1.15 },
    queen: { m: 'blob', tint: { main: 1 }, glow: { crown: .3 }, hk: 1 },
    goblin: { m: 'orc', tint: { main: 1.05 } },
    archer: { m: 'monk', tint: { main: 1 }, act: { shoot: 'atk2' } },
    shaman: { m: 'tribal', tint: { secondary: 1 }, hk: 1.05 },
    bomber: { m: 'demonw', hide: ['weapon'], tint: { main: 1 }, glow: { spark: 1 }, hk: 1.05 },
    brute: { m: 'yeti', hide: ['rocks', 'core'], tint: { main: 1, secondary: .55 }, pal: { horns: 0xe8dcc0 }, glow: { eye_black: .0 } },
    wraith: { m: 'ghost', tint: { main: .75 }, glow: { eye_white: .5 }, hk: 1.05 },
    colossus: { m: 'yeti', hide: ['horns', 'tongue'], tint: { main: 1, secondary: .7, teeth: .7, tongue: .45 }, pal: { rocks: 0x55565e, core: 0xff7a33, eye_black: 0xff7a33, eye_white: 0x3a3b42 }, glow: { core: 1, eye_black: 1 } },
    shield: { m: 'skwar', hide: ['axe', 'crown'], tint: { cloak: 1 }, glow: { eyes: .8 } },
    wolf: { m: 'wolf', hide: ['mane', 'lmane'], tint: { main: 1, light: 1.35 }, hk: 1.3 },
    spider: { m: 'spider', hide: ['crown'], tint: { main: 1 }, pal: { eyes: 0xd02a2a }, glow: { eyes: .6 }, hk: .62 },
    mage: { m: 'wizard', tint: { main: 1 }, glow: { secondary: .35 } },
    necro: { m: 'skmag', tint: { hat: 1, body: .75 }, pal: { eyes: 0x7dff5a }, glow: { eyes: 1 } },
    sniper: { m: 'skrog', tint: { hood: 1, cape: .8 }, pal: { eyes: 0xff4040 }, glow: { eyes: 1 }, act: { shoot: 'shoot' } },
    shroom: { m: 'mush', tint: { secondary: 1 }, hk: 1.05 },
    elemental: { m: 'hywirl', tint: { main: 1 }, glow: { main: .3, eye_black: .2 } },
    imp: { m: 'demonf', tint: { main: 1 } },
    bat: { m: 'bat', tint: { main: 1 }, hk: 1.0 },
    golem: { m: 'yeti', hide: ['horns', 'tongue'], tint: { main: 1, secondary: .72, teeth: .72, tongue: .5, rocks: .75 }, pal: { core: 0xffd24a, eye_black: 0xffd24a, eye_white: 0x3a3b42 }, glow: { core: 1, eye_black: 1 } },
    skeleton: { m: 'skmin', tint: { head: .82, jaw: .82, arm: .82, leg: .82 }, glow: { eyes: .9 } },
    spitter: { m: 'dino', tint: { main: 1 }, hk: 1.25 },
    // боссы
    wolfking: { m: 'wolf', hide: ['lmane'], tint: { main: 1, light: 1.3 }, pal: { eyes_black: 0xff3030 }, glow: { eyes_black: 1 } },
    spiderq: { m: 'spider', tint: { main: 1 }, pal: { eyes: 0xb07bff, crown: 0xb07bff }, glow: { eyes: .9, crown: .5 }, hk: .85 },
    eagle: { m: 'dragon', tint: { main: 1, wings: .75 }, pal: { eyes: 0xfff2a8 }, glow: { eyes: 1 }, hk: .85 },
    hydra: { m: 'snake', tint: { darkgreen: 1, lightgreen: 1.3 }, pal: { yellow: 0xffd34d }, glow: { yellow: .7 }, multi: [{ x: 0, z: .55, ry: 0, s: 1.05 }, { x: -.75, z: -.1, ry: .7, s: .9, lag: .18 }, { x: .75, z: -.1, ry: -.7, s: .9, lag: .32 }], hk: .9 },
    shroomk: { m: 'mushk', tint: { secondary: 1 }, pal: { spikes: 0xfff4e0 } },
    reaper: { m: 'gskull', tint: { main: 1 }, pal: { secondary: 0xeae6d2 }, hk: 1.1 },
    bonelord: { m: 'skwar', hide: ['blade', 'shield', 'helmet'], tint: { cloak: .6, head: 1, jaw: 1, arm: 1, leg: 1 }, pal: { eyes: 0x9dff5a }, glow: { eyes: 1, crown: .3 }, hk: 1.25 },
    banshee: { m: 'ghost', tint: { main: 1 }, pal: { eye_white: 0x10101a, eye_black: 0xcfe0ff }, glow: { main: .25, eye_black: .9 } },
    demon: { m: 'demonw', hide: ['bomb', 'spark'], tint: { main: 1 }, pal: { eye_black: 0xffd34d }, glow: { eye_black: 1 } },
  };
  // свои облики отдельных врагов дальних регионов (остальные — облик базового с цветом региона)
  const VAR = {
    yeti: { m: 'yeti', hide: ['rocks', 'core', 'horns'], tint: {} },              // йети — настоящий белый йети
    executioner: { m: 'yeti', hide: ['rocks', 'core'], tint: { main: 1, secondary: .7 }, pal: { horns: 0x2a2020, eye_black: 0xff3030 }, glow: { eye_black: 1 } },
    deadknight: { m: 'skwar', hide: ['axe', 'crown', 'shield'], tint: { cloak: .55, head: 1, jaw: 1, arm: 1, leg: 1 }, pal: { eyes: 0x9affc8 }, glow: { eyes: 1 } },
    skyknight: { m: 'skwar', hide: ['axe', 'crown'], tint: { cloak: 1, helmet: 1.1 }, pal: { eyes: 0xfff2a8 }, glow: { eyes: 1 } },
    gargoyle: { m: 'bat', tint: { main: 1, belly: .8 }, pal: { eyes: 0xff5030 }, glow: { eyes: 1 }, hk: 1.1 },
    lichking: { m: 'skwar', hide: ['blade', 'shield', 'helmet'], tint: { cloak: .45, head: 1, jaw: 1, arm: 1, leg: 1 }, pal: { eyes: 0x9affc8, crown: 0x9affc8 }, glow: { eyes: 1, crown: .6 }, hk: 1.25 },
    prismgiant: { m: 'yeti', hide: ['horns', 'tongue'], tint: { main: 1, secondary: .7, teeth: .7, tongue: .5, rocks: 1.2 }, pal: { core: 0xffffff, eye_black: 0xffffff }, glow: { core: 1, eye_black: 1, rocks: .35 } },
  };
  const scl = (c, k) => { const r = Math.min(255, Math.round((c >> 16 & 255) * k)), g = Math.min(255, Math.round((c >> 8 & 255) * k)), b = Math.min(255, Math.round((c & 255) * k)); return (r << 16) | (g << 8) | b; };
  function opts(S, col, h) {
    const pal = Object.assign({}, S.pal || {}); if (S.tint) for (const r in S.tint) pal[r] = scl(col, S.tint[r]);
    return { m: S.m, h: h * (S.hk || 1), pal, glow: S.glow, hide: S.hide, morph: S.morph, mkey: S.mkey, y: S.y, rv: S.rv };
  }
  FM.mobSpec = (tid, t) => VAR[tid] || MOB[tid] || MOB[t.as || tid] || null;
  FM.hasMob = (tid, t) => { const S = FM.mobSpec(tid, t); return !!(S && FM.lib[S.m]); };
  // враг: {g, fm, mats}; fm — экземпляр (или Multi)
  FM.mob = function (tid, t, rimCol, rimK) {
    const S = FM.mobSpec(tid, t); if (!S || !FM.lib[S.m]) return null;
    const o = opts(S, t.col, t.h || 2);
    if (S.multi) { const list = S.multi.map(p => Object.assign({ I: FM.make(o, rimCol, rimK) }, p)); const M = new Multi(list); M.S = S; return { g: M.g, fm: M, mats: M.mats }; }
    const I = FM.make(o, rimCol, rimK); if (!I) return null; I.S = S;
    return { g: I.g, fm: I, mats: [I.mat] };
  };
  // действие врага → клип модели: удар, тяжёлый удар, выстрел, чары
  const CH = { melee: ['atk', 'atk2'], heavy: ['atk3', 'atk2', 'atk'], shoot: ['shoot', 'atk2', 'atk'], cast: ['cast', 'atk2', 'atk'], jump: ['jump'] };
  FM.act = function (I, kind) {
    const S = I.S || {}; if (S.act && S.act[kind] && I.has(S.act[kind])) return S.act[kind];
    const l = CH[kind] || CH.melee;
    if (kind === 'melee') { const a = l.filter(k => I.has(k)); if (!a.length) return null; I.ai = (I.ai || 0) + 1; return a[I.ai % a.length]; }
    for (const k of l) if (I.has(k)) return k; return null;
  };

  // ---------- призывы ----------
  // c: цвета стихии {e: свечение, f: [шерсть, тёмная, свечение], g: [камень, тёмный, свечение]}
  const LION = { Head: [1.15, 1.15, .85], Body: [1.1, 1, 1] };
  FM.sumSpec = function (kind, el, cx, c) {
    const e = c.e, F = c.f, Gp = c.g;
    switch (kind) {
      case 'golem': return cx === 'necro'
        ? { m: 'yeti', h: 2.9, hide: ['horns', 'tongue'], pal: { main: 0xd8ccae, secondary: 0x9a8e72, teeth: 0x9a8e72, tongue: 0x5a4e3a, rocks: 0xe8e0c8, core: 0xb07bff, eye_black: 0xb07bff, eye_white: 0x2a2030 }, glow: { core: 1, eye_black: 1 } }
        : { m: 'yeti', h: 2.9, hide: ['horns', 'tongue'], pal: { main: Gp[0], secondary: Gp[1], teeth: Gp[1], tongue: Gp[1], rocks: Gp[1], core: Gp[2], eye_black: Gp[2], eye_white: 0x2a2a30 }, glow: { core: 1, eye_black: 1 } };
      case 'bear': return { m: 'bear', h: 2.3, pal: { main: el === 'earth' ? 0x6a4a30 : F[0], light: el === 'earth' ? 0x9a7a58 : F[1], eyes_black: e }, glow: { eyes_black: .9 } };
      case 'wolves': return { m: 'wolf', h: 1.45, hide: ['mane', 'lmane'], pal: { main: F[0], light: F[1], eyes_black: e }, glow: { eyes_black: .9 } };
      case 'lion': return { m: 'wolf', h: 2.0, hide: ['mane'], pal: { main: 0xd0a058, light: 0xe8cc90, lmane: el === 'fire' ? 0xc4501a : F[0], eyes_black: e }, glow: { eyes_black: .9, lmane: el === 'fire' || el === 'storm' ? .4 : 0 }, morph: LION, mkey: 'lion' };
      case 'skelwar': return { m: 'skwar', h: 2.1, hide: ['axe', 'crown', 'helmet'], pal: { eyes: e, cloak: e }, glow: { eyes: 1 }, spawn: 1 };
      case 'skelmage': return { m: 'skmag', h: 2.2, pal: { eyes: e, hat: 0x2a1a3a }, glow: { eyes: 1 }, spawn: 1 };
      case 'bonedrake': return { m: 'dragon', h: 2.4, pal: { main: 0xe3dac0, belly: 0x9a8e72, wings: 0x3a3040, claws: 0x9a8e72, eyes: e }, glow: { eyes: 1 } };
      case 'imps': return { m: 'demonf', h: 1.4, pal: { main: el === 'fire' || el === 'blood' ? 0x9a2a2a : F[0], black: F[1], eye_black: e }, glow: { eye_black: .9 } };
      case 'infernal': return { m: 'yeti', h: 3.9, hide: ['tongue'], pal: { main: 0x2a2020, secondary: 0x1a1414, teeth: 0x3a2a28, tongue: 0x3a2a28, horns: 0x3a2a28, rocks: 0x3a2a28, core: e, eye_black: e, eye_white: 0x140c0c }, glow: { core: 1, eye_black: 1, rocks: .15 } };
      case 'elemental': return { m: 'hywirl', h: 2.2, pal: { main: e }, glow: { main: .45, eye_black: .3 } };
      case 'stormbird': return { m: 'dragon', h: 1.5, pal: { main: F[0], belly: F[1], wings: F[1], eyes: e }, glow: { eyes: 1 } };
      // существа фирменных чар (часть A): мертвецы некроманта, волки-духи шамана, бесы врат и инфернал чернокнижника, великий элементаль
      case 'raised': return { m: 'skwar', h: 2.1, hide: ['axe', 'crown', 'helmet', 'shield'], pal: { eyes: e, cloak: 0x2a2632 }, glow: { eyes: 1 }, spawn: 1 };
      case 'spiritwolf': return { m: 'wolf', h: 1.5, hide: ['mane', 'lmane'], pal: { main: 0x8fb4d8, light: 0xd8ecff, eyes_black: e }, glow: { eyes_black: 1, main: .35, light: .35 } };
      case 'gateimp': return { m: 'demonf', h: 1.4, pal: { main: 0x9a2a2a, black: 0x2a0a0a, eye_black: e }, glow: { eye_black: .9 } };
      case 'pactinf': return { m: 'yeti', h: 3.9, hide: ['tongue'], pal: { main: 0x2a2020, secondary: 0x1a1414, teeth: 0x3a2a28, tongue: 0x3a2a28, horns: 0x3a2a28, rocks: 0x3a2a28, core: e, eye_black: e, eye_white: 0x140c0c }, glow: { core: 1, eye_black: 1, rocks: .25 } };
      case 'bigelem': return { m: 'hywirl', h: 2.2, pal: { main: e }, glow: { main: .55, eye_black: .4 } };
    }
    return null;
  };
  FM.sum = function (kind, el, cx, c) { const o = FM.sumSpec(kind, el, cx, c); if (!o || !FM.lib[o.m]) return null; const I = FM.make(o, null, .3); if (I) I.S = o; return I; };
  window.FM = FM;
})();
