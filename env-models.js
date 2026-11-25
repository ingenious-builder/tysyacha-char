// Декор мира «Тысячи чар» из открытых моделей KayKit (Kay Lousberg, CC0): Halloween Bits, Medieval Hexagon Pack, Dungeon Remastered.
// Модели собраны скриптом build_env.js: цвет текстур запечён в цвет вершин, размеры приведены к прежнему процедурному декору,
// поэтому места, столкновения и цвета регионов (цвет экземпляра) остаются прежними — меняется только геометрия.
// Три файла по регионам: env_a (центр мира и ущелья), env_b (лёд, вулкан, небесные руины, Бездна), env_c (Мёртвый город).
// Как подменяется:
//  • неподвижный декор (центр мира, ущелья) — один InstancedMesh на вид, варианты моделей слиты (выбор в шейдере),
//    в меше только экземпляры рядом с героем (EM.near каждый кадр, перекладка раз в 10 м) — вызовов не больше, чем было;
//  • подгружаемые части мира (PK) — тот же один меш на вид, варианты слиты, номер варианта у экземпляра — после каждой пересборки.
// Низкое качество графики — облегчённые варианты (меньше треугольников). Зависит только от THREE (r128) и THREE.GLTFLoader.
(function () {
  'use strict';
  const T = THREE;
  const EM = { V: '1', lib: {}, ps: {}, lite: false, roots: new Set(), pkl: [], busy: 0 };
  const vh = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

  // ---------- загрузка набора ----------
  EM.load = function (set, base) {
    if (EM.ps[set]) return EM.ps[set];
    EM.busy++;
    EM.ps[set] = new Promise((ok, no) => new T.GLTFLoader().load((base || '') + 'assets/models/env_' + set + '.glb?ev=' + EM.V, ok, undefined, no)).then(g => {
      const add = [];
      g.scene.traverse(o => { if (!o.isMesh || !o.userData || !o.userData.k) return; add.push(o); });
      for (const o of add) {
        const u = o.userData, L = EM.lib[u.k] || (EM.lib[u.k] = { all: [], vars: [], lite: null, lum: 1 });
        L.all[u.v] = { geo: o.geometry, lite: !!u.lite };
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

  // материал без цвета вершин (камни, шпили) — копия с цветом вершин, цвет поделён на среднюю яркость модели
  const MC = new WeakMap();
  function fixMat(mat, L, k) {
    if (mat.vertexColors) return mat;
    let m = MC.get(mat); if (!m) MC.set(mat, m = {});
    // .72 — верх модели светлее среднего и смотрит прямо на свет; без поправки камни выходят почти белыми
    if (!m[k]) { const c = mat.clone(); c.vertexColors = true; c.color.multiplyScalar(.72 / L.lum); c.userData.emFix = 1; m[k] = c; }
    return m[k];
  }

  // ---------- общее ----------
  function upright(A, o) {
    // камни раньше крутились как попало (додекаэдр симметричен); у модели остаётся только поворот вокруг вертикали
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
  // вид меша: полный (слитые варианты, свой материал) или облегчённый (одна модель, обычный материал)
  function look(m) {
    const L = EM.lib[m.emK];
    if (EM.lite || !m.emWrap) { m.geometry = EM.lite ? L.lite : m.emG; m.material = m.emBase; m.customDepthMaterial = undefined; }
    else { m.geometry = m.emWrap; m.material = m.emSel; m.customDepthMaterial = m.castShadow ? selDepth() : undefined; }
  }

  // ---------- неподвижный декор: один меш на вид, в нём только экземпляры рядом с героем ----------
  // Камера видит землю не дальше ~50 м от героя (при самой дальней камере), тени — в квадрате ±36 м, дальше туман.
  // Поэтому в меше держим экземпляры в радиусе NEAR от героя и перекладываем их, когда герой отошёл на STEP:
  // вызовов отрисовки столько же, сколько было (вид + его тень), а треугольников меньше — дальние не рисуются.
  const NEAR = 78, STEP = 10, _v = new T.Vector3();
  function splitStatic(root, im, k, maxV) {
    const L = EM.lib[k], nv = Math.min(L.vars.length, maxV || 9), n = im.count, M = new Float32Array(im.instanceMatrix.array.subarray(0, n * 16)), mat = fixMat(im.material, L, k);
    const C = im.instanceColor ? new Float32Array(im.instanceColor.array.subarray(0, n * 3)) : null, V = new Float32Array(n);
    for (let i = 0; i < n; i++) { if (k === 'rock') upright(M, i * 16); V[i] = nv > 1 ? Math.min(nv - 1, vh(M[i * 16 + 12], M[i * 16 + 14]) * nv | 0) : 0; }
    const m = new T.InstancedMesh(L.vars[0], mat, n);
    m.emK = k; m.emV = 0; m.castShadow = im.castShadow; m.receiveShadow = im.receiveShadow; m.renderOrder = im.renderOrder; m.frustumCulled = false;
    m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.count = 0; m.visible = false;
    if (C) { m.instanceColor = new T.InstancedBufferAttribute(new Float32Array(n * 3), 3); m.instanceColor.setUsage(T.DynamicDrawUsage); }
    m.emSrc = { M, C, V, n }; m.emBase = mat; m.emG = L.vars[0];
    if (nv > 1) {
      // своя лёгкая геометрия-обёртка: общие буферы вершин слитых вариантов + свой номер варианта у экземпляров
      const src = mergedOf(L, nv), w = new T.BufferGeometry();
      for (const a of ['position', 'normal', 'color', 'aVar']) w.setAttribute(a, src.attributes[a]);
      w.setIndex(src.index); const iv = new T.InstancedBufferAttribute(new Float32Array(n), 1); iv.setUsage(T.DynamicDrawUsage); w.setAttribute('iVar', iv);
      m.emWrap = w; m.emSel = selMat(mat);
    }
    look(m); root.add(m); root.emMade.push(m);
    root.remove(im); im.dispose();
  }
  function fill(m, x, z) {
    const s = m.emSrc, A = m.instanceMatrix.array, CA = m.instanceColor && m.instanceColor.array, IV = m.emWrap && m.emWrap.attributes.iVar.array, R2 = NEAR * NEAR;
    let j = 0;
    for (let i = 0; i < s.n; i++) {
      const dx = s.M[i * 16 + 12] - x, dz = s.M[i * 16 + 14] - z; if (dx * dx + dz * dz > R2) continue;
      A.set(s.M.subarray(i * 16, i * 16 + 16), j * 16); if (CA) { CA[j * 3] = s.C[i * 3]; CA[j * 3 + 1] = s.C[i * 3 + 1]; CA[j * 3 + 2] = s.C[i * 3 + 2]; } if (IV) IV[j] = s.V[i]; j++;
    }
    m.count = j; m.visible = j > 0; m.instanceMatrix.needsUpdate = true; if (CA) m.instanceColor.needsUpdate = true; if (IV) m.emWrap.attributes.iVar.needsUpdate = true;
  }
  // каждый кадр: герой (мировые координаты) отошёл на STEP от прошлой раскладки этой группы — переложить
  EM.near = function (root, pos, force) {
    if (!root.emMade || !root.emMade.length) return;
    _v.copy(pos); root.worldToLocal(_v);
    const p = root.emAt; if (!force && p && (_v.x - p.x) ** 2 + (_v.z - p.z) ** 2 < STEP * STEP) return;
    root.emAt = { x: _v.x, z: _v.z };
    for (const m of root.emMade) if (m.parent === root) fill(m, _v.x, _v.z);
  };
  // обёртка ссылается на общие буферы вершин вида (их используют и другие меши, в т. ч. через VAO) — перед освобождением
  // убрать их из обёртки, иначе three.js удалит общие буферы и чужие меши останутся со ссылкой на удалённый буфер
  function dropWrap(w) { for (const a of ['position', 'normal', 'color', 'aVar']) w.deleteAttribute(a); w.setIndex(null); w.dispose(); }
  // root: группа (worldGroup, gorgeGroup); kmap: геометрия -> вид;
  // maxV: сколько вариантов модели слить (больше — разнообразнее, но вершины всех вариантов считаются у каждого экземпляра)
  EM.swap = function (root, kmap, maxV) {
    if (!root.emMade) root.emMade = [];
    // меши прошлой постройки (ущелье перестроено) — освободить: свои буферы (экземпляры, номер варианта), но не общие буферы вершин
    root.emMade = root.emMade.filter(m => { if (m.parent === root) return true; if (m.emWrap) dropWrap(m.emWrap); if (m.emBase.userData.emFix) { m.emBase.dispose(); if (m.emSel) m.emSel.dispose(); } m.dispose(); return false; });
    EM.roots.add(root);
    const list = [];
    for (const o of root.children) if (o.isInstancedMesh && o.emK == null && !o.emSkip) { const k = kmap.get(o.geometry); if (k && EM.lib[k]) list.push([o, k]); }
    for (const [im, k] of list) splitStatic(root, im, k, maxV || 2);
    root.emAt = null; root.updateMatrixWorld(true);
    return list.length;
  };

  // ---------- подгружаемые части мира ----------
  // у вида тот же один меш, что был: геометрия — слитые варианты, номер варианта у экземпляра ставится после каждой пересборки
  EM.pk = function (e, k, maxV) {
    const L = EM.lib[k]; if (!L || e.emK) return false; e.emK = k;
    const m = e.im, mat = fixMat(m.material, L, k), nv = Math.min(L.vars.length, maxV || 2);
    m.emK = k; m.emV = 0; m.emBase = mat; m.emG = L.vars[0];
    if (nv > 1) {
      const src = mergedOf(L, nv), w = new T.BufferGeometry();
      for (const a of ['position', 'normal', 'color', 'aVar']) w.setAttribute(a, src.attributes[a]);
      w.setIndex(src.index); const iv = new T.InstancedBufferAttribute(new Float32Array(e.cap), 1); iv.setUsage(T.DynamicDrawUsage); w.setAttribute('iVar', iv);
      m.emWrap = w; m.emSel = selMat(mat); m.emNV = nv;
    }
    look(m); e.split = EM.split; EM.pkl.push(e); return true;
  };
  // после пересборки: номер варианта по месту экземпляра (одно и то же место — всегда та же модель)
  EM.split = function (e) {
    const m = e.im; if (!m.emWrap) return;
    const A = m.instanceMatrix.array, iv = m.emWrap.attributes.iVar, nv = m.emNV;
    for (let i = 0; i < m.count; i++) iv.array[i] = Math.min(nv - 1, vh(A[i * 16 + 12], A[i * 16 + 14]) * nv | 0);
    iv.needsUpdate = true;
  };
  // огонёк фонаря «Мёртвого города» — туда, где у модели стекло
  EM.lampGlow = function () { const g = EM.lib.lamp && EM.lib.lamp.glow || [.6, 2.42, 0]; return new T.OctahedronGeometry(.13, 0).scale(1, 1.45, 1).translate(g[0], g[1], g[2]); };

  // низкое качество — облегчённые варианты
  EM.setLite = function (on) {
    on = !!on; if (on === EM.lite) return; EM.lite = on;
    for (const r of EM.roots) for (const m of r.emMade || []) if (m.parent === r) look(m);
    for (const e of EM.pkl) look(e.im);
  };
  window.EM = EM;
})();
