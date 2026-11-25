// Независимая проверка: нарушения порядка редкостей при раскладках талантов (none / только общие макс / общие+ветка / только ветка)
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=process.argv[2]||path.resolve(__dirname,'../..');const L=+(process.argv[3]||160);
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const cut=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);if(i<0||j<0)throw new Error('нет '+a);return html.slice(i,j);};
const code=cut('const ELEMENTS=[','function weakest(')+'\n'+cut('const ADJP=','const hexOf=')+'\n'+cut('const SUMM_CLS=','const summLead=');
class Color{constructor(h){this.h=h;}clone(){return this;}}
const src=`(function(THREE,document,localStorage){const $=s=>null;const TAU=Math.PI*2;const rand=(a,b)=>a+Math.random()*(b-a);const randi=(a,b)=>Math.floor(rand(a,b+1));
const clamp=(v,a,b)=>v<a?a:v>b?b:v;const lerp=(a,b,t)=>a+(b-a)*t;const cap=s=>s[0].toUpperCase()+s.slice(1);const fmt=n=>String(n);const fmt2=n=>String(n);
const P={mpRegen:8,maxHp:120,pos:{x:0,z:0}};let __v;function cfStats(){}function cfMana(s){return skMana(s);}const isImp=()=>false;
${code}
return {get:n=>eval(n),set:(n,v)=>{__v=v;eval(n+'=__v');},P};})`;
const G=vm.runInNewContext(src,{Math,Map,Set,Array,Object,JSON,Float64Array,Float32Array,String,Number,console})({Color},{querySelector:()=>null,getElementById:()=>null},{});
const CLASSES=G.get('CLASSES'),SKILLS=G.get('SKILLS'),TALENTS=G.get('TALENTS');let CT_TAL={};try{CT_TAL=G.get('CT_TAL');}catch(e){}
function use(cid,tal){const C=G.get('CLASS_BY')[cid];G.set('CLS',C);const S={lvl:L,xp:0,ranks:{},talents:tal||{},mx:0,sandbox:false,active:Array(8).fill(null),passive:Array(42).fill(null),learned:[]};
  G.set('S',S);G.get('computeStats')();G.P.mpRegen=(8+.4*(L-1))*G.get('ST').mana*C.mp;G.P.maxHp=(120+24*(L-1))*G.get('ST').hpMul*C.hp;G.set('CR_OVR',1);G.set('CLONE_OVR',true);G.set('EQUIPPED',new Set());G.get('RESO_N').fill(0);G.get('PWC').clear();return {C,S};}
const gen={};for(const t of TALENTS)gen[t.id]=t.max;
let tot={none:0,gen:0,cls:0,all:0},pairs=0;const rows=[];
for(const C of CLASSES){const cls={};for(const t of CT_TAL[C.id]||[])cls[t.id]=t.max;const all={...gen,...cls};
  use(C.id,{});const I=G.get('rarInfo')();
  const pw=(id,r,tal)=>{const S=G.get('S');S.talents=tal;S.ranks=r>1?{[id]:r}:{};G.get('computeStats')();G.P.mpRegen=(8+.4*(L-1))*G.get('ST').mana*G.get('CLS').mp;G.P.maxHp=(120+24*(L-1))*G.get('ST').hpMul*G.get('CLS').hp;G.get('PWC').clear();return G.get('skParts')(SKILLS[id],false).pw;};
  const cnt={none:0,gen:0,cls:0,all:0};let np=0,kmin=9,kmax=0;
  for(const act of [true,false]){const ids=[...C.pool].filter(id=>SKILLS[id].active===act);
    for(const [nm,tal] of [['none',{}],['gen',gen],['cls',cls],['all',all]]){const tier=Array.from({length:5},()=>({min1:Infinity,maxM:0,n:0}));
      for(const id of ids){const r=I.map.get(id)|0,t=tier[r];t.n++;t.min1=Math.min(t.min1,pw(id,1,tal));t.maxM=Math.max(t.maxM,pw(id,5,tal));
        if(nm==='all'){const k=pw(id,1,all)/pw(id,1,gen);kmin=Math.min(kmin,k);kmax=Math.max(kmax,k);}}
      for(let r=0;r+1<4;r++){const lo=tier[r],hi=tier[r+1];if(!lo.n||!hi.n)continue;if(nm==='none'){np++;pairs++;}if(hi.min1<lo.maxM){cnt[nm]++;tot[nm]++;}}}}
  rows.push(`| ${C.name} | ${cnt.none} | ${cnt.gen} | ${cnt.cls} | ${cnt.all} | из ${np} | ×${kmin.toFixed(2)}–×${kmax.toFixed(2)} |`);}
console.log(`ур. ${L}\n| Класс | без талантов | общие макс | ветка | общие+ветка | пар | ветка поверх общих ×N |\n|---|---|---|---|---|---|---|\n`+rows.join('\n'));
console.log('ИТОГО',JSON.stringify(tot),'пар',pairs);
