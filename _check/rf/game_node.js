// «Тысяча чар» в node без браузера: данные, сила, редкость, выпадение (выбор уровня, свитки), авто-выбор и автозамена,
// «Невозможная». Вырезаем куски index.html по меткам и подставляем заглушки для отрисовки/интерфейса.
// const G=loadFull(root); G.get('имя'), G.set('имя',значение), G.run(код) — выполнить код внутри игры.
const fs = require('fs'), path = require('path'), vm = require('vm');
function loadFull(root, o = {}) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('не нашёл кусок ' + a + ' … ' + b); return html.slice(i, j); };
  const code = [
    cut('const pickW=', '\n'),
    cut('const ELEMENTS=[', 'function weakest('),
    cut('function weakest(', 'const impPerk='),
    cut('const ADJP=', 'const hexOf='),
    cut('const SUMM_CLS=', 'const summLead='),
    cut('const formSlot=', '// плашка «новая чара сильнее»'),
    cut('function checkUpgrade(', 'function showUpg('),
    cut('const sigOpen=', 'let PASS={aura'),
    cut('let LU_LAST=[];', 'function luSync('),
    cut('function putInSlot(', 'function equip('),
    cut('function classSkills(', '\n'),
  ].join('\n');
  class Color { constructor(h) { this.h = h; } clone() { return this; } copy() { return this; } set() { return this; } }
  const THREE = { Color }, doc = { querySelector: () => null, getElementById: () => null, createElement: () => ({ setAttribute() { } }) };
  const MathR = Object.create(Math); MathR.random = Math.random;
  const src = `(function(THREE,document,localStorage){const $=s=>null;const TAU=Math.PI*2;const rand=(a,b)=>a+Math.random()*(b-a);const randi=(a,b)=>Math.floor(rand(a,b+1));
const clamp=(v,a,b)=>v<a?a:v>b?b:v;const lerp=(a,b,t)=>a+(b-a)*t;const cap=s=>s[0].toUpperCase()+s.slice(1);const fmt=n=>String(n);const fmt2=n=>String(n);
const P={mpRegen:8,maxHp:120,pos:{x:0,z:0},hp:1,maxMp:1,mp:1};let __v;function cfStats(){}function cfMana(s){return skMana(s);}
const GOLD=new THREE.Color(0),WHITE=GOLD;let mode='game',luQueue=0,luDelay=0,PLAY='free',GZ=null,time=0,LOG={toast:[]};let zoneOf=()=>0;
function toast(t){LOG.toast.push(t);}function toastSk(){}function rarPop(){}function fxPillar(){}function colBurst(){}function impFx(){LOG.impFx=(LOG.impFx|0)+1;}
function saveSoon(){}function save(){}function rankSay(){}function updateRankBtn(){}function hideUpg(){}function showUpg(){}function refreshUpg(){}function luSync(){}
function rebuildPassives(){}function updateHudSlots(){}function recalcStats(){}function banner(){}function float(){}

function onBuildChanged(){EQUIPPED=new Set(equippedIds());PWC=new Map();WKC=null;RESO_N.fill(0);EQUIPPED.forEach(id=>RESO_N[SKILLS[id].e]++);for(let i=0;i<10;i++)RESO[i]=1+ST.resoPer*RESO_N[i];}
${code}
return {get:n=>eval(n),set:(n,v)=>{__v=v;eval(n+'=__v');},run:c=>eval(c),P,LOG};})`;
  const ctx = { setTimeout: () => 0, clearTimeout: () => { }, Math: MathR, Map, Set, Array, Object, JSON, Float64Array, Float32Array, Uint8Array, String, Number, Infinity, NaN, isFinite, parseInt, parseFloat, console };
  const G = vm.runInNewContext(src, ctx)(THREE, doc, {});
  G.MathR = MathR;
  return G;
}
// детерминированный генератор (mulberry32)
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
module.exports = { loadFull, rng };
