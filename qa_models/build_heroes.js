// Сборка библиотеки моделей героев «Тысячи чар» из KayKit Adventurers 1.0 (CC0).
// Один скелет на всех (у пяти исходников он одинаковый), части тел и предметы отдельными мешами,
// без текстур (их берём отдельными PNG и перекрашиваем в игре), нормали int8, UV uint16, веса uint8,
// повороты в анимациях int16 — KHR_mesh_quantization. Выкинуты кости IK/управления и постоянные каналы.
// Запуск: node build_heroes.js [выходной.glb]
const fs = require('fs');
const SRC = 'D:/games/assets_src/kaykit_adventurers_1.0/Characters/';
const OUT = process.argv[2] || 'D:/games/tc-wt-models/assets/models/kk_heroes.glb';

function readGlb(f) {
  const b = fs.readFileSync(f); const jl = b.readUInt32LE(12);
  const j = JSON.parse(b.slice(20, 20 + jl).toString()); const bl = b.readUInt32LE(20 + jl);
  return { j, bin: b.slice(28 + jl, 28 + jl + bl) };
}
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function readAcc(g, i) {
  const a = g.j.accessors[i], bv = g.j.bufferViews[a.bufferView], n = NC[a.type];
  const sz = { 5126: 4, 5125: 4, 5123: 2, 5122: 2, 5121: 1, 5120: 1 }[a.componentType];
  const st = bv.byteStride || n * sz, off = (bv.byteOffset || 0) + (a.byteOffset || 0), out = new Float64Array(a.count * n);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) {
    const o = off + k * st + c * sz; let v;
    switch (a.componentType) { case 5126: v = g.bin.readFloatLE(o); break; case 5125: v = g.bin.readUInt32LE(o); break; case 5123: v = g.bin.readUInt16LE(o); break; case 5122: v = g.bin.readInt16LE(o); break; case 5121: v = g.bin.readUInt8(o); break; case 5120: v = g.bin.readInt8(o); break; }
    if (a.normalized) v = a.componentType === 5121 ? v / 255 : a.componentType === 5123 ? v / 65535 : a.componentType === 5120 ? Math.max(v / 127, -1) : Math.max(v / 32767, -1);
    out[k * n + c] = v;
  }
  return { data: out, n, count: a.count };
}

const BASES = { K: 'Knight', B: 'Barbarian', M: 'Mage', R: 'Rogue', H: 'Rogue_Hooded' };
const MATS = ['knight', 'barbarian', 'mage', 'rogue']; const MAT_OF = { K: 0, B: 1, M: 2, R: 3, H: 3 };
const G = {}; for (const k in BASES) G[k] = readGlb(SRC + BASES[k] + '.glb');
const ref = G.K;
const DROP = /IK|control-/;
const refSkin = ref.j.skins[0];
const jointNames = refSkin.joints.map(i => ref.j.nodes[i].name);
const BONES = jointNames.filter(n => !DROP.test(n));
const parentOf = {}; ref.j.nodes.forEach((n, i) => (n.children || []).forEach(c => parentOf[c] = i));
const refIdx = name => ref.j.nodes.findIndex(n => n.name === name && n.mesh == null);

// ---------- выходной glTF ----------
const J = { asset: { version: '2.0', generator: 'tc build_heroes.js (KayKit Adventurers 1.0, CC0, Kay Lousberg)' }, scene: 0, scenes: [{ nodes: [0] }],
  nodes: [], meshes: [], skins: [], materials: [], accessors: [], bufferViews: [], buffers: [], animations: [],
  extensionsUsed: ['KHR_mesh_quantization'], extensionsRequired: ['KHR_mesh_quantization'] };
const chunks = []; let blen = 0;
function addView(buf, target) {
  const pad = (4 - (blen % 4)) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); blen += pad; }
  const v = { buffer: 0, byteOffset: blen, byteLength: buf.length }; if (target) v.target = target;
  chunks.push(buf); blen += buf.length; J.bufferViews.push(v); return J.bufferViews.length - 1;
}
function addAcc(typed, ctype, type, count, opt) {
  opt = opt || {}; const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const a = { bufferView: addView(buf, opt.target), componentType: ctype, count, type };
  if (opt.normalized) a.normalized = true; if (opt.min) { a.min = opt.min; a.max = opt.max; }
  J.accessors.push(a); return J.accessors.length - 1;
}
function minmax(d, n) { const mn = Array(n).fill(Infinity), mx = Array(n).fill(-Infinity); for (let i = 0; i < d.length; i++) { const c = i % n; mn[c] = Math.min(mn[c], d[i]); mx[c] = Math.max(mx[c], d[i]); } return { min: mn, max: mx }; }

