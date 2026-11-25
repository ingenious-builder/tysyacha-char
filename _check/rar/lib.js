// Общий загрузчик игры в node для замеров порядка редкостей с талантами (без браузера).
// load(root) → {G, use(cid,L,tal,ranks), pw(id,rank), ...}
const fs=require('fs'),path=require('path'),vm=require('vm');
function load(root){
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const cut=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);if(i<0||j<0)throw new Error('нет '+a);return html.slice(i,j);};
  const code=cut('const ELEMENTS=[','function weakest(')+'\n'+cut('const ADJP=','const hexOf=')+'\n'+cut('const SUMM_CLS=','const summLead=');
  class Color{constructor(h){this.h=h;}clone(){return this;}}
  const src=`(function(THREE,document,localStorage){const $=s=>null;const TAU=Math.PI*2;const rand=(a,b)=>a+Math.random()*(b-a);const randi=(a,b)=>Math.floor(rand(a,b+1));
const clamp=(v,a,b)=>v<a?a:v>b?b:v;const lerp=(a,b,t)=>a+(b-a)*t;const cap=s=>s[0].toUpperCase()+s.slice(1);const fmt=n=>String(n);const fmt2=n=>String(n);
const P={mpRegen:8,maxHp:120,pos:{x:0,z:0}};let __v;function cfStats(){}function cfMana(s){return skMana(s);}const isImp=()=>false;
${code}
return {get:n=>eval(n),set:(n,v)=>{__v=v;eval(n+'=__v');},P};})`;
  const G=vm.runInNewContext(src,{Math,Map,Set,Array,Object,JSON,Float64Array,Float32Array,Uint8Array,String,Number,console})({Color},{querySelector:()=>null,getElementById:()=>null},{});
  const SKILLS=G.get('SKILLS'),CLASSES=G.get('CLASSES'),TALENTS=G.get('TALENTS');let CT_TAL={};try{CT_TAL=G.get('CT_TAL');}catch(e){}
  // герой: класс, уровень, таланты; мана и здоровье — как recalcStats
  function use(cid,L,tal){const C=G.get('CLASS_BY')[cid];G.set('CLS',C);
    const S={lvl:L,xp:0,ranks:{},talents:Object.assign({},tal||{}),mx:0,sandbox:false,active:Array(8).fill(null),passive:Array(42).fill(null),learned:[]};
    G.set('S',S);restat();G.set('CR_OVR',1);G.set('CLONE_OVR',true);G.set('EQUIPPED',new Set());G.get('RESO_N').fill(0);return {C,S};}
  function restat(){const S=G.get('S'),C=G.get('CLS');G.get('computeStats')();const ST=G.get('ST');G.P.mpRegen=(8+.4*(S.lvl-1))*ST.mana*C.mp;G.P.maxHp=(120+24*(S.lvl-1))*ST.hpMul*C.hp;G.get('PWC').clear();
  }
  function setTal(tal){G.get('S').talents=Object.assign({},tal||{});restat();}
  // сила чары у героя (без билда: резонанс и реакции — 1) на ранге r
  function pw(id,r){const S=G.get('S');const keep=S.ranks;S.ranks=r>1?{[id]:r}:{};try{return G.get('skParts')(SKILLS[id],false).pw;}finally{S.ranks=keep;}}
  const genMax=()=>{const g={};for(const t of TALENTS)g[t.id]=t.max;return g;};
  const clsMax=cid=>{const g={};for(const t of CT_TAL[cid]||[])g[t.id]=t.max;return g;};
  return {G,SKILLS,CLASSES,TALENTS,CT_TAL,use,setTal,restat,pw,genMax,clsMax};}
module.exports={load};
