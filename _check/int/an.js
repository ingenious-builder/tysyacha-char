// Разбор прогонов wave_run (int/v1331): затишье, волны 1/3/6/10 двух краёв, уровень к 10-й волне, редкости билда (о/р/э/л/н)
const fs=require('fs'),path=require('path');const RES=path.join(__dirname,'res');
const files=process.argv.slice(2).length?process.argv.slice(2):fs.readdirSync(RES).filter(f=>/^run_new_.*\.json$/.test(f));
const LVB=[[1,20],[15,30]];
for(const f of files){const r=JSON.parse(fs.readFileSync(path.isAbsolute(f)?f:path.join(RES,f),'utf8'));
  const ph=r.ph||[],end=z=>ph.find(p=>p.z===z&&p.p===3),st=z=>ph.find(p=>p.z===z);
  const pick=(z,w)=>(r.waves||[]).filter(x=>x.z===z&&x.w===w).map(x=>(x.ok?'':'†')+x.t+'с '+Math.round(x.minHp*100)+'% ур.'+x.lv0+(x.rar?' ['+x.rar+']':'')).join(' → ')||'—';
  const c=r.calm||{};
  console.log('== '+r.cls+': '+(r.sec/60).toFixed(1)+' мин, ур. '+r.lvl+', смертей '+r.deaths+', боссов '+r.bosses+', живых ср/макс '+r.aliveAvg+'/'+r.aliveMax+', ошибок '+(r.errs||[]).length);
  console.log('  затишье края 1: '+c.t+' с, убито '+c.k+', первое убийство на '+c.firstK+' с, мин.здоровье '+Math.round((c.minHp||0)*100)+'%');
  for(const z of [0,1]){const e=end(z),s=st(z);console.log('  край '+(z+1)+' (потолок ур. '+LVB[z][1]+'): '+(e?'пройден на '+(e.t/60).toFixed(1)+' мин, ур. '+e.lv:'не пройден')+(s&&e?' (на край '+((e.t-s.t)/60).toFixed(1)+' мин)':''));
    console.log('    в1 '+pick(z,1)+' | в3 '+pick(z,3)+' | в6 '+pick(z,6)+' | в10 '+pick(z,10));}
  const deathsAt=(r.waves||[]).filter(w=>w.deaths).map(w=>(w.z+1)+'.'+w.w+'×'+w.deaths).join(' ');console.log('  смерти в волнах: '+(deathsAt||'нет'));
  console.log('  редкости билда о/р/э/л/н по минутам: '+Object.entries(r.rarAt||{}).map(([m,v])=>m+'м ур.'+v.lv+' '+v.rar).join('; ')+' | конец '+r.rarEnd);}
