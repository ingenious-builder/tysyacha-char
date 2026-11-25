// Проверяющий rev3: тексты талантов ветки класса на каждой ступени (без браузера).
// Для изменённых в feat/balrar талантов печатает f (коротко), d (описание) и подсказку «сейчас → со следующим очком» (talNx)
// на ступенях 0..max и ступенях особенности 1..4; ищет NaN/undefined и сверяет числа с формулами кода (ниже, выписаны из index.html).
// node _check/rev3/v3_texts.js [index.html]
const fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'../../index.html'),'utf8');
const cut=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);if(i<0||j<0)throw new Error('нет '+a);return html.slice(i,j);};
const i0=html.indexOf('const ctN='),i1=html.indexOf('const CT_TAL={'),i2=html.indexOf('\nfor(const cid in CT_TAL)',i1);
const code=html.slice(i0,html.indexOf('\n',i0))+'\n'+html.slice(i1,i2);
const talNx=(a,b)=>{const A=a.split(' '),B=b.split(' ');let k=0;while(k<A.length-1&&k<B.length-1&&A[k]===B[k])k++;return B.slice(k).join(' ');};
const CT_TAL=vm.runInNewContext(code+';CT_TAL',{Math,String});
// формулы кода (index.html, feat/balrar): v — очки, t — ступень особенности (rev4: «Руническая сила» +10% за очко вместо +8%, «Арканная мощь» +8% вместо +6%, «Тёмный владыка» предел +15% за очко вместо +20%)
const F={
 py_blast:(v)=>[120*(1+.1*v)],py_ember:(v)=>[4+v,15+2*v],cr_shard:(v)=>[3+v,5+v],st_volt:(v)=>[80+20*v],st_more:(v,t)=>[(t>=2?8:6)+2*v],
 st_stun:(v,t)=>[+((t>=4?1:.6)+.2*v).toFixed(2),12*v],pl_tox:(v)=>[8*v,+(.075*.08*v*100).toFixed(2)],ne_bone:(v)=>[8+2*v,20*v],ne_lord:(v)=>[5+v,40+15*v],
 pa_out:(v,t)=>[+((t>=4?1.5:1.2)+.12*v).toFixed(2),12*v],wi_gain:(v)=>[Math.round(40*(1+.2*v))],wi_edge:(v,t)=>[Math.round(((t>=4?.008:.006)+.0016*v)*100*100)],
 wi_step:(v)=>[25*v],he_thin:(v)=>[40+12*v,+(3+.5*v).toFixed(2)],he_edge:(v,t)=>[50+10*v,(t>=3?40:25)+5*v],he_feast:(v,t)=>[2+(t>=4?1:0)+v,3*v],
 ar_mind:(v,t)=>[(t>=4?55:40)+8*v],be_boil:(v)=>[+(1+.03*v).toFixed(2)],be_long:(v)=>[+(.5+.1*v).toFixed(2),50+10*v],dk_rune:(v)=>[+(1.5+.12*v).toFixed(2),10*v],
 dk_frost:(v)=>[35*v],dr_pack:(v)=>[8*v,8*v],hu_prey:(v)=>[25+12*v],hu_bolt:(v)=>[130+25*v],as_back:(v)=>[+(1.6+.08*v).toFixed(2)],as_dark:(v)=>[10*v],
 sh_bond:(v,t)=>[(t>=4?8:6)+v,40+20*v],mo_peak:(v)=>[30+3*v],lo_imp:(v)=>[30*v,8+2*v],in_judge:(v,t)=>[(t>=4?40:25)+6*v],in_pyre:(v)=>[15*v],in_blast:(v,t)=>[v,+((t>=3?4:3)+.5*v).toFixed(2)]};
const num=s=>(s.match(/-?\d+(?:,\d+)?/g)||[]).map(x=>+x.replace(',','.'));
let bad=0,lines=[];
for(const cid in CT_TAL)for(const t of CT_TAL[cid]){
  for(let tier=1;tier<=4;tier++)for(let v=0;v<=t.max;v++){const f=t.f(v,tier),d=t.d(v,tier);
    if(/NaN|undefined|Infinity/.test(f+d)){bad++;lines.push('ПЛОХО '+t.id+' v'+v+' t'+tier+': '+f+' | '+d);}
    if(F[t.id]&&v>0){const need=F[t.id](v,tier),nf=num(f),nd=num(d);for(const x of need){if(!nf.includes(x)&&!nd.includes(x)){bad++;lines.push(`РАСХОЖДЕНИЕ ${t.id} v${v} t${tier}: код ${x} нет в «${f}» / «${d}»`);}}}}
  if(F[t.id]){const tier=4;lines.push(`${t.id} (${t.name}, max ${t.max}): `+Array.from({length:t.max+1},(_,v)=>v).map(v=>`[${v}] ${t.f(v,tier)}`).join(' | '));
    lines.push('   d(1): '+t.d(1,tier));lines.push('   d(max): '+t.d(t.max,tier));
    lines.push('   подсказка: '+Array.from({length:t.max},(_,v)=>v).map(v=>v?`сейчас ${t.f(v,tier)} → ${talNx(t.f(v,tier),t.f(v+1,tier))}`:`с первым очком: ${t.f(1,tier)}`).join(' || '));}}
console.log(lines.join('\n'));console.log('ИТОГ: несовпадений и NaN',bad);