MATS.forEach(m => J.materials.push({ name: 'kk_' + m, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } }));

// корень и кости
J.nodes.push({ name: 'KK', children: [] });
J.nodes.push({ name: 'Rig', children: [] }); J.nodes[0].children.push(1);
const boneNode = {};
function addBone(name) {
  if (boneNode[name] != null) return boneNode[name];
  const ri = refIdx(name), src = ref.j.nodes[ri];
  const nd = { name }; for (const k of ['translation', 'rotation', 'scale']) if (src[k]) nd[k] = src[k];
  J.nodes.push(nd); const idx = J.nodes.length - 1; boneNode[name] = idx;
  const pname = ref.j.nodes[parentOf[ri]].name;
  const pi = pname === 'Rig' ? 1 : addBone(pname);
  (J.nodes[pi].children = J.nodes[pi].children || []).push(idx);
  return idx;
}
BONES.forEach(addBone);
// скин: только нужные кости, их обратные матрицы — из исходника
{
  const inv = readAcc(ref, refSkin.inverseBindMatrices).data, out = new Float32Array(BONES.length * 16);
  BONES.forEach((b, i) => { const oi = jointNames.indexOf(b); for (let k = 0; k < 16; k++) out[i * 16 + k] = inv[oi * 16 + k]; });
  J.skins.push({ name: 'kk', joints: BONES.map(b => boneNode[b]), skeleton: boneNode.root, inverseBindMatrices: addAcc(out, 5126, 'MAT4', BONES.length) });
}
const jointRemap = jointNames.map(n => BONES.indexOf(n));

