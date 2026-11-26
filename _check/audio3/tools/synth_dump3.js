// Синтез h_fire, h_poison, h_wind, h_ice, h_earth (audio.js в node) → float32 24 кГц в D:/games/_snd_dl_tools/ref3/ — эталон громкости
const fs = require('fs'), A = require('D:/games/tc-wt-audio3/audio.js'); const OUT = 'D:/games/_snd_dl_tools/ref3/';
fs.mkdirSync(OUT, { recursive: true });
const info = {};
for (const n of ['h_fire', 'h_poison', 'h_wind', 'h_ice', 'h_earth']) {
  const R = A.L[n]; info[n] = R.v;
  for (let v = 0; v < R.v; v++) { const o = A.render(n, v, A.SR1); fs.writeFileSync(OUT + n + '#' + v + '.f32', Buffer.from(o.x.buffer, o.x.byteOffset, o.x.byteLength)); }
}
fs.writeFileSync(OUT + '_vars.json', JSON.stringify({ sr: A.SR1, v: info })); console.log(JSON.stringify(info));
