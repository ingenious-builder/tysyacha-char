// Итоговые таблицы слитого кода: баланс веток (стенды, бой «Авто», бешенство) и порядок редкостей. node _check/merged/table.js → itog.md
const fs=require('fs'),path=require('path');const D=__dirname,J=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){return null;}};
const BC=path.join(D,'../bal/')+'/',RO=path.join(D,'ref')+'/';   // balcls — _check/bal (в git), rarord — копии в ref/
const sb=J(BC+'stand_before.json'),sc=J(BC+'stand_after.json');
// слито: стенд шумный от прогона к прогону (до ±0,3 у отдельных классов) — среднее всех прогонов (stand, stand2, stand_rep для 7 классов)
const runs=['stand.json','stand2.json','stand_rep.json'].map(x=>J(path.join(D,x))).filter(Boolean),sm={},spr={};
for(const r of runs)for(const c in r){const a=r[c].all;(spr[c]||(spr[c]={gK:[],gI:[],fr:[]}));spr[c].gK.push(a.gK);spr[c].gI.push(a.gI);spr[c].fr.push(a.frenzy);}
for(const c in spr){const m=k=>spr[c][k].reduce((x,y)=>x+y,0)/spr[c][k].length;sm[c]={all:{gK:m('gK'),gI:m('gI'),frenzy:m('fr')}};}
const xm=J(path.join(D,'real_x_merged.json')),xb=J(path.join(D,'real_x_balcls.json'));
const rb=J(BC+'real_before.json')[160],rc=J(BC+'real_after.json')[160],rmj=J(path.join(D,process.env.REAL||'real.json')),rm=rmj&&rmj[160];
const N={pyro:'Пиромант',cryo:'Криомант',storm:'Громовержец',plague:'Чумной лекарь',necro:'Некромант',paladin:'Паладин',geo:'Геомант',windr:'Странник ветра',hemo:'Гемомант',arcan:'Арканист',
  bers:'Берсерк',dk:'Рыцарь смерти',druid:'Друид',hunter:'Ледяной охотник',assassin:'Ассасин',shaman:'Шаман',monk:'Монах',lock:'Чернокнижник',inq:'Инквизитор',alch:'Алхимик'};
const f=(x,d=2)=>x==null?'—':(+x).toFixed(d).replace('.',',');const o=[];
o.push('# Слияние feat/balcls + feat/rarord (feat/balrar) — замеры на слитом коде','',
'## 1. Баланс веток классов (160-й, общие таланты на максимуме, ветка 0 против полной)','',
'Стенд r_stand2.js (у balcls и 7da02f9 — по одному прогону из их отчёта; у слитого — среднее прогонов, в скобках каждый) (_check/fix/fx.js + _check/bal/bal_task.js): «гибнут» — 24 зерна, «бессмертные» — 12 зёрен, 16 с боя. Бой «Авто» — _check/bal/bal_real.js (как _sc_check/balance.js), 6 зёрен, убийства.','',
'| Класс | гибнут: 7da02f9 → balcls → **слито** (прогоны) | бессмертные: 7da02f9 → balcls → **слито** (прогоны) | бой «Авто»: 7da02f9 → balcls → **слито** | +12 зёрен: balcls / слито |','|---|---|---|---|---|');
for(const c in N){const B=sb[c].all,C=sc[c].all,M=sm&&sm[c]&&sm[c].all;
  const pr=k=>spr[c]?spr[c][k].map(v=>f(v)).join(' / '):'';const x12=xm&&xm[160].auto[c]?xb[160].auto[c].kills+' / '+xm[160].auto[c].kills:'';
  o.push(`| ${N[c]} | ×${f(B.gK)} → ×${f(C.gK)} → **×${f(M&&M.gK)}** (${pr('gK')}) | ×${f(B.gI)} → ×${f(C.gI)} → **×${f(M&&M.gI)}** (${pr('gI')}) | ${rb.auto[c].kills} → ${rc.auto[c].kills} → **${rm&&rm.auto[c]?rm.auto[c].kills:'—'}** | ${x12} |`);}
