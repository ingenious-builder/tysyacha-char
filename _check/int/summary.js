// Сводка «до/после» по res/run_base_*_z2.json и res/run_new_*_z2.json (+ длинные забеги) → res/summary.txt
const fs=require('fs'),path=require('path');const R=f=>{try{return JSON.parse(fs.readFileSync(path.join(__dirname,'res',f),'utf8'));}catch(e){return null;}};
const CL=['pyro','paladin','necro','windr','bers'],NM={pyro:'Пиромант',paladin:'Паладин',necro:'Некромант',windr:'Странник',bers:'Берсерк'};
const mm=s=>s==null?'—':(s/60).toFixed(1);const L=[];
L.push('ДО (v13.29, прежний поток стай): 10 мин игры, 5 мин в «Тихой опушке» + 5 мин в «Гнилых топях», автобой, уход из красных зон');
L.push('класс      | ур. за 10 мин | ур.20 / ур.30 (мин) | живых ср/макс | убито/мин | боссов | смертей');
for(const c of CL){const r=R('run_base_'+c+'_z2.json');if(!r)continue;
  L.push([NM[c].padEnd(10),String(r.lvl).padStart(13),(mm(Object.keys(r.lv).filter(k=>+k>=20).map(k=>r.lv[k]).sort((a,b)=>a-b)[0])+' / '+mm(Object.keys(r.lv).filter(k=>+k>=30).map(k=>r.lv[k]).sort((a,b)=>a-b)[0])).padStart(19),(r.aliveAvg+' / '+r.aliveMax).padStart(13),(r.kills/(r.sec/60)).toFixed(0).padStart(9),String(r.bosses).padStart(6),String(r.deaths).padStart(7)].join(' | '));}
L.push('');L.push('ПОСЛЕ (ход боя по краям): «Тихая опушка» и «Гнилые топи» целиком (затишье → нарастание → чемпион → 10 волн)');
L.push('класс      | край 1: мин, ур. в конце | край 2: мин, ур. в конце | живых ср/макс (в волне) | смертей (на какой волне)');
for(const c of CL){const r=R('run_new_'+c+'_z2.json');if(!r)continue;
  const ph=r.ph,d0=ph.find(p=>p.z===0&&p.p===3),z1s=ph.find(p=>p.z===1),d1=ph.find(p=>p.z===1&&p.p===3);
  const dw=r.waves.filter(w=>w.deaths).map(w=>w.z+'.'+w.w).join(',');
  L.push([NM[c].padEnd(10),((d0?mm(d0.t):'не прошёл')+', '+(d0?d0.lv:'')).padStart(24),((d1&&z1s?mm(d1.t-z1s.t):'не прошёл')+', '+(d1?d1.lv:r.lvl)).padStart(24),(r.aliveAvg+' / '+r.aliveMax+' ('+r.waveAliveAvg+' / '+r.waveAliveMax+')').padStart(23),(r.deaths+(dw?' ('+dw+')':'')).padStart(10)].join(' | '));}
L.push('');L.push('Волны (с: длительность от выхода волны до последнего врага; мин.здоровье героя; † — смерть, волна сорвана и пошла заново):');
for(const c of CL){const r=R('run_new_'+c+'_z2.json');if(!r)continue;const pick=(z,w)=>r.waves.filter(x=>x.z===z&&x.w===w).map(x=>(x.ok?'':'†')+x.t+'с '+Math.round(x.minHp*100)+'%').join(' → ')||'—';
  L.push(NM[c].padEnd(10)+' | край1: в1 '+pick(0,1)+'; в3 (босс) '+pick(0,3)+'; в6 '+pick(0,6)+'; в10 (владыка) '+pick(0,10)+' | край2: в1 '+pick(1,1)+'; в3 '+pick(1,3)+'; в10 '+pick(1,10));}
for(const f of ['long_pyro.json','long_windr.json']){const r=R(f);if(!r)continue;const at=l=>{let b=null;for(const k in r.lv)if(+k>=l&&(b==null||r.lv[k]<b))b=r.lv[k];return b;};const t=[20,30,40,50,60,70,80,90,100].map(l=>'ур.'+l+' '+mm(at(l))).join(', ');
  L.push('');L.push('Длинный забег '+NM[r.cls]+' (краи по очереди, 10 волн в каждом): '+t+' мин; смертей '+r.deaths+', боссов '+r.bosses);
  const ends=r.ph.filter(p=>p.p===3&&p.s===0).reduce((a,p)=>{if(!a.some(x=>x.z===p.z))a.push(p);return a;},[]).map(p=>'край '+(p.z+1)+' пройден на '+mm(p.t)+' мин, ур. '+p.lv);L.push(ends.join('; '));}
for(const f of fs.readdirSync(path.join(__dirname,'res')).filter(f=>f.startsWith('coopfight_'))){const r=R(f);L.push('');L.push('Вдвоём ('+r.host+' + '+r.guest+', ур. '+r.lvl+', край '+(r.z+1)+'): '+r.waves.map(w=>'в'+w.w+' '+w.sec+'с, падений '+(w.downsHost+w.downsGuest)+', мин.здоровье '+Math.round(w.minHpHost*100)+'/'+Math.round(w.minHpGuest*100)+'%, макс живых '+w.maxAlive).join('; '));}
const txt=L.join('\n');fs.writeFileSync(path.join(__dirname,'res','summary.txt'),txt);console.log(txt);
