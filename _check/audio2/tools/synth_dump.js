// Синтез нынешних звуков (audio.js в node) → сырые float32 24 кГц в D:/games/_snd_dl_tools/ref/<ключ>#<вариант>.f32 — эталон громкости для записей
const fs=require('fs'),A=require('D:/games/tc-wt-audio2/audio.js');const OUT='D:/games/_snd_dl_tools/ref/';
const keys=process.argv.slice(2);const info={};
for(const n of keys){const R=A.L[n];if(!R){console.log('нет ключа',n);continue;}info[n]=R.v;
  for(let v=0;v<R.v;v++){const o=A.render(n,v,A.SR1);fs.writeFileSync(OUT+n+'#'+v+'.f32',Buffer.from(o.x.buffer,o.x.byteOffset,o.x.byteLength));}}
fs.writeFileSync(OUT+'_vars.json',JSON.stringify({sr:A.SR1,v:info}));console.log(JSON.stringify(info));
