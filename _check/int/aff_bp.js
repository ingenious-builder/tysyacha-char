// Сколько «Лучший билд» каждого класса теряет от потолка редкости с особенностью (int/v1331, решение Петра):
// сила билда с особенностью класса (skPower × ctAff, как в игре) — потолок с сродством против потолка без него.
// node _check/int/aff_bp.js [index.html]
const path=require('path');const {load,bp}=require('D:/games/tc-wt-pas/_check/pas/lib.js');
const FILE=process.argv[2]||path.join(__dirname,'..','..','index.html');
const tr=on=>html=>{const i=html.indexOf('const CT_AFF='),j=html.indexOf('{const f0=skPower;',i),k=html.indexOf('};}',html.indexOf('return intr?v:v*ctAff(sk);',j))+3;
  const aff=html.slice(i,k);return html.replace('let BUNDO=null','var CT_ON='+on+';\n'+aff+'\nlet BUNDO=null');};
// A — с потолком по сродству (CT_ON=1); B — тот же код, но tqA=1 (потолок без сродства, как до правки)
const A=load(FILE,tr(1)),B=load(FILE,h=>tr(1)(h).replace("const tqA=sk=>tqOn()?ctAff(sk):1;","const tqA=sk=>1;"));
const ids=A.get('CLASSES').map(c=>c.id),LV=[5,15,30,60,100];const out=[];
for(const id of ids){const row={класс:id};for(const L of LV){const a=bp(A,id,L).all,b=bp(B,id,L).all;row['ур'+L]=+(a/b).toFixed(3);}out.push(row);}
console.table(out);
