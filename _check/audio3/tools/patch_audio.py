import re,io
p='D:/games/tc-wt-audio3/audio.js'
s=open(p,encoding='utf-8').read()
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(a[:60],s.count(a))
    s=s.replace(a,b)
rep("""   Живые записи (26.11) поверх синтеза — assets/audio/sfx1.mp3, sfx2.mp3 (нарезка по таблице REC), музыка боя battle.mp3:
   Kenney (kenney.nl: Impact Sounds, RPG Audio, Interface Sounds), JaggedStone, Darsycho, pauliuw (opengameart.org), «Heartfelt Battle» — request; всё CC0.""",
"""   Живые записи (26.11) поверх синтеза — assets/audio/sfx1.mp3, sfx2.mp3, sfx3.mp3 (нарезка по таблице REC), музыка боя battle.mp3,
   фоны регионов amb_cave.mp3, amb_forest.mp3, amb_wind.mp3 (петли, грузятся только своего региона):
   Kenney (kenney.nl: Impact Sounds, RPG Audio, Interface Sounds), JaggedStone (Magic Spell SFX, Loopable Dungeon Ambience), Darsycho, pauliuw,
   artisticdude (RPG Sound Pack), qubodup (Earth Element Magic Spell), FGResources (CC0 Background Ambience), Spring Spring (Birds and Wind)
   (opengameart.org), «Heartfelt Battle» — request; всё CC0. Раунд 3 — _check/audio3/СКАЧАНО.md.""")
rep("const REC={f:['sfx1.mp3','sfx2.mp3'],mk:0.05,","const REC={f:['sfx1.mp3','sfx2.mp3','sfx3.mp3'],mk:0.05,")
NEW=open('D:/games/tc-wt-audio3/_check/audio3/rec_add.txt',encoding='utf-8').read().strip()
rep("]}},BAT={f:'battle.mp3'","],"+NEW+"}},BAT={f:'battle.mp3'")
rep("const AV=4,RECST=[0,0],REC_ON={};","const AV=5,RECST=[0,0,0],REC_ON={};")
# склейка ключей с «+»: добавочные варианты к уже встроенному ключу
rep("""  for(const k in REC.k){const r=REC.k[k];if(r[0]!==sp)continue;""","""  for(const kk in REC.k){const r=REC.k[kk];if(r[0]!==sp)continue;const k=kk.replace(/\+$/,'');""")
rep("""      if(arr.length){arr.base=1;arr.loop=false;BUF[k]=arr;REC_ON[k]=1;}});}}""","""      if(arr.length){const all=kk!==k&&REC_ON[k]&&BUF[k]?BUF[k].concat(arr):arr;all.base=1;all.loop=false;BUF[k]=all;REC_ON[k]=1;}});}}""")
# фон
rep("const AMB={kind:'',lay:null,evN:{},beds:{},want:''};","""const AMB={kind:'',tag:'',lay:null,evN:{},beds:{},want:'',rec:{},recSt:{},recTry:{}};
// записи фона (26.11, раунд 3): петли амбиента; в файле [хвост 0,6 с][петля P][голова 0,6 с] — любой сдвиг декодера шва не создаёт, играем loopStart=t0, loopEnd=t0+P.
// Какой регион какой записью: пещеры и тёмные края — подземелье, леса — лес, горы, небо и лёд — ветер; остальным (болото, пепел, вулкан, мёртвый город…) — прежний синтез.
const AREC_F={cave:{f:'amb_cave.mp3',P:91.3098,t0:0.6,sr:22050},forest:{f:'amb_forest.mp3',P:41.736,t0:0.6,sr:22050},wind:{f:'amb_wind.mp3',P:15.5,t0:0.6,sr:22050}};
const AREC={cave:'cave',barrow:'cave',moans:'cave',abyss:'cave',crystal:'cave',forest:'forest',wolves:'forest',windy:'wind',sky:'wind',ice:'wind'};
const AREC_EV={cave:[['a_moan',35,70,.2]]};    // в записи подземелья свои капли — синтезные убраны
function ambRecLoad(k){const key=AREC[k];if(!key||!ctx||AMB.rec[key])return;const F=AREC_F[key],st=AMB.recSt[key]|0;if(st===1||st===3)return;AMB.recSt[key]=1;
  fetchAB(F.f).then(ab=>new Promise((ok,no)=>decodeAt(ab,F.sr,ok,no))).then(b=>{AMB.rec[key]=b;AMB.recSt[key]=2;})
   .catch(()=>{AMB.recSt[key]=3;STAT.ambErr=(STAT.ambErr|0)+1;if((AMB.recTry[key]=(AMB.recTry[key]|0)+1)<3)setTimeout(()=>{if(AMB.recSt[key]===3)AMB.recSt[key]=0;},30000);});}
function ambRecKeep(){for(const q of Object.keys(AMB.rec))if(q!==AREC[AMB.want]&&q!==AREC[AMB.kind]){delete AMB.rec[q];AMB.recSt[q]=0;}}""")
rep("""function ambTick(kind){const t=now();if(kind!==AMB.want){AMB.want=kind;if(kind)bedGen(kind);}
  if(AMB.want!==AMB.kind&&(!AMB.want||(bedBuf(AMB.want,0)&&bedBuf(AMB.want,1)))){""","""function ambTick(kind){const t=now();if(kind!==AMB.want){AMB.want=kind;if(kind&&!(AREC[kind]&&AMB.rec[AREC[kind]]))bedGen(kind);}
  if(AMB.want)ambRecLoad(AMB.want);
  const rb=AMB.want&&AREC[AMB.want]?AMB.rec[AREC[AMB.want]]:null,tag=AMB.want+(rb?'@':'');
  if(tag!==AMB.tag&&(!AMB.want||rb||(bedBuf(AMB.want,0)&&bedBuf(AMB.want,1)))){""")