let stat = { verts: 0, tris: 0 };
function cat(list, f) { const parts = list.map(f); const n = parts[0].n; let cnt = 0; parts.forEach(p => cnt += p.count); const d = new Float64Array(cnt * n); let o = 0; parts.forEach(p => { d.set(p.data, o); o += p.data.length; }); return { data: d, n, count: cnt }; }
function addPrim(list, skinned, mat) {
  const pos = cat(list, x => readAcc(x.g, x.prim.attributes.POSITION)), nrm = cat(list, x => readAcc(x.g, x.prim.attributes.NORMAL)), uv = cat(list, x => readAcc(x.g, x.prim.attributes.TEXCOORD_0));
  const n = pos.count, attrs = {};
  const P = new Float32Array(pos.data); attrs.POSITION = addAcc(P, 5126, 'VEC3', n, { target: 34962, ...minmax(P, 3) });
  const N = new Int8Array(n * 4); for (let i = 0; i < n; i++) { let x = nrm.data[i * 3], y = nrm.data[i * 3 + 1], z = nrm.data[i * 3 + 2]; const l = Math.hypot(x, y, z) || 1; N[i * 4] = Math.round(x / l * 127); N[i * 4 + 1] = Math.round(y / l * 127); N[i * 4 + 2] = Math.round(z / l * 127); }
  // int8 VEC3 нужен шаг 4 байта — кладём в отдельный view со stride 4
  { const v = addView(Buffer.from(N.buffer), 34962); J.bufferViews[v].byteStride = 4; J.accessors.push({ bufferView: v, componentType: 5120, count: n, type: 'VEC3', normalized: true }); attrs.NORMAL = J.accessors.length - 1; }
  let uvOk = true; for (const v of uv.data) if (v < -1e-4 || v > 1 + 1e-4) uvOk = false;
  if (uvOk) { const U = new Uint16Array(n * 2); for (let i = 0; i < n * 2; i++) U[i] = Math.round(Math.min(1, Math.max(0, uv.data[i])) * 65535); attrs.TEXCOORD_0 = addAcc(U, 5123, 'VEC2', n, { target: 34962, normalized: true }); }
  else attrs.TEXCOORD_0 = addAcc(new Float32Array(uv.data), 5126, 'VEC2', n, { target: 34962 });
  if (skinned) {
    const jt = cat(list, x => readAcc(x.g, x.prim.attributes.JOINTS_0)), wt = cat(list, x => readAcc(x.g, x.prim.attributes.WEIGHTS_0));
    const JJ = new Uint8Array(n * 4), WW = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) {
      const w = [], jj = [];
      for (let c = 0; c < 4; c++) { const oj = jt.data[i * 4 + c], ow = wt.data[i * 4 + c]; const nj = jointRemap[oj]; if (ow > 0 && nj < 0) { console.warn('вес на выброшенной кости', jointNames[oj], ow); } w.push(nj < 0 ? 0 : ow); jj.push(nj < 0 ? 0 : nj); }
      const s = w.reduce((a, b) => a + b, 0) || 1; const q = w.map(x => Math.round(x / s * 255)); let d = 255 - q.reduce((a, b) => a + b, 0); const mi = q.indexOf(Math.max(...q)); q[mi] += d;
      for (let c = 0; c < 4; c++) { JJ[i * 4 + c] = jj[c]; WW[i * 4 + c] = q[c]; }
    }
    attrs.JOINTS_0 = addAcc(JJ, 5121, 'VEC4', n, { target: 34962 });
    attrs.WEIGHTS_0 = addAcc(WW, 5121, 'VEC4', n, { target: 34962, normalized: true });
  }
  let vo = 0; const idx = cat(list, x => { const r = readAcc(x.g, x.prim.indices), off = vo; vo += readAcc(x.g, x.prim.attributes.POSITION).count; return { data: r.data.map(v => v + off), n: 1, count: r.count }; });
  const I = n < 65536 ? new Uint16Array(idx.data) : new Uint32Array(idx.data);
  const indices = addAcc(I, n < 65536 ? 5123 : 5125, 'SCALAR', idx.count, { target: 34963 });
  stat.verts += n; stat.tris += idx.count / 3;
  return { attributes: attrs, indices, material: mat };
}
const parts = [];
function addMeshNode(base, srcName, outName, skinned) {
  const g = G[base], names = Array.isArray(srcName) ? srcName : [srcName], list = [];
  let ni = -1;
  for (const nm of names) { const k = g.j.nodes.findIndex(n => n.name === nm && n.mesh != null); if (k < 0) throw new Error('нет меша ' + nm + ' в ' + base); if (ni < 0) ni = k; for (const p of g.j.meshes[g.j.nodes[k].mesh].primitives) list.push({ g, prim: p }); }
  const src = g.j.nodes[ni];
  J.meshes.push({ primitives: [addPrim(list, skinned, MAT_OF[base])] });
  const nd = { name: outName, mesh: J.meshes.length - 1 };
  if (skinned) { nd.skin = 0; J.nodes.push(nd); J.nodes[0].children.push(J.nodes.length - 1); }
  else {
    for (const k of ['translation', 'rotation', 'scale']) if (src[k]) nd[k] = src[k];
    let pi = 0; for (const [i, n] of g.j.nodes.entries()) if ((n.children || []).includes(ni)) pi = i;
    const pname = g.j.nodes[pi].name; if (boneNode[pname] == null) throw new Error('родитель не кость: ' + pname);
    J.nodes.push(nd); const bi = boneNode[pname]; (J.nodes[bi].children = J.nodes[bi].children || []).push(J.nodes.length - 1);
  }
  parts.push(outName);
}
const SK = {
  K: ['Knight_Body', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_LegLeft', 'Knight_LegRight', 'Knight_Head'],
  B: ['Barbarian_Body', 'Barbarian_ArmLeft', 'Barbarian_ArmRight', 'Barbarian_LegLeft', 'Barbarian_LegRight', 'Barbarian_Head'],
  M: ['Mage_Body', 'Mage_ArmLeft', 'Mage_ArmRight', 'Mage_LegLeft', 'Mage_LegRight', 'Mage_Head'],
  R: ['Rogue_Body', 'Rogue_ArmLeft', 'Rogue_ArmRight', 'Rogue_LegLeft', 'Rogue_LegRight', 'Rogue_Head'],
  H: ['Rogue_Head_Hooded'],
};
const SHORT = s => s.replace(/^(Knight|Barbarian|Mage|Rogue)_/, '').replace('ArmLeft', 'ArmL').replace('ArmRight', 'ArmR').replace('LegLeft', 'LegL').replace('LegRight', 'LegR');
for (const b in SK) { const body = SK[b].filter(x => !/Head/.test(x)), heads = SK[b].filter(x => /Head/.test(x)); if (body.length) addMeshNode(b, body, b + '_Body', true); for (const h of heads) addMeshNode(b, h, b + '_' + SHORT(h), true); }
const PROPS = {
  K: ['1H_Sword', '1H_Sword_Offhand', '2H_Sword', 'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', 'Knight_Helmet', 'Knight_Cape'],
  B: ['1H_Axe', '1H_Axe_Offhand', '2H_Axe', 'Barbarian_Round_Shield', 'Barbarian_Hat', 'Barbarian_Cape'],
  M: ['Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff', 'Mage_Hat', 'Mage_Cape'],
  R: ['Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable', 'Rogue_Cape'],
};
for (const b in PROPS) for (const s of PROPS[b]) addMeshNode(b, s, b + 'p_' + SHORT(s), false);

// ---------- анимации ----------
const CLIPS = (process.env.CLIPS || 'Idle,Running_A,2H_Melee_Idle,Unarmed_Idle,1H_Melee_Attack_Chop,1H_Melee_Attack_Slice_Diagonal,1H_Melee_Attack_Slice_Horizontal,2H_Melee_Attack_Chop,2H_Melee_Attack_Slice,2H_Melee_Attack_Spinning,Dualwield_Melee_Attack_Chop,Dualwield_Melee_Attack_Slice,Dualwield_Melee_Attack_Stab,Unarmed_Melee_Attack_Punch_A,Unarmed_Melee_Attack_Punch_B,Unarmed_Melee_Attack_Kick,1H_Ranged_Shoot,2H_Ranged_Shoot,Spellcast_Shoot,Spellcast_Raise,Spellcast_Long,Throw,Block,Hit_A,Death_A,Cheer').split(',');
let kept = 0, dropped = 0;
for (const cn of CLIPS) {
  const a = ref.j.animations.find(x => x.name === cn); if (!a) throw new Error('нет клипа ' + cn);
  const out = { name: cn, channels: [], samplers: [] }; const inCache = new Map();
  for (const ch of a.channels) {
    const nm = ref.j.nodes[ch.target.node].name; if (boneNode[nm] == null) { dropped++; continue; }
    const path = ch.target.path; if (path === 'scale') { dropped++; continue; }
    const s = a.samplers[ch.sampler], inp = readAcc(ref, s.input), outp = readAcc(ref, s.output), n = outp.n;
    const rest = ref.j.nodes[refIdx(nm)][path] || (path === 'rotation' ? [0, 0, 0, 1] : [0, 0, 0]);
    let cst = true; for (let k = n; k < outp.data.length; k++) if (Math.abs(outp.data[k] - outp.data[k % n]) > 2e-5) { cst = false; break; }
    let restEq = true; for (let c = 0; c < n; c++) if (Math.abs(outp.data[c] - rest[c]) > 2e-4) restEq = false;
    if (path === 'rotation' && !restEq) { let d = 0; for (let c = 0; c < 4; c++) d += outp.data[c] * rest[c]; if (Math.abs(Math.abs(d) - 1) < 1e-6) restEq = true; }
    if (cst && restEq) { dropped++; continue; }
    const times = cst ? [inp.data[0]] : Array.from(inp.data), vals = cst ? Array.from(outp.data.slice(0, n)) : Array.from(outp.data);
    const key = times.join(',');
    let ia = inCache.get(key);
    if (ia == null) { const T = new Float32Array(times); ia = addAcc(T, 5126, 'SCALAR', T.length, { min: [Math.min(...T)], max: [Math.max(...T)] }); inCache.set(key, ia); }
    let oa;
    if (path === 'rotation') { const Q = new Int16Array(vals.length); for (let k = 0; k < vals.length; k += 4) { let l = Math.hypot(vals[k], vals[k + 1], vals[k + 2], vals[k + 3]) || 1; for (let c = 0; c < 4; c++) Q[k + c] = Math.round(vals[k + c] / l * 32767); } oa = addAcc(Q, 5122, 'VEC4', times.length, { normalized: true }); }
    else oa = addAcc(new Float32Array(vals), 5126, 'VEC3', times.length);
    out.samplers.push({ input: ia, output: oa, interpolation: s.interpolation || 'LINEAR' });
    out.channels.push({ sampler: out.samplers.length - 1, target: { node: boneNode[nm], path } }); kept++;
  }
  J.animations.push(out);
}

// ---------- запись GLB ----------
const bin = Buffer.concat(chunks); const binPad = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
J.buffers.push({ byteLength: binPad.length });
let js = Buffer.from(JSON.stringify(J)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binPad.length, 8);
const h1 = Buffer.alloc(8); h1.writeUInt32LE(js.length, 0); h1.writeUInt32LE(0x4E4F534A, 4);
const h2 = Buffer.alloc(8); h2.writeUInt32LE(binPad.length, 0); h2.writeUInt32LE(0x004E4942, 4);
fs.mkdirSync(require('path').dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([head, h1, js, h2, binPad]));
console.log('готово', OUT, (fs.statSync(OUT).size / 1024).toFixed(0) + ' КБ', 'костей', BONES.length, 'частей', parts.length, 'вершин', stat.verts, 'треуг', stat.tris, 'клипов', CLIPS.length, 'каналов', kept, 'выкинуто', dropped);
