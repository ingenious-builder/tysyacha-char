// «5-й ранг низшей против 1-го высшей»: насколько низшая на 5-м сильнее высшей на 1-м (худшие пары), «Авто» и без талантов.
const fs=require('fs'),path=require('path');const {load}=require('./lib');const [root,autoF]=process.argv.slice(2);const g=load(path.resolve(root));const A=JSON.parse(fs.readFileSync(autoF,'utf8'));
for(const L of [20,50,100,160]){const ws=[],w0=[];let cnt=0,cnt0=0,n=0,cntBig=0;
  for(const C of g.CLASSES){const lay=A[C.id][L];const ids=[...C.pool];
    for(const tal of [{},lay.tal]){g.use(C.id,L,tal);const I=g.G.get('rarInfo')();const p1={},p5={};for(const id of ids){p1[id]=g.pw(id,1);p5[id]=g.pw(id,5);}
      for(const act of [true,false])for(let r=0;r<3;r++){const lo=ids.filter(id=>g.SKILLS[id].active===act&&(I.map.get(id)|0)===r),hi=ids.filter(id=>g.SKILLS[id].active===act&&(I.map.get(id)|0)===r+1);if(!lo.length||!hi.length)continue;
        const m=Math.max(...lo.map(i=>p5[i]))/Math.min(...hi.map(i=>p1[i]));
        // доля перевёрнутых пар чар (не ступеней): сколько пар (низшая 5-й, высшая 1-й) из всех
        let inv=0,all=0;for(const a of lo)for(const b of hi){all++;if(p5[a]>p1[b])inv++;}
        if(tal===lay.tal){n++;ws.push([m,C.id,act?'акт':'пас',r,inv/all]);if(m>1)cnt++;if(m>1.15)cntBig++;}else{w0.push(m);if(m>1)cnt0++;}}}}
  ws.sort((a,b)=>b[0]-a[0]);const fr=ws.map(w=>w[4]).sort((a,b)=>a-b);
  console.log(`ур.${L}: без талантов перевёрнуто ступеней ${cnt0}, макс ×${Math.max(...w0).toFixed(3)}; «Авто» ${cnt} из ${n} (>×1,15: ${cntBig}); худшие: `+ws.slice(0,4).map(w=>`${w[1]} ${w[2]} ${w[3]}→${w[3]+1} ×${w[0].toFixed(2)} (пар чар ${Math.round(w[4]*100)}%)`).join('; ')+`; медиана доли перевёрнутых пар чар ${Math.round(fr[fr.length>>1]*100)}%`);}
