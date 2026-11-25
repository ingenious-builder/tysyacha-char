// разнообразие выбора уровня (ур. 11–60, по-настоящему показанные выборы): сколько раз одна база за 50 выборов, худшее окно 10 выборов,
// доля карт ранга и редкость карт; до/после
const {loadFull,rng}=require('./game_node.js');
for(const root of ['../../../tc-wt-rarfeel0','../..']){const G=loadFull(root);let mx=0,w10=0,rank=0,cards=0,ch=0;const rar=[0,0,0,0,0];
 G.run('LOG.rc=[];LOG.rc0=rollChoices;rollChoices=function(){const r=LOG.rc0();LOG.rc.push(r);return r;};');
 for(const cid of ['pyro','necro','monk','hunter','alch','cryo','bers','druid']){const r=rng(7);G.MathR.random=r;const C=G.get('CLASS_BY')[cid];G.set('CLS',C);const S=G.get('newChar')(C);S.autoBest=true;S.imp=[];S.mx=0;
  G.set('S',S);G.set('LEARNED',new Set(S.learned));G.set('BOOK',new Set());G.get('computeStats')();G.run('onBuildChanged();LOG.rc.length=0');
  const seq=[];for(let L=2;L<=60;L++){S.lvl=L;G.get('computeStats')();G.run('onBuildChanged();luQueue=1;luAutoRun(1);');for(let i=0;i<3;i++)G.get('learnRandom')('');
   const log=G.LOG.rc;const last=log[log.length-1];log.length=0;if(L>=11&&last){ch++;const b=[];for(const s of last){cards++;if(s.rankUp)rank++;else{b.push(s.bk);rar[G.get('rarOf')(s)]++;}}seq.push(b);}}
  const cnt={};for(const b of seq)for(const x of b)cnt[x]=(cnt[x]||0)+1;mx=Math.max(mx,...Object.values(cnt));
  for(let i=0;i+10<=seq.length;i++){const c={};for(const b of seq.slice(i,i+10))for(const x of b)c[x]=(c[x]||0)+1;w10=Math.max(w10,...Object.values(c),0);}}
 console.log(root.includes('rarfeel0')?'до   ':'после','выборов',ch,'карт',cards,'ранга',(100*rank/cards).toFixed(0)+'%','макс. одной базы за 50 выборов',mx,'худшее окно 10 выборов',w10,'редкость карт',rar.join('/'));}
