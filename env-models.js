// Декор мира «Тысячи чар» из открытых моделей KayKit (Kay Lousberg, CC0): Halloween Bits, Medieval Hexagon Pack, Dungeon Remastered.
// Модели собраны скриптом build_env.js: цвет текстур запечён в цвет вершин, размеры приведены к прежнему процедурному декору,
// поэтому места, столкновения и цвета регионов (цвет экземпляра) остаются прежними — меняется только геометрия.
// Три файла по регионам: env_a (центр мира и ущелья), env_b (лёд, вулкан, небесные руины, Бездна), env_c (Мёртвый город).
// Как подменяется:
//  • неподвижный декор (центр мира, ущелья) — InstancedMesh делится на варианты моделей и клетки местности,
//    у каждой части своя ограничивающая сфера, поэтому то, что вне кадра и вне теней, не рисуется;
//  • подгружаемые части мира (PK) — у вида появляется несколько мешей-вариантов, раскладка экземпляров по ним после каждой пересборки.
// Низкое качество графики — облегчённые варианты (меньше треугольников). Зависит только от THREE (r128) и THREE.GLTFLoader.
(function () {
  'use strict';
  const T = THREE;
  const EM = { V: '1', lib: {}, ps: {}, lite: false, roots: new Set(), pkl: [], busy: 0 };
  // свои InstancedMesh отсекаются по своей сфере (как в новых версиях three.js), остальные объекты — как раньше
  const _io = T.Frustum.prototype.intersectsObject, _s = new T.Sphere();
  // плюс: то, что целиком дальше конца тумана (EM.eye — позиция камеры, EM.fog — туман сцены), не рисуется и не отбрасывает тень
  T.Frustum.prototype.intersectsObject = function (o) {
    if (o.emBS) { _s.copy(o.emBS).applyMatrix4(o.matrixWorld); if (EM.eye && EM.fog && _s.distanceToPoint(EM.eye) > EM.fog.far) return false; return this.intersectsSphere(_s); }
    return _io.call(this, o);
  };
  const vh = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

  // ---------- загрузка набора ----------
  EM.load = function (set, base) {
    if (EM.ps[set]) return EM.ps[set];
    EM.busy++;
    EM.ps[set] = new Promise((ok, no) => new T.GLTFLoader().load((base || '') + 'assets/models/env_' + set + '.glb?ev=' + EM.V, ok, undefined, no)).then(g => {
      const add = [];
      g.scene.traverse(o => { if (!o.isMesh || !o.userData || !o.userData.k) return; add.push(o); });
      for (const o of add) {
        const u = o.userData, L = EM.lib[u.k] || (EM.lib[u.k] = { all: [], vars: [], lite: null, r: 0, lum: 1 });
        const geo = o.geometry; geo.computeBoundingSphere();
        L.all[u.v] = { geo, lite: !!u.lite };
        L.r = Math.max(L.r, geo.boundingSphere.center.length() + geo.boundingSphere.radius);
        if (u.glow) L.glow = u.glow;
      }
      for (const k in EM.lib) {
        const L = EM.lib[k]; if (L.vars.length) continue;
        L.vars = L.all.filter(a => a && !a.lite).map(a => a.geo); const li = L.all.find(a => a && a.lite);
        L.lite = li ? li.geo : L.vars[L.vars.length - 1]; if (!L.vars.length) L.vars = [L.lite];
        // средняя яркость цвета вершин: материалам без цвета вершин (камни) цвет делится на неё, чтобы общий тон региона не потемнел
        const c = L.vars[0].attributes.color; let s = 0; if (c) { for (let i = 0; i < c.count; i++) s += .299 * c.getX(i) + .587 * c.getY(i) + .114 * c.getZ(i); L.lum = Math.max(.2, s / c.count); }
      }
      EM.busy--; return EM;
    }).catch(e => { EM.busy--; delete EM.ps[set]; throw e; });
    return EM.ps[set];
  };
  EM.has = k => !!EM.lib[k];
  const geoOf = (L, v) => EM.lite ? L.lite : L.vars[Math.min(v, L.vars.length - 1)];

  // материал без цвета вершин (камни, шпили) — копия с цветом вершин, цвет поделён на среднюю яркость модели
  const MC = new WeakMap();
  function fixMat(mat, L, k) {
    if (mat.vertexColors) return mat;
    let m = MC.get(mat); if (!m) MC.set(mat, m = {});
    // .72 — верх модели светлее среднего и смотрит прямо на свет; без поправки камни выходят почти белыми
    if (!m[k]) { const c = mat.clone(); c.vertexColors = true; c.color.multiplyScalar(.72 / L.lum); c.userData.emFix = 1; m[k] = c; }
    return m[k];
  }

  // ---------- неподвижный декор: InstancedMesh -> варианты × клетки ----------
  function upright(A, o) {
    // камни раньше крутились как попало (додекаэдр симметричен); у модели должна остаться только поворот вокруг вертикали
    const sy = Math.hypot(A[o + 4], A[o + 5], A[o + 6]); if (!sy || A[o + 5] / sy > .92) return;
    const sx = Math.hypot(A[o], A[o + 1], A[o + 2]), sz = Math.hypot(A[o + 8], A[o + 9], A[o + 10]);
    const yaw = Math.atan2(-A[o + 2], A[o]) || vh(A[o + 12], A[o + 14]) * 6.283, c = Math.cos(yaw), s = Math.sin(yaw);
    A[o] = c * sx; A[o + 1] = 0; A[o + 2] = -s * sx; A[o + 4] = 0; A[o + 5] = sy; A[o + 6] = 0; A[o + 8] = s * sz; A[o + 9] = 0; A[o + 10] = c * sz;
  }
  // ---------- варианты одной отрисовкой ----------
  // геометрии вариантов слиты в одну, у вершины — номер варианта (aVar), у экземпляра — свой (iVar); вершины чужих вариантов
  // сжимаются в точку (треугольники нулевой площади не рисуются): один вызов отрисовки на клетку, а не на каждый вариант
  function mergedOf(L, nv) {
    const key = 'm' + nv; if (L[key]) return L[key];
    const gs = L.vars.slice(0, nv); let nvt = 0, nix = 0; gs.forEach(g => { nvt += g.attributes.position.count; nix += g.index ? g.index.count : g.attributes.position.count; });
    const P = new Float32Array(nvt * 3), N = new Float32Array(nvt * 3), C = new Float32Array(nvt * 3), V = new Float32Array(nvt), I = nvt > 65535 ? new Uint32Array(nix) : new Uint16Array(nix);
    let o = 0, io = 0;
    gs.forEach((g, v) => {
      const n = g.attributes.position.count, pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color;
      for (let i = 0; i < n; i++) {
        const q = (o + i) * 3;
        P[q] = pa.getX(i); P[q + 1] = pa.getY(i); P[q + 2] = pa.getZ(i);
        N[q] = na.getX(i); N[q + 1] = na.getY(i); N[q + 2] = na.getZ(i);
        if (ca) { C[q] = ca.getX(i); C[q + 1] = ca.getY(i); C[q + 2] = ca.getZ(i); } else { C[q] = C[q + 1] = C[q + 2] = 1; }
      }
      V.fill(v, o, o + n);
      if (g.index) for (let j = 0; j < g.index.count; j++) I[io + j] = g.index.getX(j) + o; else for (let j = 0; j < n; j++) I[io + j] = o + j;
      o += n; io += g.index ? g.index.count : n;
    });
    const m = new T.BufferGeometry(); m.setAttribute('position', new T.BufferAttribute(P, 3)); m.setAttribute('normal', new T.BufferAttribute(N, 3));
    m.setAttribute('color', new T.BufferAttribute(C, 3)); m.setAttribute('aVar', new T.BufferAttribute(V, 1)); m.setIndex(new T.BufferAttribute(I, 1));
    return L[key] = m;
  }
  const inject = sh => { sh.vertexShader = 'attribute float aVar;\nattribute float iVar;\n' + sh.vertexShader.replace('#include <project_vertex>', 'if(abs(aVar-iVar)>.5)transformed=vec3(0.);\n#include <project_vertex>'); };
  const SEL = new WeakMap(); let DEPTH = null;
  function selMat(base) {
    let m = SEL.get(base); if (m) return m;
    m = base.clone(); const ob = base.onBeforeCompile, key = base.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => { if (ob) ob.call(base, sh, r); inject(sh); };
    m.customProgramCacheKey = () => (key ? key.call(base) : '') + '|emv';
    SEL.set(base, m); return m;
  }
  function selDepth() { if (!DEPTH) { DEPTH = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }); DEPTH.onBeforeCompile = inject; DEPTH.customProgramCacheKey = () => 'emvd'; } return DEPTH; }
  // вид меша клетки: полный (слитые варианты, свой материал) или облегчённый (одна модель, обычный материал)
  function look(m) {
    const L = EM.lib[m.emK];
    if (EM.lite || !m.emWrap) { m.geometry = EM.lite ? L.lite : m.emG; m.material = m.emBase; m.customDepthMaterial = undefined; }
    else { m.geometry = m.emWrap; m.material = m.emSel; m.customDepthMaterial = m.castShadow ? selDepth() : undefined; }
  }

  // ---------- неподвижный декор: InstancedMesh -> клетки местности ----------
  function splitStatic(root, im, k, cell, maxV) {
    const L = EM.lib[k], nv = Math.min(L.vars.length, maxV || 9), n = im.count, M = im.instanceMatrix.array, C = im.instanceColor ? im.instanceColor.array : null, mat = fixMat(im.material, L, k);
    const groups = new Map();
    for (let i = 0; i < n; i++) {
      const x = M[i * 16 + 12], z = M[i * 16 + 14];
      const key = cell ? Math.floor(x / cell + .5) + ',' + Math.floor(z / cell + .5) : '';/* клетка с центром в 0 — середина мира одним куском */
      let g = groups.get(key); if (!g) groups.set(key, g = []); g.push(i);
    }
    for (const ids of groups.values()) {
      const m = new T.InstancedMesh(L.vars[0], mat, ids.length), A = m.instanceMatrix.array, iv = new Float32Array(ids.length);
      m.emK = k; m.emV = 0; m.frustumCulled = true; /* в r128 у InstancedMesh по умолчанию выключено */ m.castShadow = im.castShadow; m.receiveShadow = im.receiveShadow; m.renderOrder = im.renderOrder;
      if (C) m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(ids.length * 3), 3);
      const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; let smax = 0;
      ids.forEach((i, j) => {
        for (let q = 0; q < 16; q++) A[j * 16 + q] = M[i * 16 + q];
        if (k === 'rock') upright(A, j * 16);
        iv[j] = nv > 1 ? Math.min(nv - 1, vh(A[j * 16 + 12], A[j * 16 + 14]) * nv | 0) : 0;
        if (C) { m.instanceColor.array[j * 3] = C[i * 3]; m.instanceColor.array[j * 3 + 1] = C[i * 3 + 1]; m.instanceColor.array[j * 3 + 2] = C[i * 3 + 2]; }
        for (let q = 0; q < 3; q++) { const v = A[j * 16 + 12 + q]; mn[q] = Math.min(mn[q], v); mx[q] = Math.max(mx[q], v); }
        smax = Math.max(smax, Math.hypot(A[j * 16], A[j * 16 + 1], A[j * 16 + 2]), Math.hypot(A[j * 16 + 4], A[j * 16 + 5], A[j * 16 + 6]), Math.hypot(A[j * 16 + 8], A[j * 16 + 9], A[j * 16 + 10]));
      });
      m.emBase = mat; m.emG = L.vars[0];
      if (nv > 1) {
        // своя лёгкая геометрия-обёртка: общие буферы вершин + свой номер варианта у экземпляров
        const src = mergedOf(L, nv), w = new T.BufferGeometry();
        for (const a of ['position', 'normal', 'color', 'aVar']) w.setAttribute(a, src.attributes[a]);
        w.setIndex(src.index); w.setAttribute('iVar', new T.InstancedBufferAttribute(iv, 1));
        m.emWrap = w; m.emSel = selMat(mat);
      }
      const c = new T.Vector3((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2);
      m.emBS = new T.Sphere(c, Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2 + L.r * smax);
      m.instanceMatrix.needsUpdate = true; look(m);
      root.add(m); root.emMade.push(m);
    }
    root.remove(im); im.dispose();
  }
  // root: группа (worldGroup, worldExtra, gorgeGroup); kmap: геометрия -> вид; cell: размер клетки (м);
  // maxV: сколько вариантов модели слить (больше — разнообразнее, но вершины всех вариантов считаются у каждого экземпляра)
  EM.swap = function (root, kmap, cell, maxV) {
    if (!root.emMade) root.emMade = [];
    // меши прошлой постройки (ущелье перестроено) — освободить
    // (обёртку освобождаем: общие буферы вершин в следующем кадре загрузятся заново — это мелочь)
    root.emMade = root.emMade.filter(m => { if (m.parent === root) return true; if (m.emWrap) m.emWrap.dispose(); m.dispose(); return false; });
    EM.roots.add(root);
    const list = [];
    for (const o of root.children) if (o.isInstancedMesh && o.emK == null && !o.emSkip) { const k = kmap.get(o.geometry); if (k && EM.lib[k]) list.push([o, k]); }
    for (const [im, k] of list) splitStatic(root, im, k, cell, maxV || 2);
    return list.length;
  };

  // ---------- подгружаемые части мира ----------
  let SCR = new Float32Array(16 * 64), SCC = new Float32Array(3 * 64);
  EM.pk = function (e, k, parent) {
    const L = EM.lib[k]; if (!L || e.emK) return false; e.emK = k;
    const mat = fixMat(e.im.material, L, k); e.im.material = mat; e.im.geometry = geoOf(L, 0); e.im.emK = k; e.im.emV = 0; e.vars = [e.im];
    for (let v = 1; v < L.vars.length; v++) {
      const m = new T.InstancedMesh(geoOf(L, v), mat, e.cap); m.count = 0; m.frustumCulled = false; m.visible = false; m.castShadow = e.im.castShadow;
      m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(e.cap * 3), 3); m.instanceColor.setUsage(T.DynamicDrawUsage); m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      m.emK = k; m.emV = v; parent.add(m); e.vars.push(m);
    }
    e.split = EM.split; EM.pkl.push(e); return true;
  };
  // после пересборки: экземпляры из основного меша раскладываются по вариантам (по месту — один и тот же вариант всегда)
  EM.split = function (e) {
    const im = e.im, n = im.count, nv = e.vars.length; if (nv < 2) return;
    if (SCR.length < n * 16) { SCR = new Float32Array(n * 16 * 1.5 | 0); SCC = new Float32Array(n * 3 * 1.5 | 0); }
    SCR.set(im.instanceMatrix.array.subarray(0, n * 16)); SCC.set(im.instanceColor.array.subarray(0, n * 3));
    const cnt = new Array(nv).fill(0);
    for (let i = 0; i < n; i++) {
      const v = Math.min(nv - 1, vh(SCR[i * 16 + 12], SCR[i * 16 + 14]) * nv | 0), m = e.vars[v], j = cnt[v]++;
      m.instanceMatrix.array.set(SCR.subarray(i * 16, i * 16 + 16), j * 16); m.instanceColor.array.set(SCC.subarray(i * 3, i * 3 + 3), j * 3);
    }
    e.vars.forEach((m, v) => { m.count = cnt[v]; m.visible = cnt[v] > 0; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
  };
  // огонёк фонаря «Мёртвого города» — туда, где у модели стекло
  EM.lampGlow = function () { const g = EM.lib.lamp && EM.lib.lamp.glow || [.6, 2.42, 0]; return new T.OctahedronGeometry(.13, 0).scale(1, 1.45, 1).translate(g[0], g[1], g[2]); };

  // низкое качество — облегчённые варианты
  EM.setLite = function (on) {
    on = !!on; if (on === EM.lite) return; EM.lite = on;
    for (const r of EM.roots) for (const m of r.emMade || []) if (m.parent === r) look(m);
    for (const e of EM.pkl) for (const m of e.vars) m.geometry = geoOf(EM.lib[m.emK], m.emV);
  };
  window.EM = EM;
})();
