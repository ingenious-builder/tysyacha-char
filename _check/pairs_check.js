#!/usr/bin/env node
// Проверка «редкость = сила» в РЕАЛЬНОМ уроне с талантами (после второй проверки v13.29, 25.11).
// Критические пары редкостей (у каждого класса на каждой границе: 2 сильнейшие чары ниже против 2 слабейших выше, по показанной силе)
// на уровнях 50 и 160, все общие таланты на максимуме, без особенности класса; стенд реального урона (rev2/sim_tal.js), поток — среднее
// по 4 зёрнам. Условие: с талантами явно перевёрнутых пар (×<0,91) не больше, чем без талантов, +2 на шум: пары выбираются по силе С
// талантами, и счёт «без талантов» на одном и том же коде от прогона к прогону гулял 2–5 (_check/rev4: pre, a1, b2, b3).
// node _check/pairs_check.js [--root=<папка игры>] — браузер через замок D:/games/pw_gate.js, ~2 мин. Код выхода 1 — нарушение.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const ARG=process.argv.slice(2),opt=(k,d)=>{const a=ARG.find(x=>x.startsWith('--'+k+'='));return a?a.split('=').slice(1).join('='):d;};
const ROOT=path.resolve(opt('root',path.join(__dirname,'..'))),TMP=path.join(__dirname,'rev4');let bad=0;const out=[];
for(const L of [50,160]){const pf=path.join(TMP,`pc_p${L}.json`),rf=path.join(TMP,`pc_r${L}.json`),jf=path.join(TMP,`pc_a${L}.json`);
  execFileSync(process.execPath,[path.join(__dirname,'rev2/pairsA.js'),ROOT,pf,String(L),'gen'],{stdio:'ignore'});
  execFileSync(process.execPath,[path.join(TMP,'b_real_ms.js'),ROOT,pf,rf],{stdio:'ignore',env:Object.assign({},process.env,{SEEDS:process.env.SEEDS||'[11,12,13,14]'}),timeout:600e3});
  const txt=execFileSync(process.execPath,[path.join(TMP,'real_an_ms.js'),pf,rf,'ур.'+L],{env:Object.assign({},process.env,{JSON_OUT:jf})}).toString().trim();
  const r=JSON.parse(fs.readFileSync(jf,'utf8')),ok=r.inv<=r.inv0+2;if(!ok)bad++;out.push((ok?'в порядке  ':'НАРУШЕНИЕ  ')+txt);
  const R=JSON.parse(fs.readFileSync(rf,'utf8'));if(R.errs&&R.errs.length){bad++;out.push('ошибки страницы: '+R.errs.slice(0,3).join(' | '));}}
console.log(out.join('\n'));console.log(bad?`\nИТОГ: реальный урон пар — нарушения (${bad})`:'\nИТОГ: реальный урон пар — всё в порядке');
if(require.main===module&&bad)process.exitCode=1;
module.exports={};