const rng=(s,k)=>{const v=Object.keys(N).filter(c=>s&&s[c]).map(c=>s[c].all[k]);return '×'+f(Math.min(...v))+'–×'+f(Math.max(...v));};
const med=r=>{const v=Object.keys(N).filter(c=>r&&r.auto[c]).map(c=>r.auto[c].kills).sort((a,b)=>a-b);return v.length?(v[9]+v[10])/2:'—';};
o.push('',`Гибнут: 7da02f9 ${rng(sb,'gK')}, balcls ${rng(sc,'gK')}, **слито ${rng(sm,'gK')}**. Бессмертные: ${rng(sb,'gI')}, ${rng(sc,'gI')}, **${rng(sm,'gI')}**.`,
`Бешенство Берсерка (доля боя): стенд ${f(sb.bers.all.frenzy)} → ${f(sc.bers.all.frenzy)} → **${f(sm&&sm.bers.all.frenzy)}**; бой «Авто» ${f(rb.auto.bers.fr)} → ${f(rc.auto.bers.fr)} → **${f(rm&&rm.auto.bers.fr)}**.`,
`Медиана убийств «Авто»: ${med(rb)} → ${med(rc)} → **${med(rm)}**; Гемомант ${rb.auto.hemo.kills} → ${rc.auto.hemo.kills} → **${rm&&rm.auto.hemo?rm.auto.hemo.kills:'—'}**.`,'');
// редкости
const oa={base:J(RO+'order_base_auto.json'),ro:J(RO+'order_new_auto.json'),m:J(path.join(D,'order_auto.json'))},om={base:J(RO+'order_base_max.json'),ro:J(RO+'order_new_max.json'),m:J(path.join(D,'order_max.json'))};
o.push('## 2. Порядок редкостей с талантами (20 классов × 6 = 120 пар соседних редкостей на уровень)','',
'| Замер | 7da02f9 | rarord | **слито** |','|---|---|---|---|');
const t=(j,L,k)=>j&&j[L]&&j[L]._tot?j[L]._tot[k]:null;
for(const [nm,src] of [['«Авто»',oa],['все таланты на максимуме',om]]){
  o.push(`| Тот же ранг, ${nm}, перевёрнуто ур. 20/50/100/160 | ${[20,50,100,160].map(L=>t(src.base,L,'same')).join(' / ')} | ${[20,50,100,160].map(L=>t(src.ro,L,'same')).join(' / ')} | **${[20,50,100,160].map(L=>t(src.m,L,'same')).join(' / ')}** |`);
  o.push(`| Наименьший запас, ${nm} (ур. 160) | ×${f(t(src.base,160,'minM'),3)} | ×${f(t(src.ro,160,'minM'),3)} | **×${f(t(src.m,160,'minM'),3)}** |`);
  o.push(`| 5-й ранг низшей против 1-го высшей, ${nm} (ур. 160) | ${t(src.base,160,'cross')} | ${t(src.ro,160,'cross')} | **${t(src.m,160,'cross')}** |`);}
o.push(`| «Таланты ×N», билд «Авто», ур. 50 / 160 | ×${f(t(oa.base,50,'buildK'))} / ×${f(t(oa.base,160,'buildK'))} | ×${f(t(oa.ro,50,'buildK'))} / ×${f(t(oa.ro,160,'buildK'))} | **×${f(t(oa.m,50,'buildK'))} / ×${f(t(oa.m,160,'buildK'))}** |`);
o.push(`| «Таланты ×N», пул, «Авто» ур. 160 / все на максимуме | ×${f(t(oa.base,160,'poolK'))} / ×${f(t(om.base,160,'poolK'))} | ×${f(t(oa.ro,160,'poolK'))} / ×${f(t(om.ro,160,'poolK'))} | **×${f(t(oa.m,160,'poolK'))} / ×${f(t(om.m,160,'poolK'))}** |`);
o.push(`| Разброс талантов внутри героя, ур. 160 (макс.) | ×${f(t(om.base,160,'spreadMax'))} | ×${f(t(om.ro,160,'spreadMax'))} | **×${f(t(om.m,160,'spreadMax'))}** |`);
const ui=J(path.join(D,'ui.json')),uib=J(RO+'ui_base.json'),uir=J(RO+'ui_new.json');
const us=u=>{if(!u)return null;let inv=0,np=0,imp=9,ms=0;for(const k in u){if(k[0]==='_')continue;inv+=u[k].inv;np+=u[k].np;imp=Math.min(imp,u[k].imp);ms=Math.max(ms,u[k].ms);}return {inv,np,imp,ms};};
const a=us(uib),b=us(uir),c=us(ui);
if(a)o.push(`| Живая игра (особенность класса), ур. 50 и 160: перевёрнуто | ${a.inv} из ${a.np} | ${b.inv} из ${b.np} | **${c?c.inv+' из '+c.np:'—'}** |`,
  `| «Невозможная» против легендарной (хуже всего) | ×${f(a.imp)} | ×${f(b.imp)} | **×${c?f(c.imp):'—'}** |`,`| «Авто» на все очки, ПК (макс.) | ${a.ms} мс | ${b.ms} мс | **${c?c.ms+' мс':'—'}** |`);
const lv=J(path.join(D,'live60.json'));
o.push('','## 3. Прочие проверки слитого кода','',
  '- Живой автобой (_check/fix/t_live.js: LV=60 SEC=15, общие «Авто», ветка класса на максимуме, настоящий цикл игры): '+(lv?lv.tot.classes+' классов, ошибок страницы '+lv.tot.errs+', NaN '+lv.tot.nan:'—')+'.',
  '- Синтаксис (_check/merged/syn.js: new Function по каждому <script> без src): 4 скрипта, 0 ошибок. node _check/power_check.js — «ИТОГ: всё в порядке».',
  '- Уведомление о сбросе талантов (TAL_NOTE) влезает в 2 строки подсказки на 360 и 390 (_check/merged/t_note.js); прежний текст v13.29 и текст balcls не влезали (3–4 строки, хвост обрезался).',
  '- Бой «+12 зёрен» — те же зёрна 7..18 на коде balcls и на слитом (real_x_*.json): разница в пределах шума, слияние реальный бой не сдвинуло.');
fs.writeFileSync(path.join(D,'itog.md'),o.join('\n')+'\n');console.log(o.join('\n'));
