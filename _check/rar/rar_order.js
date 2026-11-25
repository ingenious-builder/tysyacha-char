// Порядок редкостей с талантами (node, без браузера).
// node _check/rar/rar_order.js <корень игры> <auto.json | max> [уровни] [--md=файл] [--json=файл]
// Пары соседних редкостей: 20 классов × активные/пассивные × 3 пары = 120 на уровень.
//  «тот же ранг» — слабейшая чара редкости выше слабее сильнейшей чары редкости ниже на одном ранге (1-м и 5-м) — правило;
//  «5-й против 1-го» — как у проверяющего (r_power.js/tal_power.js): низшая на 5-м ранге сильнее высшей на 1-м.
// «таланты ×N»: пул — средний (геом.) множитель талантов по пулу класса; билд — сумма силы чар билда с талантами / без них.
const fs=require('fs'),path=require('path');const {load}=require('./lib');
const A=process.argv.slice(2),pos=A.filter(a=>!a.startsWith('--')),opt=k=>{const a=A.find(x=>x.startsWith('--'+k+'='));return a?a.slice(k.length+3):null;};
const ROOT=path.resolve(pos[0]),SRC=pos[1]||'max',LVS=(pos[2]||'20,50,100,160').split(',').map(Number);
const g=load(ROOT),AUTO=SRC==='max'?null:JSON.parse(fs.readFileSync(SRC,'utf8'));
const res={},rows=[];const T={same:0,cross:0,pairs:0};const gm=a=>Math.exp(a.reduce((s,v)=>s+Math.log(v),0)/a.length);
for(const L of LVS){res[L]={};const tl={same:0,cross:0,pairs:0,poolK:[],buildK:[],minM:9,spread:[]};
  for(const C of g.CLASSES){const lay=AUTO?AUTO[C.id]&&AUTO[C.id][L]:null;if(AUTO&&!lay)continue;
    const tal=lay?lay.tal:{...g.genMax(),...g.clsMax(C.id)};
    g.use(C.id,L,{});const I=g.G.get('rarInfo')(),ids=[...C.pool];const p0={};for(const id of ids)p0[id]=g.pw(id,1);
    const b0=lay?[...lay.a,...lay.p]:[];const bp0=b0.map(id=>g.pw(id,1));
    g.setTal(tal);const p1={},p5={};for(const id of ids){p1[id]=g.pw(id,1);p5[id]=g.pw(id,5);}
    const bp1=b0.map(id=>g.pw(id,1));
    let same=0,cross=0,np=0,minM=9;const k=ids.map(id=>p1[id]/p0[id]);
    for(const act of [true,false]){const tier=Array.from({length:4},()=>({min1:Infinity,max1:0,min5:Infinity,max5:0,n:0}));
      for(const id of ids){if(g.SKILLS[id].active!==act)continue;const t=tier[I.map.get(id)|0];t.n++;
        t.min1=Math.min(t.min1,p1[id]);t.max1=Math.max(t.max1,p1[id]);t.min5=Math.min(t.min5,p5[id]);t.max5=Math.max(t.max5,p5[id]);}
      for(let r=0;r<3;r++){const lo=tier[r],hi=tier[r+1];if(!lo.n||!hi.n)continue;np++;
        const m=Math.min(hi.min1/lo.max1,hi.min5/lo.max5);minM=Math.min(minM,m);if(m<1)same++;if(hi.min1<lo.max5)cross++;}}
    const poolK=gm(k),buildK=b0.length?bp1.reduce((a,b)=>a+b,0)/bp0.reduce((a,b)=>a+b,0):null,spread=Math.max(...k)/Math.min(...k);
    res[L][C.id]={same,cross,np,minM:+minM.toFixed(3),poolK:+poolK.toFixed(3),buildK:buildK&&+buildK.toFixed(3),spread:+spread.toFixed(2),tal:Object.values(tal).reduce((a,b)=>a+b,0)};
    tl.same+=same;tl.cross+=cross;tl.pairs+=np;tl.poolK.push(poolK);if(buildK)tl.buildK.push(buildK);tl.minM=Math.min(tl.minM,minM);tl.spread.push(spread);}
  res[L]._tot={same:tl.same,cross:tl.cross,pairs:tl.pairs,minM:+tl.minM.toFixed(3),poolK:+gm(tl.poolK).toFixed(3),buildK:tl.buildK.length?+gm(tl.buildK).toFixed(3):null,spreadMax:+Math.max(...tl.spread).toFixed(2)};
  T.same+=tl.same;T.cross+=tl.cross;T.pairs+=tl.pairs;
  console.log(`ур. ${L}: тот же ранг — перевёрнуто ${tl.same} из ${tl.pairs} (наименьший запас ×${tl.minM.toFixed(3)}); 5-й против 1-го — ${tl.cross}; таланты: пул ×${gm(tl.poolK).toFixed(2)}`+(tl.buildK.length?`, билд ×${gm(tl.buildK).toFixed(2)}`:'')+`; разброс талантов внутри героя до ×${Math.max(...tl.spread).toFixed(2)}`);}
console.log(`ВСЕГО: тот же ранг ${T.same} из ${T.pairs}; 5-й против 1-го ${T.cross} из ${T.pairs}`);
if(opt('json'))fs.writeFileSync(opt('json'),JSON.stringify(res,null,1));
if(opt('md')){const md=[`# Порядок редкостей с талантами — ${ROOT} (${SRC==='max'?'все таланты на максимуме':'«Авто»-таланты'})`,'','| Класс | '+LVS.map(L=>`ур.${L}: тот же ранг / 5-й vs 1-й / запас / разброс / ×пул / ×билд`).join(' | ')+' |','|---|'+LVS.map(()=>'---').join('|')+'|'];
  for(const C of g.CLASSES)md.push(`| ${C.name} | `+LVS.map(L=>{const r=res[L][C.id];return r?`${r.same} / ${r.cross} / ×${r.minM} / ×${r.spread} / ×${r.poolK} / ${r.buildK?'×'+r.buildK:'—'}`:'—';}).join(' | ')+' |');
  md.push('| **Итого** | '+LVS.map(L=>{const r=res[L]._tot;return `**${r.same} / ${r.cross} из ${r.pairs}** · запас ×${r.minM} · ×${r.poolK} / ${r.buildK?'×'+r.buildK:'—'}`;}).join(' | ')+' |');
  fs.writeFileSync(opt('md'),md.join('\n')+'\n');}
