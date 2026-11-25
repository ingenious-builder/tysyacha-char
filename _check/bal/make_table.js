// Таблица «до/после» по 20 классам из замеров _check/bal/*.json → _check/bal/itog.md. node _check/bal/make_table.js
const fs=require('fs'),path=require('path');const D=__dirname,J=f=>JSON.parse(fs.readFileSync(path.join(D,f),'utf8'));
const sb=J('stand_before.json'),sa=J('stand_after.json'),rb=J('real_before.json')[160],ra=J('real_after.json')[160];
const N={pyro:'Пиромант',cryo:'Криомант',storm:'Громовержец',plague:'Чумной лекарь',necro:'Некромант',paladin:'Паладин',geo:'Геомант',windr:'Странник ветра',hemo:'Гемомант',arcan:'Арканист',
  bers:'Берсерк',dk:'Рыцарь смерти',druid:'Друид',hunter:'Ледяной охотник',assassin:'Ассасин',shaman:'Шаман',monk:'Монах',lock:'Чернокнижник',inq:'Инквизитор',alch:'Алхимик'};
const f=x=>String(x).replace('.',',');let o=[];
o.push('# Баланс веток классов — замеры до/после (25.11)','',
'Стенд — _check/fix/fx.js + _check/bal/bal_task.js (r_stand2.js): 160-й уровень, все общие таланты на максимуме, ветка класса 0 против полной, 16 с боя, 7 врагов рядом.',
'«Гибнут» — здоровье врага = половина урона в секунду героя без ветки, убитых заменяют (24 зерна, парные); «бессмертные» — здоровье 1e9 (12 зёрен).',
'Реальный бой — _check/bal/bal_real.js (как D:/games/_sc_check/balance.js): выдача с 1-го до 160-го, 30 с волнами по 10 врагов ×6 здоровья; убийства, среднее 6 зёрен; «Авто» — таланты кнопкой «Авто».',
'До — 7da02f9 (_check/fix/index_base.html: git show 7da02f9:index.html > _check/fix/index_base.html), после — index.html этой ветки. Прогон: node _check/fix/fx.js _check/bal/bal_task.js [index_base.html], node _check/fix/fx.js _check/bal/bal_real.js; таблица — node _check/bal/make_table.js.','',
'| Класс | гибнут до | гибнут после | ±сд зерна | бессм. до | бессм. после | бешенство до→после | бой без талантов до→после | бой «Авто» до→после | урон «Авто», млн |',
'|---|---|---|---|---|---|---|---|---|---|');
for(const c in sa){const A=sa[c].all,B=sb[c].all;
  o.push(`| ${N[c]} | ×${f(B.gK)} | **×${f(A.gK)}** | ${f(A.sdK)} | ×${f(B.gI)} | **×${f(A.gI)}** | ${c==='bers'?f(B.frenzy)+' → '+f(A.frenzy)+' (бой «Авто» '+f(rb.auto[c].fr)+' → '+f(ra.auto[c].fr)+')':''} | ${rb.none[c].kills} → ${ra.none[c].kills} | ${rb.auto[c].kills} → **${ra.auto[c].kills}** | ${(rb.auto[c].dmg/1e6).toFixed(1).replace('.',',')} → ${(ra.auto[c].dmg/1e6).toFixed(1).replace('.',',')} |`);}
const ks=Object.keys(sa).map(c=>sa[c].all.gK).sort((a,b)=>a-b),is=Object.keys(sa).map(c=>sa[c].all.gI).sort((a,b)=>a-b);
const au=Object.keys(ra.auto).map(c=>ra.auto[c].kills).sort((a,b)=>a-b),ab=Object.keys(rb.auto).map(c=>rb.auto[c].kills).sort((a,b)=>a-b);
o.push('',`Гибнут: после ×${f(ks[0])}–×${f(ks[ks.length-1])} (до ×${f(Math.min(...Object.values(sb).map(x=>x.all.gK)))}–×${f(Math.max(...Object.values(sb).map(x=>x.all.gK)))}). Бессмертные: после до ×${f(is[is.length-1])} (до до ×${f(Math.max(...Object.values(sb).map(x=>x.all.gI)))}).`,
  `Бой «Авто»: медиана убийств до ${ab[10]}, после ${au[10]}; Гемомант ${rb.auto.hemo.kills} → ${ra.auto.hemo.kills}.`,
  '','Разброс по зёрнам большой (±сд — по одному зерну; ошибка среднего ≈ сд/√24). Чумной лекарь на стенде «гибнут» вырожден: враг живёт ~0,1 с (3700 убийств в минуту), его число прыгает от правок в обе стороны.');
fs.writeFileSync(path.join(D,'itog.md'),o.join('\n')+'\n');console.log(o.join('\n'));
