// manifest.json → строка таблицы REC для audio.js (ключ: [спрайт, о1,д1,м1, о2,д2,м2 …] — смещение, длина, множитель громкости)
const M=require('D:/games/tc-wt-audio2/_check/audio2/manifest.json');
const k=Object.entries(M.keys).map(([n,[s,v]])=>n+':['+s+','+v.map(t=>[+t[0].toFixed(4),+t[1].toFixed(4),+t[2].toFixed(3)].join(',')).join(',')+']').join(',');
console.log('const REC={f:[\'sfx1.mp3\',\'sfx2.mp3\'],mk:'+M.mark+',k:{'+k+'}},BAT={f:\'battle.mp3\',t0:'+M.music.t0+',P:'+M.music.P+',sr:'+M.music.sr+',bar:1.6,g:.6};');