rep("AMB.lay=null;AMB.kind=AMB.want;AMB.evN={};","AMB.lay=null;AMB.kind=AMB.want;AMB.tag=tag;AMB.evN={};ambRecKeep();")
rep("""g.connect(busA);const ss=[],pp=[];
      for(let i=0;i<2;i++){""","""g.connect(busA);const ss=[],pp=[];
      if(rb){const R=AREC_F[AREC[AMB.kind]],s=ctx.createBufferSource();s.buffer=rb;s.loop=true;s.loopStart=R.t0;s.loopEnd=Math.min(rb.duration,R.t0+R.P);s.connect(g);s.start(t+.02,R.t0+Math.random()*(s.loopEnd-R.t0));ss.push(s);}
      else for(let i=0;i<2;i++){""")
rep("""if(AMB.kind&&AMB.lay){const K=AMBK[AMB.kind]||{ev:[]};for(const e of K.ev){""","""if(AMB.kind&&AMB.lay){const K=AMBK[AMB.kind]||{ev:[]};for(const e of (AMB.tag.slice(-1)==='@'&&AREC_EV[AMB.kind])||K.ev){""")
rep("""const p4=document.createElement('p');p4.className='hint';p4.innerHTML='Звуки: '+a('https://kenney.nl','Kenney')+' — Impact Sounds, RPG Audio, Interface Sounds (CC0); «Magic Spell SFX» — JaggedStone, «Monster snarls» и «Big scary troll sounds» — Darsycho, «Monster or beast sounds» — pauliuw ('+a('https://opengameart.org','OpenGameArt')+', CC0). Спасибо авторам!';""",
"""const p4=document.createElement('p');p4.className='hint';p4.innerHTML='Звуки: '+a('https://kenney.nl','Kenney')+' — Impact Sounds, RPG Audio, Interface Sounds (CC0); «Magic Spell SFX» и «Loopable Dungeon Ambience» — JaggedStone, «Monster snarls» и «Big scary troll sounds» — Darsycho, «Monster or beast sounds» — pauliuw, «RPG Sound Pack» — artisticdude, «Earth Element Magic Spell» — qubodup, «CC0 Background Ambience» — FGResources, «Birds and Wind» — Spring Spring ('+a('https://opengameart.org','OpenGameArt')+', CC0). Спасибо авторам!';""")
open(p,'w',encoding='utf-8').write(s)
print('ok')
