// итоговая таблица баланса веток: среднее по 5 билдам (BSEED 31, 777, 4242, 99, 2026), до (rev2 — проверка слитого кода) и после.
// node table.js <tag> [md-файл]
const fs=require('fs'),path=require('path');const tag=process.argv[2],B=[31,777,4242,99,2026],R=__dirname;
const rd=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){return null;}};
const pre=B.map(b=>rd(path.join(R,'../rev2/stand'+b+'.json'))).filter(Boolean),now=B.map(b=>rd(path.join(R,`st_${tag}_${b}.json`))).filter(Boolean);
const NM={pyro:'Пиромант',cryo:'Криомант',storm:'Громовержец',plague:'Чумной лекарь',necro:'Некромант',paladin:'Паладин',geo:'Геомант',windr:'Странник',hemo:'Гемомант',arcan:'Арканист',bers:'Берсерк',dk:'Рыцарь смерти',druid:'Друид',hunter:'Ледяной охотник',assassin:'Ассасин',shaman:'Шаман',monk:'Монах',lock:'Чернокнижник',inq:'Инквизитор',alch:'Алхимик'};
const agg=(arr,c,k)=>{const v=arr.map(j=>j[c]&&j[c].all&&j[c].all[k]).filter(x=>x!=null);return v.length?{m:v.reduce((a,b)=>a+b,0)/v.length,lo:Math.min(...v),hi:Math.max(...v)}:null;};
const realPre=rd(path.join(R,'../rev2/real.json')),realNow=rd(path.join(R,`real_${tag}.json`));
const kills=(J,c)=>J&&J[160]&&J[160].auto&&J[160].auto[c]?J[160].auto[c].kills:null;
const f=(x,d=2)=>x==null?'—':x.toFixed(d).replace('.',',');const L=['| Класс | гибнут: до (мин–макс) | **после** (мин–макс) | бессмертные: до | **после** | бой «Авто», убийств: до → после |','|---|---|---|---|---|---|'];
const cls=Object.keys(NM);const allK=[],allI=[];
for(const c of cls){const a=agg(pre,c,'gK'),b=agg(now,c,'gK'),ai=agg(pre,c,'gI'),bi=agg(now,c,'gI');if(b){allK.push(b.m);allI.push(bi.m);}
  L.push(`| ${NM[c]} | ${f(a&&a.m)} (${f(a&&a.lo)}–${f(a&&a.hi)}) | **${f(b&&b.m)}** (${f(b&&b.lo)}–${f(b&&b.hi)}) | ${f(ai&&ai.m)} | **${f(bi&&bi.m)}** | ${kills(realPre,c)??'—'} → ${kills(realNow,c)??'—'} |`);}
const med=a=>{const b=a.slice().sort((x,y)=>x-y);return b[b.length>>1];};
const fr=(arr)=>{const v=arr.map(j=>j.bers&&j.bers.all&&j.bers.all.frenzy).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
const rk=J=>J&&J[160]&&J[160].auto?Object.values(J[160].auto).map(x=>x.kills):[];
L.push('',`Все 20 (среднее по билдам): гибнут ×${f(Math.min(...allK))}–${f(Math.max(...allK))}, бессмертные до ×${f(Math.max(...allI))}. Бешенство Берсерка (доля боя, стенд): до ${f(fr(pre))} → ${f(fr(now))}`+
  (realNow?`, в реальном бою ${f(realNow[160].auto.bers.fr)}`:'')+`. Реальный бой: медиана убийств ${med(rk(realPre))??'—'} → ${med(rk(realNow))??'—'}.`);
const out=L.join('\n');console.log(out);if(process.argv[3])fs.writeFileSync(process.argv[3],out+'\n');
