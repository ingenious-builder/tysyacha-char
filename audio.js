/* «Тысяча чар» — звук (25.11).
   Всё своё: звуки, фоны регионов и музыка затишья и волн синтезируются прямо в игре (DSP на JS → AudioBuffer, WebAudio).
   Единственная чужая запись — музыка босса «Volatile Reaction», Kevin MacLeod (incompetech.com), CC BY 4.0 → assets/audio/boss.mp3.
   В index.html — только обёртки событий (блок «ЗВУК») и window.TCSND; настройки и строки «Благодарностей» этот файл ставит сам.
   В node (module.exports) — те же рецепты для проверки числами: D:/games/tc-wt-audio/_check/audio/check.js. */
(function(G){'use strict';
// =====================================================================
// DSP: генераторы, фильтры, огибающие (одинаково в браузере и в node)
// =====================================================================
const TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v;
function RNG(seed){let a=seed>>>0;return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const N=(sr,s)=>new Float32Array(Math.max(1,Math.round(sr*s)));
// кривая [[t,v],…]: экспоненциально между точками (частоты), lin — линейно
function crv(p,lin){return t=>{if(t<=p[0][0])return p[0][1];for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i];if(t<=b[0]){const k=(t-a[0])/((b[0]-a[0])||1);return lin||a[1]<=0||b[1]<=0?a[1]+(b[1]-a[1])*k:a[1]*Math.pow(b[1]/a[1],k);}}return p[p.length-1][1];};}
const ad=(a,d)=>t=>t<a?t/a:Math.exp(-(t-a)/d);          // атака + экспоненциальный спад
const ar=(a,h,r)=>t=>t<a?t/a:t<a+h?1:Math.max(0,1-(t-a-h)/r); // атака, держит, линейный хвост
const sw=(a,b,t0,t1)=>t=>t<=t0?a:t>=t1?b:a+(b-a)*(t-t0)/(t1-t0);
function blep(t,dt){if(t<dt){t/=dt;return t+t-t*t-1;}if(t>1-dt){t=(t-1)/dt;return t*t+t+t+1;}return 0;}
// осциллятор: sin|saw|sq|tri, f — Гц или t→Гц, a — амплитуда; t0/dur — где звучит; ph — начальная фаза (0..1)
function osc(x,sr,type,f,a,t0,dur,ph){const i0=Math.max(0,Math.round((t0||0)*sr)),n=Math.min(x.length,dur?i0+Math.round(dur*sr):x.length);
  const fF=typeof f==='function';let fv=fF?f(0):f,p=ph||0;a=a==null?1:a;
  for(let i=i0;i<n;i++){if(fF&&((i-i0)&15)===0)fv=f((i-i0)/sr);const dt=fv/sr;p+=dt;p-=Math.floor(p);let s;
    if(type==='sin')s=Math.sin(TAU*p);else if(type==='saw')s=2*p-1-blep(p,dt);else if(type==='sq'){let q=p+.5;q-=Math.floor(q);s=(p<.5?1:-1)+blep(p,dt)-blep(q,dt);}else s=1-4*Math.abs(p-.5);
    x[i]+=s*a;}
  return x;}
// умножить на огибающую fn(t) (t от t0); между узлами по 8 отсчётов — линейно, без ступенек
function E(x,sr,fn,t0){const i0=Math.round((t0||0)*sr);for(let i=0;i<Math.min(i0,x.length);i++)x[i]*=fn(0);let v0=fn(0);
  for(let i=Math.max(0,i0);i<x.length;i+=8){const v1=fn((i+8-i0)/sr),m=Math.min(8,x.length-i);for(let j=0;j<m;j++)x[i+j]*=v0+(v1-v0)*j/8;v0=v1;}return x;}
// биквад (RBJ, TDF-II): lp|hp|bp|pk; f — Гц или t→Гц
function bq(x,sr,type,f,q,gain){const fF=typeof f==='function';let b0,b1,b2,a1,a2,z1=0,z2=0;q=q||.707;
  const set=fc=>{fc=clamp(fc,15,sr*.45);const w=TAU*fc/sr,c=Math.cos(w),s=Math.sin(w),al=s/(2*q);let B0,B1,B2,A0=1+al,A1=-2*c,A2=1-al;
    if(type==='lp'){B1=1-c;B0=B2=B1/2;}else if(type==='hp'){B1=-(1+c);B0=B2=(1+c)/2;}else if(type==='bp'){B0=al;B1=0;B2=-al;}
    else{const A=Math.pow(10,(gain||0)/40);B0=1+al*A;B1=-2*c;B2=1-al*A;A0=1+al/A;A2=1-al/A;}
    b0=B0/A0;b1=B1/A0;b2=B2/A0;a1=A1/A0;a2=A2/A0;};
  set(fF?f(0):f);
  for(let i=0;i<x.length;i++){if(fF&&(i&15)===0)set(f(i/sr));const v=x[i],y=b0*v+z1;z1=b1*v-a1*y+z2;z2=b2*v-a2*y;x[i]=y;}return x;}
// фильтр состояний (TPT SVF) — для резонансных проходов; bp — с единичным пиком
function svf(x,sr,mode,f,q){const fF=typeof f==='function',k=1/(q||.707);let g,a1,a2,a3,c1=0,c2=0;
  const set=fc=>{fc=clamp(fc,15,sr*.45);g=Math.tan(Math.PI*fc/sr);a1=1/(1+g*(g+k));a2=g*a1;a3=g*a2;};set(fF?f(0):f);
  for(let i=0;i<x.length;i++){if(fF&&(i&15)===0)set(f(i/sr));const v0=x[i],v3=v0-c2,v1=a1*c1+a2*v3,v2=c2+a2*c1+a3*v3;c1=2*v1-c1;c2=2*v2-c2;
    x[i]=mode==='lp'?v2:mode==='bp'?k*v1:mode==='hp'?v0-k*v1-v2:v0-k*v1;}return x;}
function lp1(x,sr,f){const a=1-Math.exp(-TAU*f/sr);let y=0;for(let i=0;i<x.length;i++){y+=a*(x[i]-y);x[i]=y;}return x;}
function hp1(x,sr,f){const a=Math.exp(-TAU*f/sr);let y=0,p=0;for(let i=0;i<x.length;i++){const v=x[i];y=a*(y+v-p);p=v;x[i]=y;}return x;}
function W(sr,d,r){const x=N(sr,d);for(let i=0;i<x.length;i++)x[i]=r()*2-1;return x;}
function PK(sr,d,r){const x=N(sr,d);let b0=0,b1=0,b2=0;for(let i=0;i<x.length;i++){const w=r()*2-1;b0=.99765*b0+w*.099046;b1=.963*b1+w*.2965164;b2=.57*b2+w*1.0526913;x[i]=(b0+b1+b2+w*.1848)*.25;}return x;}
function BR(sr,d,r){const x=N(sr,d);let l=0;for(let i=0;i<x.length;i++){l=(l+.02*(r()*2-1))/1.02;x[i]=l*3.5;}return x;}
function pk(x){let m=0;for(let i=0;i<x.length;i++){const a=Math.abs(x[i]);if(a>m)m=a;}return m;}
function nz(x,p){const m=pk(x);if(m>0){const k=(p||1)/m;for(let i=0;i<x.length;i++)x[i]*=k;}return x;}
const base=(sr,d,first)=>{const x=N(sr,d);add(x,first);return x;};
// слой докладывается с мягким концом (последние 128 отсчётов): обрезанный хвост слоя не щёлкает
function add(d,s,g,t0,sr){const i0=Math.round((t0||0)*(sr||1));g=g==null?1:g;const n=Math.min(s.length,d.length-i0),F=Math.min(128,s.length>>2),f0=s.length-F;
  for(let i=Math.max(0,-i0);i<n;i++)d[i+i0]+=s[i]*g*(i>=f0?.5+.5*Math.cos(Math.PI*(i-f0)/F):1);return d;}
function drv(x,k){const t=Math.tanh(k);for(let i=0;i<x.length;i++)x[i]=Math.tanh(k*x[i])/t;return x;}
// плавный шум 0..1 (порывы, дыхание): узлы с частотой rate Гц, косинусная интерполяция
function smooth(r,L,rate){const n=Math.ceil(L*rate)+3,v=[];for(let i=0;i<n;i++)v.push(r());return t=>{const p=t*rate,i=Math.floor(p),f=p-i,k=(1-Math.cos(Math.PI*f))/2;return v[i%n]*(1-k)+v[(i+1)%n]*k;};}
// окно-«бульк»: синус с окном Ханна, частота f→f1
function blip(x,sr,f,t0,dur,a,f1){const i0=Math.round(t0*sr),n=Math.round(dur*sr);let p=0;for(let j=0;j<n&&i0+j<x.length;j++){const k=j/n,fr=f1?f*Math.pow(f1/f,k):f;p+=fr/sr;x[i0+j]+=Math.sin(TAU*p)*a*(.5-.5*Math.cos(TAU*k));}return x;}
// сумма гармоник [[кратность, громкость, спад (с), атака]]
function parts(x,sr,f,P,t0,g,dk){const i0=Math.round((t0||0)*sr);g=g==null?1:g;dk=dk||1;
  for(const p of P){const fr=f*p[0];if(fr>sr*.45)continue;const w=TAU*fr/sr;let ph=p[4]||0,a=p[1]*g;const k=Math.exp(-1/(p[2]*dk*sr)),at=Math.max(1,Math.round((p[3]||.002)*sr));
    for(let i=i0,j=0;i<x.length;i++,j++){x[i]+=Math.sin(ph)*a*(j<at?j/at:1);ph+=w;a*=k;if(a<2e-5)break;}}return x;}
// треск: n щелчков шума (len — длина, мс) между t0 и t1
function crk(x,sr,r,n,t0,t1,len,amp){const at=Math.max(2,Math.round(.0003*sr));for(let k=0;k<n;k++){const t=t0+(t1-t0)*Math.pow(r(),1.3),i0=Math.round(t*sr),L=Math.round((len||2)*(.5+r())*sr/1000),a=(amp||1)*(.35+.65*r());
  for(let j=0;j<L&&i0+j<x.length;j++)x[i0+j]+=(r()*2-1)*a*Math.exp(-4*j/L)*Math.min(1,j/at);}return x;}
// ревербератор (Freeverb, моно): rt — время затухания (с), wet — доля хвоста; возвращает массив длиннее на хвост
function verb(x,sr,rt,wet,damp){const tail=Math.round(rt*sr*.9),n=x.length+tail,y=new Float32Array(n),sc=sr/44100;damp=damp==null?.3:damp;
  const C=[1116,1188,1277,1356,1422,1491].map(v=>{const l=Math.round(v*sc);return {b:new Float32Array(l),i:0,f:0,fb:Math.pow(10,-3*(l/sr)/rt)};}),A=[556,441,341].map(v=>({b:new Float32Array(Math.round(v*sc)),i:0}));
  const w=new Float32Array(n);
  for(let i=0;i<n;i++){const v=(i<x.length?x[i]:0)*.05;let s=0;
    for(const c of C){const o=c.b[c.i];c.f=o*(1-damp)+c.f*damp;c.b[c.i]=v+c.f*c.fb;if(++c.i>=c.b.length)c.i=0;s+=o;}
    for(const a of A){const o=a.b[a.i];a.b[a.i]=s+o*.5;s=o-s;if(++a.i>=a.b.length)a.i=0;}
    w[i]=s;}
  const kx=pk(x)||1,kw=pk(w)||1,fd=Math.min(x.length,Math.round(.015*sr)),f0=x.length-fd;
  for(let i=0;i<n;i++)y[i]=(i<x.length?x[i]*(i>=f0?.5+.5*Math.cos(Math.PI*(i-f0)/fd):1):0)+w[i]*wet*kx/kw;return y;}
// Карплус-Стронг: щипок струны; возвращает и точную высоту (sr/(L+0.5))
function pluck(sr,f,dur,r,damp,br){const L=Math.max(4,Math.round(sr/f-.5)),b=new Float32Array(L),x=N(sr,dur);
  let pv=0;for(let i=0;i<L;i++){pv=pv*.5+(r()*2-1)*.5;b[i]=pv;}
  damp=damp||.996;br=br==null?.5:br;let j=0;for(let i=0;i<x.length;i++){const k=j+1<L?j+1:0,v=b[j];x[i]=v;b[j]=damp*(br*v+(1-br)*b[k]);j=k;}
  return {x,base:sr/(L+.5)};}
// петля без щелчка: массив длиной L+xf, хвост xf накладывается на начало (равная мощность)
function loopify(x,sr,L,xf){const n=Math.round(L*sr),f=Math.min(Math.round(xf*sr),x.length-n),y=x.slice(0,n);
  for(let i=0;i<f;i++){const k=i/f;y[i]=x[i]*Math.sin(k*Math.PI/2)+x[n+i]*Math.cos(k*Math.PI/2);}return y;}
// формантный фильтр: параллельные полосы [[Гц, Q, громкость]]
function fmt(x,sr,F){const y=new Float32Array(x.length);for(const f of F){const c=x.slice();bq(c,sr,'bp',f[0],f[1]);add(y,c,f[2]);}return y;}
// готовый звук: без постоянной составляющей, хвост до тишины, мягкие края, пик −1,5 дБ
function fin(x,sr,o){o=o||{};hp1(x,sr,o.hp||22);const m=pk(x);if(!(m>0))return new Float32Array(Math.round(sr*.01));
  let end=x.length;const th=m*Math.pow(10,-64/20);while(end>1&&Math.abs(x[end-1])<th)end--;end=Math.min(x.length,end+Math.round(.01*sr));
  const y=x.slice(0,end),fi=Math.round((o.fi||.0012)*sr),w=Math.min(y.length,Math.round(.03*sr));let e=0;for(let i=y.length-w;i<y.length;i++)e+=y[i]*y[i];
  // звук к концу массива ещё звучит — долгий мягкий спад (до 25 % длины, ≤ 0,25 с), иначе короткий
  const fo=Math.sqrt(e/w)/m>.0056?Math.min(Math.round(y.length*.25),Math.round(.25*sr)):Math.min(Math.round((o.fo||.012)*sr),y.length>>1);
  for(let i=0;i<fi&&i<y.length;i++)y[i]*=i/fi;for(let i=0;i<fo;i++)y[y.length-1-i]*=.5-.5*Math.cos(Math.PI*i/fo);
  return nz(y,o.peak||.84);}

// ---------- общие куски звуков ----------
const BELL=[[1,1,.6],[2,.42,.35],[3,.22,.22],[4.2,.12,.14],[5.4,.06,.1]];
const CHIME=[[1,1,1],[2.76,.38,.55],[5.4,.18,.3],[8.93,.08,.18]];
const GLASS=[[1,1,.22],[1.49,.6,.16],[2.33,.42,.12],[3.11,.28,.08],[4.2,.15,.06]];
const CHURCH=[[.5,.55,3.2],[1,1,2.4],[1.19,.45,2],[1.5,.35,1.6],[2,.3,1.2],[2.5,.18,.9],[2.98,.16,.7],[4.07,.08,.4]];
const mtf=m=>440*Math.pow(2,(m-69)/12);
function whoosh(sr,r,d,f0,f1,q,a,dk){const x=W(sr,d,r);svf(x,sr,'bp',crv([[0,f0],[d*.55,f1],[d,f1*.8]]),q||1.2);E(x,sr,ad(a||.03,dk||d*.35));return nz(x);}
function thud(sr,d,f0,f1,dk){const x=N(sr,d);osc(x,sr,'sin',crv([[0,f0],[Math.min(.12,d*.6),f1]]),1);E(x,sr,ad(.002,dk||.09));return x;}
function noiseHit(sr,r,d,type,f,q,a,dk){const x=W(sr,d,r);bq(x,sr,type,f,q||.8);E(x,sr,ad(a||.0008,dk||.03));return nz(x);}
function bells(sr,d,notes,P,dt,g,dk){const x=N(sr,d);notes.forEach((m,i)=>parts(x,sr,mtf(m),P||BELL,i*(dt||0),g==null?1:g,dk));return x;}
// синтетическая медь (рог, фанфары): пила ×3 со сдвигом, фильтр раскрывается на атаке, вибрато
function brass(sr,d,f,o){o=o||{};const x=N(sr,d),vib=t=>1+(t>.3?.006*Math.sin(TAU*5.3*t)*Math.min(1,(t-.3)*3):0),sc=t=>t<.08?.94+.06*t/.08:1;
  for(const c of [-5,0,5])osc(x,sr,'saw',t=>f*sc(t)*vib(t)*Math.pow(2,c/1200)*(o.fall&&t>d-o.fall?Math.pow(.94,(t-(d-o.fall))/o.fall):1),.3);
  osc(x,sr,'sin',f/2,.25);svf(x,sr,'lp',crv([[0,280],[.09,o.br||2200],[.4,(o.br||2200)*.6],[d,(o.br||2200)*.45]]),1.1);E(x,sr,ar(o.a||.07,d-(o.a||.07)-(o.r||.35),o.r||.35));return x;}
function notesBrass(sr,seq,o){let d=0;for(const s of seq)d=Math.max(d,s[0]+s[2]);const x=N(sr,d+.05);for(const s of seq)add(x,nz(brass(sr,s[2],mtf(s[1]),o)),s[3]==null?1:s[3],s[0],sr);return x;}
function taiko(sr,r,f){const x=N(sr,.9);osc(x,sr,'sin',crv([[0,f*1.7],[.14,f]]),1);E(x,sr,ad(.002,.32));const b=N(sr,.3);osc(b,sr,'sin',crv([[0,f*2.9],[.1,f*1.8]]),.45);E(b,sr,ad(.001,.08));add(x,b);
  add(x,noiseHit(sr,r,.08,'lp',1100,.7,.0005,.022),.45);
  // кожа и палка: мембрана 300–600 Гц и щелчок — барабан слышен и на динамике телефона
  add(x,body(sr,.5,f*1.7,f,.32,[[3,1,.5],[4,.75,.4],[5,.5,.3]]),.8);add(x,noiseHit(sr,r,.16,'bp',460,1.1,.0006,.06),.6);add(x,smack(sr,r,1500,.012),.25);return drv(nz(x),1.4);}
function roar(sr,r,d,f0c,o){o=o||{};const x=N(sr,d),j=smooth(r,d,9);osc(x,sr,'saw',t=>f0c(t)*(1+.05*(j(t)-.5)),.7);add(x,W(sr,d,r),o.nz||.55);
  E(x,sr,t=>.62+.38*Math.sin(TAU*(o.am||29)*t+3*Math.sin(t*7.3)));const y=fmt(x,sr,o.F||[[640,5,1],[1080,6,.65],[2450,8,.32]]);lp1(y,sr,3600);drv(nz(y),o.drv||2.4);
  osc(y,sr,'sin',t=>f0c(t)/2,.35);E(y,sr,o.env||ar(.14,d-.75,.6));return y;}
// электрический треск: пила со скачущей высотой и рваная полоса шума; скачки сглажены (~1,5 мс) — треск без цифровых щелчков
function zap(sr,r,d,f){const x=N(sr,d),n=W(sr,d,r);bq(n,sr,'bp',2800,1.2);let p=0,fc=f,ft=f,a=1,at=1,g=1,gt=1,nx=0,ng=0;const k=1-Math.exp(-1/(.0015*sr));
  for(let i=0;i<x.length;i++){if(i>=nx){ft=f*(.6+r()*1.4);at=r()<.25?.08:1;nx=i+Math.round((.006+r()*.014)*sr);}if(i>=ng){gt=r()<.35?.15:1;ng=i+Math.round(.007*sr);}
    fc+=(ft-fc)*k;a+=(at-a)*k;g+=(gt-g)*k;const dt=fc/sr;p+=dt;p-=Math.floor(p);x[i]=(2*p-1-blep(p,dt))*a+n[i]*g*.8;}
  lp1(x,sr,9000);return drv(nz(x),2);}
function bubbles(x,sr,r,n,t0,t1,f0,f1,a){for(let k=0;k<n;k++){const t=t0+(t1-t0)*r(),f=f0*(.8+.5*r());blip(x,sr,f,t,.03+r()*.03,(a||1)*(.5+.5*r()),f*(f1||2.6));}return x;}
function shatter(sr,r,d,n){const x=N(sr,d);for(let k=0;k<n;k++){const f=1800+r()*7000,t=Math.pow(r(),2)*d*.35;parts(x,sr,f,[[1,.5+.5*r(),.03+r()*.1],[1.7,.3,.04]],t,.6);}
  add(x,noiseHit(sr,r,.25,'hp',3500,.7,.0005,.05),.6);return x;}
// слой для динамика телефона: суб ниже ~150 Гц iPhone почти не играет — гармоники того же тона (2–4 и выше, 150–600 Гц) слышны и на нём.
// H — [[кратность, громкость, доля спада]]; тон идёт той же кривой, что у thud (f0 → f1)
function body(sr,d,f0,f1,dk,H){const x=N(sr,d),fc=crv([[0,f0],[Math.min(.12,d*.6),f1]]);
  for(const h of H||[[2,1,.7],[3,.6,.5],[4,.35,.35]]){const y=N(sr,d);osc(y,sr,'sin',t=>fc(t)*h[0],1);E(y,sr,ad(.002,(dk||.09)*h[2]));add(x,y,h[1]);}return nz(x);}
// хлёсткая атака 1–3 кГц: удар «щёлкает» и на маленьком динамике
const smack=(sr,r,f,dk)=>noiseHit(sr,r,.07,'bp',f||1800,.8,.0004,dk||.012);

// =====================================================================
// РЕЦЕПТЫ: имя → {f:(sr,rnd,вариант)→Float32Array|{x,base}, v: вариантов, d: о звуке}
// =====================================================================
const L={};
const def=(n,d,f,v,crack)=>{L[n]={f,v:v||1,d,crk:!!crack};};   // crack — треск задуман (огонь, камни, гром): резкие всплески — часть звука
// ---------- интерфейс ----------
def('ui_click','мягкий деревянный «ток» кнопки',(sr,r)=>{const x=N(sr,.07);osc(x,sr,'sin',crv([[0,1650],[.03,1050]]),1);E(x,sr,ad(.0008,.015));add(x,noiseHit(sr,r,.02,'bp',3400,1.4,.0003,.004),.3);return x;});
def('ui_book','шорох страниц и мягкий удар обложки, тихий звон',(sr,r)=>{const x=base(sr,.75,whoosh(sr,r,.34,1500,3400,.8,.04,.12));add(x,nz(thud(sr,.15,130,70,.05)),.5,.02,sr);add(x,nz(bells(sr,.6,[88,95],BELL,.05,1,.6)),.13,.1,sr);return x;});
def('ui_bookc','короткий шорох и хлопок обложки',(sr,r)=>{const x=base(sr,.3,whoosh(sr,r,.2,2600,1500,.8,.02,.06));add(x,nz(thud(sr,.14,110,60,.04)),.7,.09,sr);add(x,noiseHit(sr,r,.03,'lp',900,.7,.0005,.008),.3,.09,sr);return x;});
def('ui_lu','мерцающий подъём аккорда — окно выбора чар',(sr,r)=>{const x=N(sr,1.1);[84,88,91,96,100].forEach((m,i)=>osc(x,sr,'sin',mtf(m),.2,i*.03));E(x,sr,t=>ad(.22,.4)(t)*(.75+.25*Math.sin(TAU*7*t)));const n=W(sr,1,r);bq(n,sr,'hp',5500,.7);E(n,sr,ad(.25,.2));add(x,nz(n),.08);return x;});
def('ui_pick','два колокольчика вверх на квинту — карта выбрана',(sr,r)=>{const x=bells(sr,.9,[79,86],BELL,.075,1,.8);add(x,nz(bells(sr,.5,[98],GLASS,0,1,.6)),.18,.08,sr);return x;});
def('ui_lvl','восходящее арпеджио и блеск — новый уровень',(sr,r)=>{const x=bells(sr,1.4,[72,76,79,84,88],BELL,.06,1,1.3);add(x,whoosh(sr,r,.5,700,5200,1.4,.25,.15),.22);add(x,nz(bells(sr,1,[96,100,103],GLASS,.04,1,2.5)),.2,.3,sr);return verb(x,sr,1.4,.25);});
def('ui_slot','торжественный аккорд — открыт слот',(sr,r)=>{const x=bells(sr,1.6,[76,80,83,88],CHIME,0,1,1);add(x,nz(bells(sr,1.6,[52],CHURCH,0,1,.6)),.35);add(x,nz(bells(sr,.8,[100,104,107],GLASS,.05,1,2)),.15,.12,sr);return verb(x,sr,1.5,.28);});
def('ui_rar2','фиолетовые искры — эпическая чара',(sr,r)=>{const x=bells(sr,1.1,[81,84,88,93],BELL,.045,1,.9);add(x,whoosh(sr,r,.4,2500,7000,1.2,.15,.12),.12);return verb(x,sr,1.1,.22);});
def('ui_rar3','золотые фанфары и колокола — легендарная',(sr,r)=>{const x=base(sr,2,nz(notesBrass(sr,[[0,62,.5,.8],[0,66,.5,.6],[0,69,.5,.6],[.18,74,1.1,1]],{br:2600})));add(x,nz(bells(sr,1.8,[86,90,93,98],CHIME,.06,1,1.2)),.55,.15,sr);
  add(x,nz(thud(sr,.6,110,55,.25)),.4);add(x,whoosh(sr,r,.8,3000,8000,1,.4,.2),.1,.1,sr);return verb(x,sr,1.8,.3);});
def('ui_rar4','чёрное пламя: суб-удар, тритон, рёв огня — «Невозможная»',(sr,r)=>{const d=2.4,x=N(sr,d);osc(x,sr,'sin',crv([[0,70],[.5,30]]),.32);E(x,sr,ad(.003,.55));
  const b=N(sr,d);parts(b,sr,mtf(36),[[1,1,1.4],[2.01,.5,.8],[2.97,.3,.5]],.05);parts(b,sr,mtf(42),[[1,.8,1.3],[2.02,.4,.7]],.05);parts(b,sr,mtf(49),[[1,.4,1]],.05);add(x,nz(b),.42);
  const f=W(sr,d,r);lp1(f,sr,380);lp1(f,sr,600);hp1(f,sr,170);const fl=smooth(r,d,18);E(f,sr,t=>sw(0,1,0,.5)(t)*Math.exp(-Math.max(0,t-.5)/.7)*(.4+.6*fl(t)));add(x,nz(f),.7);
  const sws=W(sr,.5,r);bq(sws,sr,'hp',2500,.7);E(sws,sr,t=>Math.pow(t/.5,3));add(x,nz(sws),.12);
  // тёмная медь тритоном (ре и соль-диез большой октавы) и рёв пламени 250–800 Гц — тяжело и громче легендарной на любом динамике
  add(x,nz(notesBrass(sr,[[0,38,1.9,1],[0,44,1.9,.85],[0,50,1.9,.5]],{br:1100,a:.05,r:.9})),1.6,.02,sr);
  add(x,nz(roar(sr,r,1.6,crv([[0,58],[.35,76],[1.6,44]]),{F:[[290,4,1],[480,5,.75],[850,6,.4]],am:21,nz:.8,drv:2.2,env:ad(.06,.6)})),1.5,.03,sr);
  const fr=W(sr,2,r);svf(fr,sr,'bp',t=>850+450*fl(t),.8);E(fr,sr,t=>ad(.08,.6)(t)*(.3+.7*fl(t)));add(x,nz(fr),1.4,.03,sr);const k=N(sr,d);crk(k,sr,r,30,.05,1.4,3);bq(k,sr,'bp',1100,.9);add(x,nz(k),.25);return drv(verb(x,sr,2,.3),1.3);},1,1);
def('ui_impw','зловещий подъём и удар — Невозможное пробудилось',(sr,r)=>{const d=3,x=N(sr,d);const s=W(sr,1.4,r);bq(s,sr,'bp',crv([[0,600],[1.4,4000]]),1);E(s,sr,t=>Math.pow(t/1.4,2.5));add(x,nz(s),.4);
  const b=N(sr,1.6);osc(b,sr,'sin',crv([[0,62],[.6,28]]),1);E(b,sr,ad(.003,.5));add(x,nz(b),1,1.4,sr);const c=N(sr,1.6);parts(c,sr,mtf(38),[[1,1,1.2],[2.01,.4,.7]]);parts(c,sr,mtf(44),[[1,.8,1.1]]);add(x,nz(c),.5,1.4,sr);return verb(x,sr,2.2,.3);});
def('chest','скрип крышки, щелчок замка и россыпь сокровищ',(sr,r)=>{const d=1.6,x=N(sr,d);const c=N(sr,.45);let t=0;while(t<.4){const i=Math.round(t*sr);if(i<c.length)c[i]+=1;t+=1/(35+t*80);}bq(c,sr,'bp',850,6);lp1(c,sr,2500);E(c,sr,ar(.05,.25,.1));add(x,nz(c),.5);
  add(x,noiseHit(sr,r,.04,'bp',2600,6,.0003,.01),.6,.42,sr);add(x,noiseHit(sr,r,.04,'bp',2100,6,.0003,.01),.5,.47,sr);
  const s=N(sr,1.1);for(let k=0;k<14;k++)parts(s,sr,2000+r()*4500,GLASS,r()*.7,.3+.4*r());add(x,nz(s),.45,.45,sr);add(x,nz(bells(sr,1,[84,88,91],CHIME,.05,1,.8)),.35,.5,sr);return verb(x,sr,1.2,.2);},1,1);
def('ess','хрустальный звон — эссенция',(sr,r)=>{const x=N(sr,.4);parts(x,sr,2637*(1+r()*.02),[[1,1,.12],[2.76,.3,.06]]);parts(x,sr,3520,[[1,.6,.1]],.035);return x;},2);
def('ess_big','звон кристаллов — разбор чары в эссенцию',(sr,r)=>{const x=N(sr,.8);for(let k=0;k<5;k++)parts(x,sr,1800+r()*2600,CHIME,k*.04,.5,.4);return x;});
def('scroll','шорох свитка и колокольчик',(sr,r)=>{const x=base(sr,.7,whoosh(sr,r,.22,1800,3600,.9,.03,.08));add(x,nz(bells(sr,.6,[81,88],BELL,.06,1,.6)),.5,.05,sr);return x;});
def('portal','магический вихрь — выход открыт',(sr,r)=>{const d=1.8,x=W(sr,d,r);svf(x,sr,'bp',t=>900+600*Math.sin(TAU*1.6*t)+t*500,2.5);E(x,sr,t=>ar(.4,.8,.6)(t)*(.7+.3*Math.sin(TAU*6*t)));nz(x);
  const p=N(sr,d);[69,73,76,81].forEach((m,i)=>osc(p,sr,'sin',mtf(m),.25,i*.12));E(p,sr,ar(.5,.7,.6));add(x,nz(p),.6);return verb(x,sr,1.6,.3);});
def('peer_in','дружелюбные два звона вверх — напарник подключился',(sr,r)=>{const x=bells(sr,.9,[72,77],[[1,1,.45],[4,.25,.1],[10,.06,.03]],.11);return x;});
def('peer_out','два звона вниз — напарник ушёл',(sr,r)=>bells(sr,.8,[77,72],[[1,1,.35],[4,.2,.08]],.13));
// у каждой ноты своя огибающая от её начала (атака 6 мс, спад 12 мс), треугольник с фазы 0,25 — нота стартует с нуля: щелчков нет
def('peer_down','тревога: три пары тонов — напарник упал',(sr,r)=>{const x=N(sr,.9);for(let k=0;k<3;k++)for(const [f,t0] of [[988,k*.27],[740,k*.27+.13]]){const y=N(sr,.12);osc(y,sr,'tri',f,.5,0,0,.25);E(y,sr,t=>Math.min(1,t/.006,Math.max(0,(.12-t)/.012)));add(x,y,1,t0,sr);}
  lp1(x,sr,3200);return x;});
def('revive','восходящий светлый аккорд — поднялся',(sr,r)=>{const x=bells(sr,1.4,[69,73,76,81,85],BELL,.07,1,1.2);add(x,whoosh(sr,r,.7,500,4500,1.2,.4,.2),.2);return verb(x,sr,1.3,.25);});
def('heal','мягкий восходящий звон — лечение',(sr,r)=>{const x=N(sr,.8);osc(x,sr,'sin',crv([[0,660],[.25,990]]),.6);osc(x,sr,'sin',crv([[0,1320],[.25,1980]]),.2);E(x,sr,ad(.06,.25));add(x,nz(bells(sr,.6,[93,96],GLASS,.05,1,2)),.15,.12,sr);return x;});
def('heart','глухое двойное сердцебиение — мало здоровья',(sr,r)=>{const x=N(sr,.45),b=(f0,f1)=>{const y=nz(thud(sr,.2,f0,f1,.05));add(y,body(sr,.2,f0,f1*1.35,.05,[[3,.8,1],[4,1,.9],[5,.6,.7],[6,.35,.5]]),1.2);return y;};
  add(x,b(70,45));add(x,b(62,42),.7,.17,sr);lp1(x,sr,900);return x;});
def('hurt','глухой удар по герою',(sr,r)=>{const x=thud(sr,.25,95,45,.09);nz(x,.8);add(x,body(sr,.25,95,70,.09,[[2,.8,.9],[3,1,.75],[4,.7,.6],[5,.4,.45]]),1);add(x,smack(sr,r,1400,.02),.4);
  add(x,noiseHit(sr,r,.08,'lp',1800,.7,.0008,.035),.5);const g=N(sr,.16);osc(g,sr,'saw',crv([[0,145],[.15,105]]),1);
  const gf=fmt(g,sr,[[520,4,1],[950,5,.5]]);E(gf,sr,ad(.012,.05));add(x,nz(gf),.4,.01,sr);return drv(x,1.6);},2);
def('die','падение героя: удар и уходящий вниз тон',(sr,r)=>{const d=1.8,x=base(sr,1.9,nz(thud(sr,.5,90,35,.25)));const t=N(sr,d);osc(t,sr,'sin',crv([[0,330],[1.4,70]]),.6);osc(t,sr,'tri',crv([[0,165],[1.4,35]]),.3);E(t,sr,ad(.02,.6));add(x,nz(t),.5,.05,sr);
  const rb=BR(sr,1.2,r);lp1(rb,sr,250);E(rb,sr,ad(.02,.35));add(x,nz(rb),.35);return verb(x,sr,1.8,.3);});
def('shield_hit','звон щита, поглотившего удар',(sr,r)=>{const x=N(sr,.3);parts(x,sr,1800*(1+r()*.05),[[1,1,.08],[1.44,.6,.06],[2.28,.4,.04]]);add(x,noiseHit(sr,r,.03,'hp',3000,.7,.0005,.006),.25);return x;},2);
def('shield_break','щит раскалывается: стекло и глухой выдох',(sr,r)=>{const x=shatter(sr,r,.7,30);nz(x);add(x,nz(thud(sr,.3,120,50,.12)),.6);return x;});
// ---------- удары героя ----------
def('sw_light','лёгкий быстрый взмах (кинжалы, кулаки)',(sr,r)=>whoosh(sr,r,.15,900,4300,1.5,.022,.045),2);
def('sw_blade','взмах клинка с лёгким звоном',(sr,r)=>{const x=whoosh(sr,r,.2,600,2900,1.25,.03,.06);parts(x,sr,3100+r()*400,[[1,.1,.06],[1.5,.05,.04]],.05);return x;},2);
def('sw_heavy','тяжёлый взмах танка',(sr,r)=>{const x=whoosh(sr,r,.3,240,1250,1,.05,.09);const b=N(sr,.3);osc(b,sr,'sin',crv([[0,70],[.2,95]]),1);E(b,sr,ad(.08,.08));add(x,nz(b),.4);return x;},2);
def('bow','тетива и свист стрелы',(sr,r)=>{const p=pluck(sr,150+r()*30,.25,r,.985,.45).x;E(p,sr,ad(.001,.07));const x=nz(p);add(x,noiseHit(sr,r,.02,'hp',2200,.7,.0003,.004),.4);add(x,whoosh(sr,r,.14,2600,1300,1.6,.02,.05),.45,.03,sr);return x;},2);
def('wand','волшебный выстрел: свист вниз с искрой',(sr,r)=>{const x=N(sr,.2);let p=0;const f=crv([[0,1700+r()*300],[.09,650]]);for(let i=0;i<x.length;i++){const t=i/sr,fc=f(t);p+=fc/sr;x[i]=Math.sin(TAU*p+2.2*Math.exp(-t/.05)*Math.sin(TAU*p*3));}
  E(x,sr,ad(.003,.045));add(x,noiseHit(sr,r,.02,'bp',2600,1,.0005,.008),.3);return x;},2);
def('hit_f','мясистый удар в ближнем бою',(sr,r)=>{const f0=140+r()*20,x=thud(sr,.2,f0,55,.06);nz(x,.65);add(x,body(sr,.2,f0,90,.06,[[2,.8,1.1],[3,1,.9],[4,.7,.7],[5,.4,.5]]),1.3);add(x,smack(sr,r,1700,.035),1.3);add(x,noiseHit(sr,r,.07,'lp',2200,.7,.0005,.025),.55);add(x,noiseHit(sr,r,.004,'hp',2000,.7,.0002,.0008),.25);return drv(x,1.8);},2);
def('hit_p','лёгкое попадание снаряда',(sr,r)=>{const x=thud(sr,.13,300,120,.03);nz(x);add(x,noiseHit(sr,r,.05,'bp',2000,.9,.0005,.02),.6);return x;},2);
def('crit','крит: резкий щелчок и звон',(sr,r)=>{const x=base(sr,.22,noiseHit(sr,r,.03,'hp',3000,.7,.0002,.008));add(x,nz(thud(sr,.15,180,60,.05)),.7);parts(x,sr,2400,[[1,.5,.09],[1.54,.4,.07]],.002);return drv(x,1.5);});
// ---------- попадания стихий (у каждой свой тембр) ----------
def('h_fire','огонь: треск и вспышка пламени',(sr,r)=>{const d=.32,x=N(sr,d);crk(x,sr,r,26,0,.24,2.2);hp1(x,sr,1500);nz(x);const f=W(sr,d,r);lp1(f,sr,900);lp1(f,sr,1400);E(f,sr,ad(.006,.1));add(x,nz(f),.7);add(x,nz(thud(sr,.2,110,50,.07)),.35);return x;},2,1);
def('h_ice','лёд: хруст и стеклянный звон',(sr,r)=>{const x=base(sr,.4,noiseHit(sr,r,.06,'hp',2600,.7,.0004,.02));const s=N(sr,.35);[2093,3136,4186,5274,6645].forEach((f,i)=>parts(s,sr,f*(1+r()*.03),[[1,.6+.4*r(),.05+.17*r()]],r()*.02));add(x,nz(s),.7);return x;},2);
def('h_storm','молния: электрический треск',(sr,r)=>{const x=zap(sr,r,.28,90);E(x,sr,ad(.002,.09));add(x,noiseHit(sr,r,.01,'hp',4000,.7,.0002,.002),.5);return x;},2,1);
def('h_poison','яд: чавканье и пузыри',(sr,r)=>{const x=W(sr,.3,r);svf(x,sr,'lp',crv([[0,1800],[.25,300]]),6);E(x,sr,ad(.004,.08));nz(x);bubbles(x,sr,r,3,0,.16,260,2.6,.6);return x;},2);
def('h_shadow','тьма: тёмный гул-выдох',(sr,r)=>{const x=W(sr,.42,r);svf(x,sr,'lp',crv([[0,2400],[.35,260]]),1.4);E(x,sr,ad(.03,.13));nz(x);const b=N(sr,.42);osc(b,sr,'sin',82,.5);osc(b,sr,'sin',86.5,.5);E(b,sr,ad(.02,.16));add(x,nz(b),.55);return x;},2);
def('h_light','свет: светлый колокольчик',(sr,r)=>{const x=bells(sr,.55,[84+(r()<.5?0:2)],BELL,0,1,.6);add(x,noiseHit(sr,r,.08,'hp',6000,.7,.002,.03),.12);return x;},2);
def('h_earth','земля: удар камня и хруст',(sr,r)=>{const x=thud(sr,.35,120,42,.12);nz(x);const c=W(sr,.25,r);lp1(c,sr,1500);const g=smooth(r,.25,90);E(c,sr,t=>ad(.002,.07)(t)*(.3+.7*g(t)));add(x,nz(c),.5);const p=N(sr,.3);crk(p,sr,r,6,.01,.2,3);bq(p,sr,'bp',2000,1);add(x,nz(p),.25);return drv(x,1.5);},2,1);
def('h_wind','ветер: режущий свист воздуха',(sr,r)=>{const d=.26,x=W(sr,d,r);svf(x,sr,'bp',crv([[0,1200],[.09,4500],[d,1500]]),2.2);E(x,sr,ad(.015,.08));nz(x);const s=N(sr,d);osc(s,sr,'sin',crv([[0,2400],[d,1800]]),1);E(s,sr,ad(.02,.06));add(x,nz(s),.08);return x;},2);
def('h_blood','кровь: влажный удар',(sr,r)=>{const x=W(sr,.3,r);bq(x,sr,'bp',750,1.4);svf(x,sr,'lp',crv([[0,2200],[.2,400]]),5);E(x,sr,ad(.003,.07));nz(x);add(x,nz(thud(sr,.2,100,50,.06)),.6);blip(x,sr,900,.05,.025,.25,1600);blip(x,sr,1100,.11,.02,.18,1800);return drv(x,1.4);},2);
def('h_arcane','аркана: звонкий FM-колокол со взлётом',(sr,r)=>{const d=.5,x=N(sr,d);let p=0,q=0;const f=crv([[0,860],[.12,960]]);for(let i=0;i<x.length;i++){const t=i/sr,fc=f(t);p+=fc/sr;q+=fc*2.01/sr;x[i]=Math.sin(TAU*p+(3*Math.exp(-t/.08)+.4)*Math.sin(TAU*q));}
  E(x,sr,ad(.002,.15));parts(x,sr,3520,[[1,.2,.1]],.01);return x;},2);
// ---------- взрыв площади (низ) ----------
def('boom','взрыв: низкий удар, гул и треск',(sr,r)=>{const x=thud(sr,.7,80,32,.28);nz(x);add(x,body(sr,.7,80,32,.28,[[3,1,.4],[4,.7,.3],[5,.4,.25]]),.5);const n=W(sr,.6,r);bq(n,sr,'lp',crv([[0,2600],[.5,240]]),.7);E(n,sr,ad(.003,.16));add(x,nz(n),.75);const c=N(sr,.6);crk(c,sr,r,14,.02,.45,2);hp1(c,sr,900);add(x,nz(c),.18);return drv(x,1.6);},2,1);
def('boom_big','большой взрыв с хвостом',(sr,r)=>{const x=thud(sr,1,70,26,.45);nz(x);const n=W(sr,.9,r);bq(n,sr,'lp',crv([[0,3000],[.8,180]]),.7);E(n,sr,ad(.003,.25));add(x,nz(n),.8);const c=N(sr,.9);crk(c,sr,r,30,.02,.7,2.5);hp1(c,sr,800);add(x,nz(c),.2);return verb(drv(x,1.7),sr,1.3,.22);},1,1);
// ---------- касты: жест формы чар ----------
def('c_bolt','запуск снаряда: «фшух»',(sr,r)=>{const x=whoosh(sr,r,.26,800,2600,1.4,.012,.08);const s=N(sr,.15);osc(s,sr,'sin',crv([[0,480],[.1,900]]),1);E(s,sr,ad(.004,.05));add(x,nz(s),.22);return x;},2);
def('c_nova','нова: удар и раскрывающийся взрыв вокруг',(sr,r)=>{const x=base(sr,.7,nz(thud(sr,.6,90,40,.2)));const n=W(sr,.65,r);svf(n,sr,'lp',crv([[0,400],[.04,6000],[.5,300]]),1.2);E(n,sr,ad(.004,.17));add(x,nz(n),.8);add(x,whoosh(sr,r,.5,1600,600,1.3,.02,.15),.3);return drv(x,1.4);});
def('c_meteor','метеор: падающий свист',(sr,r)=>{const d=.62,x=N(sr,d);osc(x,sr,'sin',crv([[0,2300],[d,480]]),.35);const n=W(sr,d,r);svf(n,sr,'bp',crv([[0,2300],[d,500]]),3);add(x,nz(n),.7);E(x,sr,t=>Math.pow(Math.min(1,t/d),1.6)*(t>d-.02?(d-t)/.02:1));return x;});
def('c_chain','цепь: три перескока искры',(sr,r)=>{const x=N(sr,.36);for(let k=0;k<3;k++){const z=zap(sr,r,.06,110+k*45);E(z,sr,ad(.002,.02));add(x,z,1-k*.15,k*.075,sr);}return x;},1,1);
def('c_strike','рывок и удар веером: свист, рассечение, звон металла',(sr,r)=>{const x=base(sr,.46,whoosh(sr,r,.12,500,3000,1.3,.03,.04));add(x,whoosh(sr,r,.08,4200,2000,1.8,.004,.025),.8,.12,sr);const m=N(sr,.3);parts(m,sr,2700,[[1,.6,.12],[1.48,.5,.1],[1.96,.3,.07]]);add(x,nz(m),.25,.125,sr);return x;},2);
def('c_beam','луч: гудящий поток энергии',(sr,r)=>{const d=.62,x=N(sr,d);[220,330.6,441.3].forEach(f=>osc(x,sr,'saw',f,.3));svf(x,sr,'bp',t=>1200+500*Math.sin(TAU*9*t),2);nz(x);const n=W(sr,d,r);bq(n,sr,'bp',3000,1);add(x,nz(n),.18);E(x,sr,ar(.015,.36,.24));return x;});
def('c_summon','призыв: нарастающий магический вихрь, рык и звон',(sr,r)=>{const d=1,w=W(sr,d,r);svf(w,sr,'bp',crv([[0,300],[.7,1500]]),2);E(w,sr,t=>Math.min(1,t/.6)*(t>.75?Math.exp(-(t-.75)/.08):1));const x=base(sr,1.35,nz(w));
  const s=N(sr,d);osc(s,sr,'sin',crv([[0,180],[.7,720]]),1);E(s,sr,t=>Math.min(1,t/.5)*(t>.7?Math.exp(-(t-.7)/.06):1));add(x,nz(s),.35);
  const g=N(sr,.4);osc(g,sr,'saw',55,1);lp1(g,sr,350);E(g,sr,t=>ad(.03,.12)(t)*(.6+.4*Math.sin(TAU*25*t)));add(x,nz(g),.45,.6,sr);add(x,nz(bells(sr,.6,[88],CHIME,0,1,.5)),.35,.72,sr);return x;});
def('c_blink','телепорт: «вжик-хлоп»',(sr,r)=>{const x=N(sr,.3);let p=0;const f=crv([[0,1600],[.07,250],[.13,2000]]);for(let i=0;i<x.length;i++){p+=f(i/sr)/sr;x[i]=Math.sin(TAU*p);}E(x,sr,t=>t<.13?ad(.004,1)(t):Math.exp(-(t-.13)/.04));add(x,noiseHit(sr,r,.05,'hp',2000,.7,.001,.012),.45,.13,sr);return x;});
def('c_whirl','вихрь клинков: вращающийся свист',(sr,r)=>{const d=.95,x=W(sr,d,r);svf(x,sr,'bp',t=>1450+750*Math.sin(TAU*7*t),1.6);E(x,sr,t=>ar(.05,.62,.26)(t)*(.35+.65*(.5+.5*Math.sin(TAU*7*t-1))));return x;});
def('c_rain','дождь чар: вверх и раскат',(sr,r)=>{const x=base(sr,.7,whoosh(sr,r,.32,400,3000,1.2,.2,.06));const b=BR(sr,.65,r);lp1(b,sr,220);E(b,sr,t=>t<.25?0:ad(.08,.18)(t-.25));add(x,nz(b),.55);return x;});
def('c_trap','ловушка: щелчок механизма и гул печати',(sr,r)=>{const x=N(sr,.4);add(x,noiseHit(sr,r,.04,'bp',3000,8,.0003,.012));add(x,noiseHit(sr,r,.04,'bp',2400,8,.0003,.012),.8,.07,sr);
  const h=N(sr,.35);osc(h,sr,'sin',330,.5);osc(h,sr,'sin',495,.35);E(h,sr,t=>ad(.02,.12)(t)*(.7+.3*Math.sin(TAU*14*t)));add(x,nz(h),.35,.05,sr);return x;});
def('c_barrier','щит: мерцающий аккорд и стекло',(sr,r)=>{const d=.85,x=N(sr,d);[69,73,76].forEach(m=>{osc(x,sr,'sin',mtf(m),.3);osc(x,sr,'tri',mtf(m)*2,.06);});E(x,sr,t=>ad(.08,.3)(t)*(.7+.3*Math.sin(TAU*10*t)));nz(x);
  add(x,whoosh(sr,r,.4,800,2600,1.1,.15,.1),.3);add(x,nz(bells(sr,.6,[93,100],GLASS,.05,1,2)),.15,.1,sr);return x;});
def('c_aura','пульс ауры',(sr,r)=>{const x=N(sr,.4);osc(x,sr,'sin',crv([[0,140],[.3,90]]),1);E(x,sr,ad(.02,.12));return x;});
// ---------- редкость каста ----------
def('r_epic','эпическая: россыпь высоких искр',(sr,r)=>{const x=N(sr,.6);for(let k=0;k<6;k++)parts(x,sr,mtf([93,96,100,105][k%4])*(1+r()*.01),GLASS,k*.03,.6,1.6);return x;});
def('r_leg','легендарная: золотой аккорд и «фвумм»',(sr,r)=>{const x=bells(sr,1.1,[86,90,93,98],CHIME,.025,1,.8);add(x,nz(thud(sr,.5,110,70,.2)),.45);add(x,whoosh(sr,r,.6,2500,8000,1,.15,.15),.15);return x;});
// «Невозможная»: под субом — рычащее пламя 200–800 Гц и тритон октавой выше: тяжёлый тёмный звук слышен и на телефоне, громче легендарной
def('r_imp','Невозможная: чёрное пламя, суб и тритон',(sr,r)=>{const d=1.25,x=N(sr,d);osc(x,sr,'sin',crv([[0,72],[.6,30]]),1);E(x,sr,ad(.004,.4));nz(x,.45);add(x,body(sr,d,72,30,.4,[[3,1,.8],[4,.7,.6],[5,.4,.45]]),.7);
  const f=W(sr,d,r);lp1(f,sr,420);lp1(f,sr,700);hp1(f,sr,170);const fl=smooth(r,d,18);
  E(f,sr,t=>ad(.08,.35)(t)*(.35+.65*fl(t)));add(x,nz(f),.7);const c=N(sr,d);parts(c,sr,98,[[1,.5,.7],[2,.4,.4]]);parts(c,sr,138.6,[[1,.45,.6]]);parts(c,sr,196,[[1,.9,.6],[2,.35,.35],[3,.2,.25]]);parts(c,sr,277.2,[[1,.75,.55],[2,.3,.3]]);add(x,nz(c),.8);
  add(x,nz(roar(sr,r,1.15,crv([[0,62],[.3,74],[1.15,46]]),{F:[[280,4,1],[470,5,.75],[820,6,.4]],am:23,nz:.8,drv:2.2,env:ad(.05,.5)})),1.8,.02,sr);
  const k=N(sr,d);crk(k,sr,r,22,.02,.8,3);bq(k,sr,'bp',1100,.9);add(x,nz(k),.45);
  const fr=W(sr,d,r);svf(fr,sr,'bp',t=>900+500*fl(t),.8);E(fr,sr,t=>ad(.05,.4)(t)*(.3+.7*fl(t)));add(x,nz(fr),1.4);return drv(x,1.5);},1,1);
def('imp_hit','удар чёрным пламенем: тёмный треск и суб',(sr,r)=>{const x=thud(sr,.3,60,40,.1);nz(x);const f=W(sr,.3,r);lp1(f,sr,600);const fl=smooth(r,.3,40);E(f,sr,t=>ad(.004,.08)(t)*(.3+.7*fl(t)));add(x,nz(f),.7);return x;},2);
// ---------- враги ----------
def('d_flesh','смерть: глухой удар и хрип',(sr,r)=>{const x=thud(sr,.45,120,45,.14);nz(x,.75);add(x,body(sr,.45,120,70,.14,[[2,1,1],[3,.8,.8],[4,.5,.6]]),1.1);add(x,smack(sr,r,1400,.03),.55);
  const g=N(sr,.32);osc(g,sr,'saw',crv([[0,130+r()*25],[.3,82]]),1);const gf=fmt(g,sr,[[500,4,1],[1000,5,.55]]);lp1(gf,sr,2200);E(gf,sr,ad(.012,.15));add(x,nz(gf),1.2,.01,sr);return drv(x,1.4);},2);
def('d_slime','смерть слизня: хлюп и пузыри',(sr,r)=>{const x=W(sr,.42,r);svf(x,sr,'lp',crv([[0,1500],[.35,200]]),8);E(x,sr,ad(.004,.1));nz(x);bubbles(x,sr,r,3,.05,.25,200,2.5,.5);return x;},2);
def('d_bat','смерть мелкой летучей твари: писк',(sr,r)=>{const x=N(sr,.26);for(let k=0;k<2;k++){const f0=2700+r()*500;osc(x,sr,'sin',t=>f0*(1-.25*t/.08)*(1+.05*Math.sin(TAU*40*t)),1,k*.09,.08);}E(x,sr,t=>{const u=t%.09;return Math.min(1,u/.006)*Math.exp(-u/.03);});return x;},2);
def('d_ghost','смерть призрака: затихающий вой',(sr,r)=>{const d=.95,x=N(sr,d);osc(x,sr,'sin',t=>crv([[0,560],[.8,190]])(t)*(1+.03*Math.sin(TAU*6*t)),.6);osc(x,sr,'saw',t=>crv([[0,560],[.8,190]])(t),.15);const y=fmt(x,sr,[[330,3,1],[870,4,.5]]);add(y,x,.4);E(y,sr,ad(.05,.3));return verb(nz(y),sr,1.4,.35);});
def('d_stone','смерть каменного: осыпь камней',(sr,r)=>{const x=thud(sr,.6,70,38,.15);nz(x);const c=N(sr,.6);for(let k=0;k<16;k++){const t=Math.pow(r(),1.6)*.45,i=Math.round(t*sr),L=Math.round((.01+r()*.03)*sr),f=800+r()*2200,a=.4+.6*r();const b=N(sr,.05);for(let j=0;j<L;j++)b[j]=(r()*2-1)*Math.exp(-4*j/L);bq(b,sr,'bp',f,3);add(c,b,a,t,sr);}add(x,nz(c),.6);return x;},2,1);
def('d_bone','смерть костяного: стук костей',(sr,r)=>{const x=N(sr,.5);for(let k=0;k<10;k++){const b=noiseHit(sr,r,.03,'bp',1800+r()*1700,10,.0002,.006);add(x,b,.5+.5*r(),Math.pow(r(),1.3)*.35,sr);}add(x,nz(thud(sr,.2,110,60,.05)),.35);return x;},2,1);
def('d_beast','смерть зверя: взвизг и рык',(sr,r)=>{const x=N(sr,.5);osc(x,sr,'saw',crv([[0,640+r()*80],[.35,370]]),1);const y=fmt(x,sr,[[1200,4,1],[2600,6,.4]]);E(y,sr,ad(.02,.12));nz(y);const g=N(sr,.4);osc(g,sr,'saw',88,1);lp1(g,sr,500);E(g,sr,t=>ad(.02,.12)(t)*(.6+.4*Math.sin(TAU*30*t)));add(y,nz(g),.35);add(y,nz(thud(sr,.3,110,50,.08)),.4,.05,sr);return y;},2);
def('d_big','крупный враг рухнул: тяжёлый удар и гул',(sr,r)=>{const x=thud(sr,.9,80,30,.3);nz(x);add(x,body(sr,.9,80,30,.3,[[3,1,.5],[4,.8,.4],[5,.5,.3],[6,.3,.25]]),.7);add(x,noiseHit(sr,r,.25,'bp',420,1,.001,.07),.45);
  const b=BR(sr,.8,r);lp1(b,sr,300);E(b,sr,ad(.02,.25));add(x,nz(b),.5);const c=N(sr,.8);crk(c,sr,r,12,.05,.6,4);bq(c,sr,'bp',1500,1);add(x,nz(c),.35);return drv(x,1.5);},1,1);
def('e_arrow','выстрел лучника: тетива и свист',(sr,r)=>{const p=pluck(sr,230+r()*30,.2,r,.98,.45).x;E(p,sr,ad(.001,.05));const x=nz(p);add(x,whoosh(sr,r,.16,3000,1500,1.6,.02,.05),.5,.02,sr);return x;},2);
def('e_orb','колдун: дрожащий магический сгусток',(sr,r)=>{const d=.42,x=N(sr,d);osc(x,sr,'sin',t=>crv([[0,300],[.3,520]])(t)*(1+.06*Math.sin(TAU*12*t)),.7);const n=W(sr,d,r);bq(n,sr,'bp',800,3);add(x,nz(n),.35);E(x,sr,ad(.03,.15));return x;},2);
def('tw','замах врага: нарастающий рык-свист (уходи!)',(sr,r)=>{const d=.62,x=N(sr,d);osc(x,sr,'saw',crv([[0,72],[d,112]]),1);lp1(x,sr,700);E(x,sr,t=>.6+.4*Math.sin(TAU*28*t));nz(x);const n=W(sr,d,r);svf(n,sr,'bp',crv([[0,400],[d,1300]]),1.6);add(x,nz(n),.6);E(x,sr,t=>Math.pow(Math.min(1,t/d),1.4)*(t>d-.03?(d-t)/.03:1));return x;},2);
def('twb','замах босса: глубокий рёв с тревожным тоном',(sr,r)=>{const d=1,x=roar(sr,r,d,crv([[0,52],[.8,70]]),{env:t=>Math.pow(Math.min(1,t/.85),1.3)*(t>.95?(1-t)/.05:1)});const s=N(sr,d);osc(s,sr,'sin',crv([[0,200],[d,420]]),1);E(s,sr,t=>Math.pow(t/d,2));add(nz(x),nz(s),.25);return x;});
def('th','удар врага по площади: тяжёлый шлепок',(sr,r)=>{const x=thud(sr,.5,72,34,.17);nz(x);add(x,body(sr,.5,72,34,.17,[[3,1,.45],[4,.7,.35],[5,.4,.3]]),.55);const n=W(sr,.4,r);lp1(n,sr,1200);E(n,sr,ad(.002,.09));add(x,nz(n),.6);return drv(x,1.6);},2);
def('charge','рывок крупного врага: гулкий свист',(sr,r)=>{const x=whoosh(sr,r,.5,300,1500,1,.08,.18);const b=BR(sr,.5,r);lp1(b,sr,200);E(b,sr,ad(.05,.15));add(x,nz(b),.5);return x;});
def('champ','чемпион края: низкий рог и барабан',(sr,r)=>{const x=nz(brass(sr,1.3,mtf(40),{br:1200,r:.45}));add(x,taiko(sr,r,70),.7);return verb(x,sr,1.6,.25);});
// ---------- боссы ----------
def('b_roar','рёв босса',(sr,r)=>verb(roar(sr,r,2,crv([[0,55],[.35,88],[1.1,72],[2,45]])),sr,1.8,.32));
def('b_boom','низкий удар появления босса',(sr,r)=>{const x=thud(sr,1.3,62,24,.55);nz(x);add(x,body(sr,1.3,62,24,.55,[[3,1,.4],[4,.8,.32],[5,.5,.26],[6,.3,.2]]),.55);const n=W(sr,1,r);lp1(n,sr,450);lp1(n,sr,600);E(n,sr,ad(.003,.3));add(x,nz(n),.6);const b=BR(sr,1.3,r);lp1(b,sr,150);E(b,sr,ad(.05,.5));add(x,nz(b),.4);return verb(drv(x,1.5),sr,1.6,.25);});
def('b_phase','новая фаза босса: нарастание, удар, рёв',(sr,r)=>{const d=1.9,x=N(sr,d);const s=W(sr,.8,r);bq(s,sr,'hp',crv([[0,500],[.8,6000]]),.8);E(s,sr,t=>Math.pow(t/.8,2.2));add(x,nz(s),.35);
  add(x,nz(thud(sr,.8,70,28,.3)),.9,.8,sr);add(x,nz(roar(sr,r,1.05,crv([[0,70],[.3,110],[1,80]]))),.75,.82,sr);return verb(x,sr,1.6,.28);});
def('b_death','смерть босса: затихающий рёв и обвал',(sr,r)=>{const d=3,x=N(sr,d);add(x,nz(roar(sr,r,1.6,crv([[0,85],[1.5,34]]),{env:ad(.1,.6)})),.8);const b=BR(sr,2.6,r);lp1(b,sr,260);E(b,sr,t=>ad(.3,.9)(t));add(x,nz(b),.55,.3,sr);
  const c=N(sr,2.4);crk(c,sr,r,40,.1,2.2,6);bq(c,sr,'bp',1300,1);add(x,nz(c),.25,.3,sr);return verb(x,sr,2,.3);},1,1);
def('b_fall','последний обвал туши босса',(sr,r)=>{const x=thud(sr,1.4,60,22,.6);nz(x);const n=W(sr,1.2,r);lp1(n,sr,900);E(n,sr,ad(.003,.35));add(x,nz(n),.6);const c=N(sr,1.2);crk(c,sr,r,24,.05,.9,5);bq(c,sr,'bp',1600,1);add(x,nz(c),.3);return verb(drv(x,1.6),sr,1.8,.25);},1,1);
def('win','победные фанфары с тарелкой',(sr,r)=>{const x=base(sr,2.3,nz(notesBrass(sr,[[0,55,.22,.8],[.22,60,.22,.85],[.44,64,.22,.9],[.66,67,1.3,1],[.66,60,1.3,.6],[.66,64,1.3,.6]],{br:2600})));
  const cy=W(sr,1.6,r);bq(cy,sr,'hp',5000,.7);E(cy,sr,t=>t<.66?Math.pow(t/.66,2)*.4:Math.exp(-(t-.66)/.4));add(x,nz(cy),.12);add(x,nz(bells(sr,1.6,[84,88,91,96],CHIME,.05,1,1)),.35,.66,sr);return verb(x,sr,1.8,.25);});
// ---------- волны ----------
def('w_horn','боевой рог: волна близко',(sr,r)=>{const x=nz(brass(sr,1.9,mtf(45),{br:2000,fall:.4}));add(x,nz(taiko(sr,r,62)),.45);return verb(x,sr,2,.3);});
def('w_drum','барабаны: волна началась',(sr,r)=>{const x=N(sr,1.4);add(x,taiko(sr,r,64),1);add(x,taiko(sr,r,58),.7,.24,sr);add(x,taiko(sr,r,66),.85,.48,sr);return verb(x,sr,1.3,.2);});
def('w_tick','деревянный щелчок отсчёта',(sr,r)=>{const x=N(sr,.12);osc(x,sr,'sin',1150,1);E(x,sr,ad(.0006,.022));add(x,noiseHit(sr,r,.04,'bp',1150,10,.0003,.02),.4);return x;});
def('w_clear','волна отбита: короткие фанфары',(sr,r)=>{const x=base(sr,1.35,nz(notesBrass(sr,[[0,60,.16,.8],[.15,64,.16,.85],[.3,67,.7,1]],{br:2400})));add(x,nz(bells(sr,1,[84,91],CHIME,.05,1,.8)),.3,.3,sr);return verb(x,sr,1.4,.22);});
def('w_done','край пройден: длинные фанфары, дробь и тарелка',(sr,r)=>{const x=base(sr,3.05,nz(notesBrass(sr,[[0,48,.25,.7],[.25,55,.25,.8],[.5,60,.25,.85],[.75,64,.25,.9],[1,67,1.6,1],[1,60,1.6,.6],[1,64,1.6,.6]],{br:2800})));
  const rl=N(sr,1.1);for(let k=0;k<14;k++)add(rl,noiseHit(sr,r,.05,'bp',300,1.5,.0005,.02),.35+k*.045,k*.07,sr);add(x,nz(rl),.3);const cy=W(sr,2,r);bq(cy,sr,'hp',5000,.7);E(cy,sr,t=>t<1?0:Math.exp(-(t-1)/.6));add(x,nz(cy),.15);
  add(x,nz(bells(sr,2,[84,88,91,96,100],CHIME,.06,1,1.3)),.35,1,sr);return verb(x,sr,2,.25);});
def('w_fail','волна сорвана: грустный рог вниз',(sr,r)=>{const x=notesBrass(sr,[[0,57,.45,.9],[.4,56,.45,.85],[.8,52,.9,.8]],{br:1300});return verb(nz(x),sr,1.6,.25);});
def('w_gather','враги собираются: глухая дробь',(sr,r)=>{const x=N(sr,1.4);let t=0,k=0;while(t<1.05){add(x,noiseHit(sr,r,.12,'lp',260,1.2,.001,.05),.3+.06*k);add(x,nz(thud(sr,.15,90,60,.05)),.25+.05*k,t,sr);t+=.16-k*.008;k++;}
  const dr=N(sr,1.4);osc(dr,sr,'saw',55,1);lp1(dr,sr,200);E(dr,sr,ar(.5,.4,.5));add(x,nz(dr),.25);return x;});
// ---------- особенности классов ----------
def('cl_flash','Вспышка Пироманта: огненный «вумф»',(sr,r)=>{const d=.95,x=W(sr,d,r);svf(x,sr,'lp',crv([[0,400],[.06,3200],[.8,300]]),1.2);E(x,sr,ad(.01,.25));nz(x);const c=N(sr,d);crk(c,sr,r,40,0,.7,2.5);hp1(c,sr,1500);add(x,nz(c),.3);add(x,nz(thud(sr,.6,75,30,.22)),.7);return drv(x,1.5);},1,1);
def('cl_shatter','Раскол Криоманта: стекло льда вдребезги',(sr,r)=>{const x=shatter(sr,r,.85,45);nz(x);add(x,noiseHit(sr,r,.1,'hp',2000,.7,.0004,.03),.4);add(x,nz(thud(sr,.3,140,60,.1)),.4);return x;});
def('cl_thunder','Громовой раскат: треск и гром',(sr,r)=>{const d=1.6,x=base(sr,1.65,noiseHit(sr,r,.05,'hp',1000,.7,.0002,.012));const b=BR(sr,d,r);lp1(b,sr,300);const env=N(sr,1);
  const bumps=[];for(let k=0;k<5;k++)bumps.push([.05+r()*.9,.4+.6*r()]);E(b,sr,t=>{let v=0;for(const q of bumps)v+=q[1]*Math.exp(-Math.abs(t-q[0])/.12);return Math.min(1,v)*Math.exp(-t/.7);});add(x,nz(b),.9);
  add(x,zap(sr,r,.12,140),.3);return verb(drv(x,1.4),sr,1.8,.3);},1,1);
def('cl_plburst','Чумной взрыв: хлопок, бульканье, шипение',(sr,r)=>{const x=W(sr,.7,r);svf(x,sr,'lp',crv([[0,2500],[.5,300]]),5);E(x,sr,ad(.003,.12));nz(x);bubbles(x,sr,r,9,.02,.45,220,2.8,.5);const h=W(sr,.5,r);bq(h,sr,'bp',3000,1);E(h,sr,ad(.02,.12));add(x,nz(h),.15);add(x,nz(thud(sr,.3,110,50,.08)),.5);return x;});
def('cl_wrath','Священный гнев: светлый удар и аккорд',(sr,r)=>{const x=base(sr,1.25,nz(thud(sr,.6,100,40,.2)));add(x,whoosh(sr,r,.4,1500,5000,1,.02,.12),.5);add(x,nz(bells(sr,1.2,[76,80,83,88],CHIME,.02,1,.8)),.5);return verb(x,sr,1.4,.25);});
def('cl_gale','Буревестник: мощный порыв ветра',(sr,r)=>{const d=.9,x=W(sr,d,r);svf(x,sr,'bp',crv([[0,400],[.3,3000],[d,800]]),1.5);E(x,sr,ad(.06,.25));nz(x);const s=N(sr,d);osc(s,sr,'sin',crv([[0,1800],[d,1100]]),1);E(s,sr,ad(.1,.2));add(x,nz(s),.08);return x;});
def('cl_rage','Бешенство: боевой рык и удар барабана',(sr,r)=>{const x=nz(roar(sr,r,1,crv([[0,110],[.25,160],[1,120]]),{F:[[700,5,1],[1200,6,.7],[2600,8,.35]],env:ar(.08,.45,.45)}));add(x,taiko(sr,r,70),.7);return verb(x,sr,1.2,.2);});
def('cl_pulse','Арканный импульс: волна и звон',(sr,r)=>{const x=N(sr,.7);let p=0;for(let i=0;i<x.length;i++){const t=i/sr;p+=crv([[0,220],[.3,110]])(t)/sr;x[i]=Math.sin(TAU*p+2*Math.exp(-t/.1)*Math.sin(TAU*p*2.5));}E(x,sr,ad(.005,.2));add(x,nz(bells(sr,.7,[93],CHIME,0,1,.5)),.25);return x;});
def('cl_palm','Ладонь монаха: удар воздуха',(sr,r)=>{const x=nz(thud(sr,.35,130,55,.1));add(x,whoosh(sr,r,.3,600,3000,1.2,.01,.08),.6);return drv(x,1.5);});
def('cl_unstable','Нестабильная смесь: взрыв со звоном склянок',(sr,r)=>{const x=thud(sr,.7,85,35,.25);nz(x);const n=W(sr,.6,r);bq(n,sr,'lp',crv([[0,3000],[.5,250]]),.7);E(n,sr,ad(.003,.15));add(x,nz(n),.7);const g=N(sr,.6);for(let k=0;k<4;k++)parts(g,sr,2500+r()*2000,GLASS,.05+r()*.15,.5);add(x,nz(g),.3);
  const f=N(sr,.6);bubbles(f,sr,r,10,.1,.55,600,1.8,.4);add(x,nz(f),.15);return drv(x,1.4);},1,1);
// ---------- события фона (по одному, в случайное время) ----------
def('a_owl','сова вдалеке: «у-ууу»',(sr,r)=>{const x=N(sr,1.2);const f=360+r()*40;osc(x,sr,'sin',t=>f*(1-.06*Math.min(1,t/.2)),1,0,.25);osc(x,sr,'sin',t=>f*.95*(1-.08*Math.min(1,t/.5)),1,.38,.55);
  E(x,sr,t=>t<.25?Math.sin(Math.PI*t/.25):t<.38?0:Math.sin(Math.PI*Math.min(1,(t-.38)/.55)));lp1(x,sr,1200);return verb(x,sr,1.5,.35);});
def('a_rustle','шорох листвы',(sr,r)=>{const d=.9,x=W(sr,d,r);bq(x,sr,'bp',3400,.8);const g=smooth(r,d,30);E(x,sr,t=>Math.sin(Math.PI*t/d)*(.2+.8*Math.pow(g(t),2)));lp1(x,sr,6500);return x;},2);
def('a_frog','лягушка: «кваа»',(sr,r)=>{const x=N(sr,.9);const rep=1+(r()*2|0);for(let k=0;k<rep;k++){const t0=k*.42,f=330+r()*120;for(let t=0;t<.3;t+=1/24){const b=N(sr,.04);for(let j=0;j<b.length;j++)b[j]=Math.sin(TAU*f*j/sr)*Math.exp(-j/(sr*.008));add(x,b,1-.4*(t/.3),t0+t,sr);}}lp1(x,sr,2500);return x;},2);
def('a_plop','бульк воды',(sr,r)=>{const x=N(sr,.3);blip(x,sr,380+r()*150,0,.035,1,1300);add(x,noiseHit(sr,r,.06,'bp',2500,1,.002,.015),.15,.02,sr);return verb(x,sr,.6,.2);},2);
def('a_drip','капля в пещере с эхом',(sr,r)=>{const x=N(sr,.9);const f=1700+r()*500;for(const [t,g] of [[0,1],[.19,.32],[.38,.12]])blip(x,sr,f,t,.04,g,f*.65);return verb(x,sr,1.6,.45);},2);
def('a_moan','далёкий стон ветра в курганах',(sr,r)=>{const d=2,x=N(sr,d);const f=105+r()*20;osc(x,sr,'saw',t=>f*(1-.12*t/d)*(1+.015*Math.sin(TAU*4.5*t)),1);const y=fmt(x,sr,[[300,4,1],[620,5,.4]]);lp1(y,sr,900);E(y,sr,t=>Math.sin(Math.PI*t/d));return verb(nz(y),sr,2,.4);});
def('a_rattle','кости стучат вдали',(sr,r)=>{const x=N(sr,.6);for(let k=0;k<7;k++)add(x,noiseHit(sr,r,.03,'bp',1500+r()*1500,9,.0002,.006),.4+.6*r(),r()*.45,sr);lp1(x,sr,3000);return verb(x,sr,1,.3);},1,1);
def('a_crack','треск льда',(sr,r)=>{const x=base(sr,.62,noiseHit(sr,r,.05,'hp',1800,.7,.0002,.01));const s=N(sr,.6);osc(s,sr,'sin',crv([[0,3200],[.25,1100]]),1);E(s,sr,ad(.001,.08));add(x,nz(s),.35);
  const c=N(sr,.6);let t=.05;while(t<.5){const i=Math.round(t*sr);if(i<c.length)c[i]+=1;t+=1/(30+r()*40);}bq(c,sr,'bp',700,5);E(c,sr,t=>t<.05?0:ad(.02,.15)(t-.05));add(x,nz(c),.3);return verb(x,sr,1.2,.3);},2);
def('a_rumble','далёкий гул земли',(sr,r)=>{const d=2,x=BR(sr,d,r);lp1(x,sr,140);lp1(x,sr,200);const g=smooth(r,d,4);E(x,sr,t=>Math.sin(Math.PI*t/d)*(.4+.6*g(t)));return x;},2);
def('a_blorp','бульк лавы',(sr,r)=>{const x=N(sr,.5);blip(x,sr,70+r()*30,0,.14,1,200);const n=W(sr,.3,r);lp1(n,sr,500);E(n,sr,ad(.01,.06));add(x,nz(n),.3,.08,sr);return x;},2);
def('a_ember','треск угольков',(sr,r)=>{const x=N(sr,.6);crk(x,sr,r,14,0,.5,2);hp1(x,sr,1200);lp1(x,sr,7000);return x;},2,1);
def('a_chime','ветряные колокольчики',(sr,r)=>{const x=N(sr,2.4);const sc=[84,86,88,91,93,96];for(let k=0;k<4;k++)parts(x,sr,mtf(sc[r()*sc.length|0]),CHIME,k*(.12+r()*.2),.5+.5*r(),1.2);return x;},2);
def('a_cping','звон кристалла',(sr,r)=>{const x=N(sr,2.4);parts(x,sr,mtf([79,83,86,90][r()*4|0]),[[1,1,1.6],[2.76,.3,.8],[5.4,.1,.4]]);return x;},2);
def('a_bell','далёкий колокол мёртвого города',(sr,r)=>{const x=N(sr,4.5);parts(x,sr,196,CHURCH);lp1(x,sr,2200);return verb(x,sr,2.5,.35);});
def('a_creak','скрип двери',(sr,r)=>{const d=.9,x=N(sr,d);let t=0;while(t<d-.05){const i=Math.round(t*sr);if(i<x.length)x[i]+=1;t+=1/(16+22*Math.sin(Math.PI*t/d)+r()*4);}bq(x,sr,'bp',650,5);lp1(x,sr,2200);E(x,sr,t=>Math.sin(Math.PI*t/d));return verb(x,sr,1,.3);},1,1);
def('a_whisper','шёпот бездны',(sr,r)=>{const d=1.4,x=W(sr,d,r);const F=[[[700,1200],[2400]],[[400,2000],[2700]],[[600,900],[2300]]];const y=N(sr,d);for(let s=0;s<3;s++){const c=x.slice(Math.round(s*.45*sr));const z=new Float32Array(Math.round(.42*sr));z.set(c.subarray(0,z.length));
    const f=F[s];const q=fmt(z,sr,[[f[0][0],6,1],[f[0][1],7,.6],[f[1][0],8,.3]]);E(q,sr,t=>Math.sin(Math.PI*t/.42));add(y,q,1,s*.45,sr);}hp1(y,sr,300);return verb(nz(y),sr,1.8,.4);});
def('a_howl','вой волка вдали',(sr,r)=>{const d=2.3,x=N(sr,d);const f=crv([[0,460],[.5,640],[1.6,600],[d,420]]);osc(x,sr,'sin',t=>f(t)*(1+.01*Math.sin(TAU*5*t)),1);osc(x,sr,'saw',t=>f(t),.08);const y=fmt(x,sr,[[600,3,1],[1400,4,.3]]);add(y,x,.6);E(y,sr,ar(.3,1.5,.5));lp1(y,sr,2500);return verb(nz(y),sr,2,.4);});
// ---------- музыкальные инструменты (одна нота, высота — скоростью воспроизведения) ----------
def('m_pad','подложка: мягкий аккордовый пэд (петля)',(sr,r)=>{const Lp=3,x=N(sr,Lp+.6),f=130.81;for(const c of [-9,-3,3,9])osc(x,sr,'saw',f*Math.pow(2,c/1200),.22,0,0,r());osc(x,sr,'sin',f/2,.35);osc(x,sr,'tri',f*2,.05);
  bq(x,sr,'lp',t=>900+220*Math.sin(TAU*t/Lp),.7);return {x:loopify(x,sr,Lp,.6),base:f,loop:1};});
def('m_pluck','щипок струны (арфа)',(sr,r)=>{const p=pluck(sr,220,1.6,r,.997,.5);bq(p.x,sr,'pk',420,1,4);E(p.x,sr,ad(.001,.6));return {x:verb(nz(p.x),sr,1.6,.28),base:p.base};});
def('m_bell','мягкий колокольчик (FM)',(sr,r)=>{const d=1.8,x=N(sr,d),f=440;let p=0;for(let i=0;i<x.length;i++){const t=i/sr;p+=f/sr;x[i]=Math.sin(TAU*p+(1.6*Math.exp(-t/.25)+.2)*Math.sin(TAU*p*3.5));}E(x,sr,ad(.002,.55));return {x:verb(x,sr,1.8,.3),base:f};});
def('m_bass','низкий бас затишья',(sr,r)=>{const x=N(sr,2.4),f=55;osc(x,sr,'sin',f,1);osc(x,sr,'tri',f*2,.15);E(x,sr,ad(.03,.55));return {x,base:f};});
def('m_taiko','большой барабан (тайко)',(sr,r)=>({x:verb(taiko(sr,r,60),sr,1,.16),base:60}));
def('m_tom','том',(sr,r)=>{const x=N(sr,.5);osc(x,sr,'sin',crv([[0,200],[.08,130]]),1);E(x,sr,ad(.001,.15));add(x,noiseHit(sr,r,.05,'lp',1500,.7,.0005,.015),.4);return {x:nz(x),base:130};});
def('m_stick','щелчок палочки',(sr,r)=>{const x=noiseHit(sr,r,.05,'bp',2500,6,.0002,.009);osc(x,sr,'sin',1700,.3);E(x,sr,ad(.0003,.012));return {x,base:1};});
def('m_shk','шейкер',(sr,r)=>{const x=W(sr,.09,r);bq(x,sr,'bp',6500,1.1);E(x,sr,ad(.008,.022));return {x,base:1};},2);
def('m_obass','остинато-бас волны',(sr,r)=>{const x=N(sr,.45),f=55;osc(x,sr,'saw',f,.7);osc(x,sr,'saw',f*1.005,.5);osc(x,sr,'sin',f/2,.6);svf(x,sr,'lp',crv([[0,1100],[.2,220]]),2.2);E(x,sr,ad(.004,.16));return {x:drv(nz(x),1.3),base:f};});
def('m_stab','струнный удар',(sr,r)=>{const x=N(sr,.8),f=110;for(const c of [-7,0,7])osc(x,sr,'saw',f*Math.pow(2,c/1200),.3,0,0,r());osc(x,sr,'saw',f*2,.12,0,0,r());svf(x,sr,'lp',crv([[0,2000],[.4,600]]),1);E(x,sr,ad(.012,.22));return {x:verb(nz(x),sr,1.2,.22),base:f};});
def('m_brass','медный подъём',(sr,r)=>({x:verb(nz(brass(sr,1.6,110,{a:.35,br:1700,r:.5})),sr,1.6,.25),base:110}));

// ---------- фоны регионов: подложки (моно-петли; две разной длины — по краям, вместе не повторяются ~минуту) ----------
const AB={
 forest:(sr,r,Ls)=>{const x=PK(sr,Ls,r);lp1(x,sr,600);lp1(x,sr,1100);const g=smooth(r,Ls,.18);E(x,sr,t=>.3+.7*g(t));const y=nz(x,.9);
   const lv=W(sr,Ls,r);bq(lv,sr,'bp',3600,.9);const g2=smooth(r,Ls,.5);E(lv,sr,t=>Math.pow(g2(t),3)*g(t));add(y,nz(lv),.13);
   const c=N(sr,Ls),fc=4100+r()*700;let t=r();while(t<Ls-.3){for(let k=0;k<3;k++)blip(c,sr,fc,t+k*.034,.022,1);t+=.55+r()*1.1;}add(y,c,.05);return y;},
 swamp:(sr,r,Ls)=>{const x=PK(sr,Ls,r);lp1(x,sr,420);lp1(x,sr,700);const y=nz(x,.7);const b=N(sr,Ls);osc(b,sr,'saw',178+r()*8,1);bq(b,sr,'bp',360,12);const g=smooth(r,Ls,.7);E(b,sr,t=>.3+.7*g(t));add(y,nz(b),.12);
   const bb=N(sr,Ls);bubbles(bb,sr,r,Math.round(Ls*1.6),0,Ls-.1,260,2.2,1);lp1(bb,sr,1800);add(y,nz(bb),.18);return y;},
 barrow:(sr,r,Ls)=>{const x=PK(sr,Ls,r),y=N(sr,Ls);const d1=smooth(r,Ls,.12),d2=smooth(r,Ls,.09);const a=x.slice(),b=x.slice();svf(a,sr,'bp',t=>250*(.85+.3*d1(t)),9);svf(b,sr,'bp',t=>410*(.85+.3*d2(t)),9);
   add(y,nz(a));add(y,nz(b),.8);lp1(x,sr,300);add(y,nz(x),.5);const g=smooth(r,Ls,.2);E(y,sr,t=>.35+.65*g(t));return nz(y,.9);},
 ash:(sr,r,Ls)=>{const x=W(sr,Ls,r);bq(x,sr,'bp',1100,.7);lp1(x,sr,3000);const g=smooth(r,Ls,.25);E(x,sr,t=>.25+.75*g(t)*g(t));const y=nz(x,.8);const c=N(sr,Ls);crk(c,sr,r,Math.round(Ls*3),0,Ls-.05,1.6);hp1(c,sr,1400);lp1(c,sr,6000);add(y,nz(c),.12);
   const lo=BR(sr,Ls,r);lp1(lo,sr,120);add(y,nz(lo),.3);return y;},
 ice:(sr,r,Ls)=>{const x=PK(sr,Ls,r);const d=smooth(r,Ls,.15);const w=x.slice();svf(w,sr,'bp',t=>500+900*d(t),5);lp1(x,sr,700);const y=nz(x,.6);add(y,nz(w),.55);const g=smooth(r,Ls,.22);E(y,sr,t=>.3+.7*g(t));
   const s=W(sr,Ls,r);bq(s,sr,'bp',5000,1);add(y,nz(s),.025);return nz(y,.9);},
 volcano:(sr,r,Ls)=>{const x=BR(sr,Ls,r);lp1(x,sr,130);lp1(x,sr,180);const g=smooth(r,Ls,.3);E(x,sr,t=>.55+.45*g(t));const y=nz(x,.9);const bb=N(sr,Ls);for(let k=0;k<Ls*1.2;k++)blip(bb,sr,60+r()*40,r()*(Ls-.2),.12,.5+.5*r(),170);add(y,nz(bb),.3);
   const c=N(sr,Ls);crk(c,sr,r,Math.round(Ls*4),0,Ls-.05,1.5);hp1(c,sr,1500);lp1(c,sr,6000);add(y,nz(c),.1);
   // средний слой (динамик телефона): гул лавы 200–500 Гц, медленно дышит
   const m=PK(sr,Ls,r),m2=m.slice(),gm=smooth(r,Ls,.22);svf(m,sr,'bp',t=>250+70*gm(t),2.2);svf(m2,sr,'bp',t=>430+90*gm(t),3);add(m,nz(m2),.6);E(m,sr,t=>.45+.55*gm(t));add(y,nz(m),.75);return y;},
 sky:(sr,r,Ls)=>{const x=W(sr,Ls,r);bq(x,sr,'bp',2300,.8);lp1(x,sr,5000);const g=smooth(r,Ls,.2);E(x,sr,t=>.3+.7*g(t));const y=nz(x,.5);const p=N(sr,Ls);osc(p,sr,'sin',523.25,.5);osc(p,sr,'sin',526,.4);osc(p,sr,'sin',784,.25);osc(p,sr,'sin',786.5,.2);
   const g2=smooth(r,Ls,.12);E(p,sr,t=>.4+.6*g2(t));add(y,nz(p),.16);const lo=PK(sr,Ls,r);lp1(lo,sr,400);add(y,nz(lo),.3);return y;},
 crystal:(sr,r,Ls)=>{const p=N(sr,Ls);[220,330.4,440.7,659.5,880.9].forEach((f,i)=>{const q=N(sr,Ls);osc(q,sr,'sin',f,1);const g=smooth(r,Ls,.1+i*.03);E(q,sr,t=>.2+.8*g(t));add(p,q,[1,.7,.5,.35,.2][i]);});const y=nz(p,.6);
   const b=PK(sr,Ls,r);lp1(b,sr,800);const g=smooth(r,Ls,.2);E(b,sr,t=>.3+.7*g(t));add(y,nz(b),.35);return y;},
 deadcity:(sr,r,Ls)=>{const x=PK(sr,Ls,r),y=N(sr,Ls);const d1=smooth(r,Ls,.1);const a=x.slice(),b=x.slice();svf(a,sr,'bp',t=>520*(.85+.3*d1(t)),8);svf(b,sr,'bp',t=>830*(.9+.2*d1(t)),8);add(y,nz(a),.8);add(y,nz(b),.5);
   const lo=BR(sr,Ls,r);lp1(lo,sr,160);add(y,nz(lo),.45);const g=smooth(r,Ls,.2);E(y,sr,t=>.35+.65*g(t));return nz(y,.9);},
 abyss:(sr,r,Ls)=>{const y=N(sr,Ls);[[41.2,1],[43.1,.7],[55,.6],[61.7,.45],[82.4,.25]].forEach(([f,a])=>osc(y,sr,'sin',f,a,0,0,r()));nz(y,.7);const n=PK(sr,Ls,r);const g=smooth(r,Ls,.15);svf(n,sr,'lp',t=>200+450*g(t),1.5);E(n,sr,t=>.2+.8*g(t));add(y,nz(n),.45);
   // средний слой: обертоны гула (×4, ×6) медленно бьются и тёмный выдох 300–500 Гц — бездна слышна и на телефоне
   const h=N(sr,Ls);[[164.8,1],[165.6,.8],[247.2,.6],[220,.45]].forEach(([f,a])=>osc(h,sr,'sin',f,a,0,0,r()));const gh=smooth(r,Ls,.1);E(h,sr,t=>.3+.7*gh(t));add(y,nz(h),.8);
   const m=PK(sr,Ls,r);svf(m,sr,'bp',t=>330+120*g(t),2.5);E(m,sr,t=>.3+.7*g(t));add(y,nz(m),1.1);
   return nz(y,.9);},
 cave:(sr,r,Ls)=>{const x=BR(sr,Ls,r);lp1(x,sr,110);const y=nz(x,.6);const a=PK(sr,Ls,r);svf(a,sr,'bp',190,6);add(y,nz(a),.25);
   // средний слой: гулкий воздух пещеры 300–600 Гц (резонансы свода), медленно плывёт
   const b=PK(sr,Ls,r),b2=b.slice(),gb=smooth(r,Ls,.15);svf(b,sr,'bp',t=>310+40*gb(t),4);svf(b2,sr,'bp',t=>540+60*gb(t),5);add(b,nz(b2),.5);E(b,sr,t=>.4+.6*gb(t));add(y,nz(b),.55);return y;},
 windy:(sr,r,Ls)=>{const x=PK(sr,Ls,r);const g=smooth(r,Ls,.35);const w=x.slice();svf(w,sr,'bp',t=>600+1100*g(t),3);lp1(x,sr,900);const y=nz(x,.7);add(y,nz(w),.6);E(y,sr,t=>.15+.85*Math.pow(g(t),1.5));return nz(y,.9);},
 camp:(sr,r,Ls)=>{const x=PK(sr,Ls,r);lp1(x,sr,500);lp1(x,sr,900);const g=smooth(r,Ls,.15);E(x,sr,t=>.4+.6*g(t));const y=nz(x,.6);const c=N(sr,Ls);crk(c,sr,r,Math.round(Ls*2.5),0,Ls-.05,1.8);hp1(c,sr,1000);lp1(c,sr,5000);add(y,nz(c),.1);return y;},
};
const AMBK={ // фон: подложка, громкость, события [звук, мин с, макс с, громкость]
 forest:{g:.7,ev:[['a_owl',22,55,.5],['a_rustle',7,18,.45]]},
 wolves:{b:'forest',g:.7,ev:[['a_howl',14,34,.4],['a_rustle',8,20,.4]]},
 swamp:{g:.75,ev:[['a_frog',3,10,.45],['a_plop',3,8,.4]]},
 acid:{b:'swamp',g:.7,ev:[['a_plop',1.5,4,.45]]},
 barrow:{g:.8,ev:[['a_moan',14,32,.35],['a_rattle',12,30,.35]]},
 fog:{b:'barrow',g:.8,ev:[['a_moan',10,24,.35]]},
 moans:{b:'barrow',g:.8,ev:[['a_moan',6,15,.4],['a_whisper',14,30,.35]]},
 ash:{g:.7,ev:[['a_ember',4,10,.4],['a_rumble',15,35,.5]]},
 ice:{g:.75,ev:[['a_crack',7,18,.45]]},
 volcano:{g:.8,ev:[['a_blorp',2.5,7,.45],['a_ember',5,12,.35],['a_rumble',18,40,.4]]},
 sky:{g:.65,ev:[['a_chime',6,15,.35]]},
 crystal:{g:.6,ev:[['a_cping',3,8,.3]]},
 deadcity:{g:.8,ev:[['a_bell',22,45,.35],['a_creak',12,30,.35],['a_rattle',25,50,.25]]},
 abyss:{g:.85,ev:[['a_whisper',10,24,.35],['a_rumble',14,30,.5]]},
 cave:{g:.8,ev:[['a_drip',2,6,.45],['a_moan',35,70,.2]]},
 windy:{g:.75,ev:[['a_rustle',10,22,.3]]},
 camp:{g:.55,ev:[]},
};
const ZONE_AMB=['forest','swamp','barrow','ash','ice','volcano','sky','crystal','deadcity','abyss'];
const GORGE_AMB=['forest','wolves','cave','windy','swamp','swamp','acid','fog','barrow','moans','volcano','crystal'];
const SR1=24000,SRA=22050,BED_L=[7.1,9.3];
// подложка фона k, канал i (0/1) → Float32Array-петля
// громкость подложки — по среднеквадратичному (−21 дБ), пик ≤ −2 дБ; постоянная составляющая срезана до склейки петли
function bedArr(k,i,sr){const B=AB[(AMBK[k]&&AMBK[k].b)||k]||AB.forest,Ls=BED_L[i],r=RNG(hash(k+'#'+i)),x=B(sr,r,Ls+1.2);hp1(x,sr,25);const y=loopify(x,sr,Ls,1.2);
  let e=0;for(const v of y)e+=v*v;const rms=Math.sqrt(e/y.length)||1,p=pk(y)||1,s=Math.min(.089/rms,.79/p);for(let j=0;j<y.length;j++)y[j]*=s;return y;}
function render(name,v,sr){const R=L[name];if(!R)return null;const out=R.f(sr,RNG(hash(name)+v*7919+1),v);const o=out&&out.x?out:{x:out};
  o.x=o.loop?o.x:fin(o.x,sr);if(o.loop)nz(o.x,.84);o.base=o.base||1;return o;}

if(typeof module!=='undefined'&&module.exports&&typeof window==='undefined'){module.exports={L,AB,AMBK,ZONE_AMB,GORGE_AMB,SR1,SRA,BED_L,render,bedArr,DSP:{RNG,hash,pk,fin,loopify}};return;}
// рабочий поток (new Worker('audio.js')): синтез вне главного потока игры, готовый массив уходит обратно без копирования
if(typeof window==='undefined'&&typeof importScripts==='function'){self.onmessage=e=>{const m=e.data,t0=Date.now();try{let x,base=1,loop=0;
    if(m.bed){x=bedArr(m.bed,m.i,m.sr);}else{const o=render(m.n,m.v,m.sr);x=o.x;base=o.base;loop=o.loop?1:0;}
    self.postMessage({id:m.id,x,base,loop,ms:Date.now()-t0},[x.buffer]);}catch(err){self.postMessage({id:m.id,err:String(err)});}};return;}

// =====================================================================
// ДВИЖОК (браузер)
// =====================================================================
const Q=location.search,TESTM=/[?&]test=1/.test(Q),FORCE=/[?&]snd=1/.test(Q),NOSND=/[?&]snd=0/.test(Q),DBG=/[?&](debug|snddbg)\b/.test(Q);
// sil (играть и в беззвучном режиме iPhone) — по умолчанию выкл.: audioSession 'playback' останавливает музыку других приложений (Spotify и т. п.)
const OPT={on:1,mus:45,sfx:80,amb:50,sil:0};
try{const s=JSON.parse(localStorage.getItem('tcSnd')||'null');if(s&&typeof s==='object')for(const k in OPT)if(typeof s[k]==='number'&&isFinite(s[k]))OPT[k]=clamp(s[k],0,100);}catch(e){}
const optSave=()=>{try{localStorage.setItem('tcSnd',JSON.stringify(OPT));}catch(e){}};
const allowed=()=>!!OPT.on&&(!TESTM||FORCE)&&!NOSND;
let ctx=null,master,comp,lim,busS,busM,busA,mCalm,mTense,mBoss,meter=null,unlocked=false,A=null,ST=null;
const BUF={},GENQ=[],VO=[],LAST={},CNT={},BY={},STAT={played:0,dropped:0,gen:0,genMs:0,maxGenMs:0,errs:0};
let LX=0,LZ=0,RX=Math.cos(Math.PI/4),RZ=-Math.sin(Math.PI/4);
const now=()=>ctx?ctx.currentTime:0,rr=(a,b)=>a+Math.random()*(b-a);
const vol=v=>Math.pow(clamp(v,0,100)/100,2);
// без галочки — тип сессии по умолчанию ('auto'): звук слушается кнопки беззвучного режима, чужая музыка не прерывается
function setSession(){try{const s=navigator.audioSession;if(s)s.type=allowed()&&OPT.sil?'playback':'auto';}catch(e){}}
function build(){master=ctx.createGain();master.gain.value=0;
  comp=ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.knee.value=8;comp.ratio.value=4;comp.attack.value=.004;comp.release.value=.2;
  lim=ctx.createDynamicsCompressor();lim.threshold.value=-3;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.001;lim.release.value=.12;
  master.connect(comp);comp.connect(lim);lim.connect(ctx.destination);
  busS=ctx.createGain();busM=ctx.createGain();busA=ctx.createGain();for(const b of [busS,busM,busA])b.connect(master);
  mCalm=ctx.createGain();mTense=ctx.createGain();mBoss=ctx.createGain();for(const b of [mCalm,mTense,mBoss]){b.gain.value=0;b.connect(busM);}
  if(DBG&&ctx.createAnalyser){meter=ctx.createAnalyser();meter.fftSize=2048;lim.connect(meter);}
  applyVol(true);}
function applyVol(at){if(!ctx)return;const t=now(),on=allowed()?1:0;const set=(p,v)=>{if(at)p.value=v;else p.setTargetAtTime(v,t,.05);};
  set(master.gain,on*.9);set(busS.gain,vol(OPT.sfx)*1.1);set(busM.gain,vol(OPT.mus)*.95*duckM);set(busA.gain,vol(OPT.amb)*duckA);}
let duckM=1,duckA=1;
function unlock(){if(!allowed())return;try{
  if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;setSession();try{ctx=new C({latencyHint:'interactive'});}catch(e){ctx=new C();}build();}
  if(ctx.state!=='running'&&!document.hidden){const p=ctx.resume();if(p&&p.catch)p.catch(()=>{});}
  if(!unlocked){unlocked=true;const b=ctx.createBuffer(1,1,22050),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start(0);warm();if(!tickT)tickT=setInterval(tick,100);}
  }catch(e){STAT.errs++;}}
for(const ev of ['touchend','pointerup','mousedown','keydown','click'])addEventListener(ev,unlock,{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(!ctx)return;try{if(document.hidden)ctx.suspend();else if(allowed())ctx.resume().catch(()=>{});}catch(e){}});
// ---------- буферы: синтез в рабочем потоке (Worker); без него — по очереди в простое (≤ 6 мс за раз); нужный сейчас и ещё не готовый — сразу ----------
let WK=null,wkId=0;const WKCB={},PEND={},WFAIL={};
function wkInit(){if(WK||NOWK)return;try{WK=new Worker('audio.js');WK.onmessage=e=>{const m=e.data,cb=WKCB[m.id];delete WKCB[m.id];if(cb)cb(m);};WK.onerror=()=>{WK=null;for(const n in PEND)delete PEND[n];};}catch(e){WK=null;}}
const NOWK=/[?&]sndwk=0/.test(Q);
function wkPost(msg,cb){const id=++wkId;msg.id=id;WKCB[id]=cb;WK.postMessage(msg);}
const mkAB=(x,sr)=>{const b=ctx.createBuffer(1,x.length,sr);if(b.copyToChannel)b.copyToChannel(x,0);else b.getChannelData(0).set(x);return b;};
function reqBuf(name){if(BUF[name]||PEND[name]||!L[name]||!ctx)return;if(!WK){enq(name);return;}const R=L[name],P=PEND[name]={n:R.v,arr:[]};
  for(let v=0;v<R.v;v++)wkPost({n:name,v,sr:SR1},m=>{if(PEND[name]!==P)return;if(m.err){STAT.errs++;WFAIL[name]=1;delete PEND[name];return;}P.arr[v]=mkAB(m.x,SR1);P.arr.base=m.base;P.arr.loop=!!m.loop;STAT.gen++;STAT.wkMs=(STAT.wkMs||0)+m.ms;
    if(--P.n===0){delete PEND[name];if(!BUF[name])BUF[name]=P.arr;}});}
const genStat=t0=>{const ms=performance.now()-t0;STAT.gen++;STAT.genMs+=ms;STAT.maxGenMs=Math.max(STAT.maxGenMs,ms);};
function mkBuf(name){const R=L[name];if(!R)return null;if(BUF[name])return BUF[name];const t0=performance.now(),arr=[];
  for(let v=0;v<R.v;v++){const o=render(name,v,SR1);arr.push(mkAB(o.x,SR1));arr.base=o.base;arr.loop=!!o.loop;}
  genStat(t0);return BUF[name]=arr;}
const BIG=new Set(['b_death','ui_rar4','ui_impw','w_done','b_roar','b_phase','a_bell','win','b_fall','b_boom','cl_thunder','die']);
// рабочий поток есть — главный поток звук не синтезирует (иначе рывок кадра до ~20 мс): ещё не готов — в этот раз без звука.
// Синтез в главном потоке — только без рабочего потока (или если поток не смог именно этот звук)
function getBuf(name){if(BUF[name])return BUF[name];if(!ctx)return null;if(WK&&!WFAIL[name]){reqBuf(name);return null;}
  if(BIG.has(name)&&GENQ.length){if(!GENQ.includes(name))GENQ.unshift(name);return null;}
  try{const b=mkBuf(name);delete PEND[name];return b;}catch(e){STAT.errs++;return null;}}
let genT=0;
function genStep(){genT=0;if(!ctx)return;const t0=performance.now();
  while(GENQ.length&&performance.now()-t0<6){const n=GENQ.shift();try{if(typeof n==='function')n();else if(!BUF[n])mkBuf(n);}catch(e){STAT.errs++;}}
  if(GENQ.length)genT=setTimeout(genStep,40);}
function enq(n,front){if(front)GENQ.unshift(n);else GENQ.push(n);if(!genT)genT=setTimeout(genStep,30);}
function warm(){const first=['ui_click','sw_light','sw_blade','sw_heavy','bow','wand','hit_f','hit_p','crit','hurt','h_fire','h_ice','h_storm','h_poison','h_shadow','h_light','h_earth','h_wind','h_blood','h_arcane',
   'c_bolt','c_nova','c_meteor','c_chain','c_strike','c_beam','c_summon','c_blink','c_whirl','c_rain','c_trap','c_barrier','boom','d_flesh','d_slime','d_bat','d_ghost','d_stone','d_bone','d_beast','d_big',
   'e_arrow','e_orb','tw','th','ess','m_pad','m_pluck','m_bell','m_bass','r_epic','r_leg','r_imp','imp_hit','shield_hit','heal','ui_book','ui_bookc','ui_lu','ui_pick','ui_lvl','m_taiko','m_tom','m_stick','m_shk','m_obass','m_stab','m_brass'];
  wkInit();for(const n of first)reqBuf(n);for(const n in L)if(!first.includes(n)&&!/^a_/.test(n))reqBuf(n);}
// ---------- голос ----------
// drop — голос уходит из счёта (VO, CNT) сразу; rm — ещё и отключает узлы, только когда звук доиграл (onended): вытесненный голос успевает погаснуть без щелчка
function drop(v){const i=VO.indexOf(v);if(i>=0){VO.splice(i,1);CNT[v.key]=Math.max(0,(CNT[v.key]|0)-1);}}
function rm(v){drop(v);for(const n of v.out===v.gn?[v.s,v.gn]:[v.s,v.gn,v.out])try{n.disconnect();}catch(e){}}
function play(name,o){o=o||{};if(!ctx||ctx.state!=='running'||!allowed())return null;
  const t=now(),key=o.key||name;if(o.gap&&LAST[key]!=null&&t-LAST[key]<o.gap/1000){STAT.dropped++;return null;}
  if(o.max&&(CNT[key]|0)>=o.max){STAT.dropped++;return null;}
  let g=o.g==null?1:o.g,pan=o.pan||0;
  if(o.x!=null&&isFinite(o.x)&&isFinite(o.z)){const dx=o.x-LX,dz=o.z-LZ,d=Math.hypot(dx,dz);if(d>(o.far||46))return null;g*=1/(1+d*d/(o.dd||170));pan=clamp((dx*RX+dz*RZ)/14,-1,1)*.65;}
  if(!(g>.012)||!isFinite(g))return null;
  const B=getBuf(name);if(!B||!B.length)return null;
  const pri=o.pri||1;
  if(VO.length>=MAXV){let wi=-1;for(let i=0;i<VO.length;i++){const v=VO[i];if(v.pri<pri&&(wi<0||v.pri<VO[wi].pri||(v.pri===VO[wi].pri&&v.t0<VO[wi].t0)))wi=i;}
    if(wi<0){STAT.dropped++;return null;}const v=VO[wi];try{v.gn.gain.setTargetAtTime(0,t,.01);v.s.stop(t+.06);}catch(e){}drop(v);}
  try{const s=ctx.createBufferSource();s.buffer=B[(Math.random()*B.length)|0];const rate=(o.rate||1)*(o.jit===0?1:1+(Math.random()*2-1)*(o.jit||.04));s.playbackRate.value=clamp(rate,.25,4);
    const gn=ctx.createGain();gn.gain.value=Math.min(2,g);s.connect(gn);let out=gn;
    if(pan&&ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;gn.connect(p);out=p;}
    out.connect(o.bus||busS);const v={s,gn,out,pri,key,t0:t};VO.push(v);CNT[key]=(CNT[key]|0)+1;LAST[key]=t;STAT.played++;if(DBG)BY[name]=(BY[name]|0)+1;
    s.onended=()=>rm(v);s.start(t+(o.t||0));return v;}catch(e){STAT.errs++;return null;}}
const MAXV=/iPhone|iPad|Android/.test(navigator.userAgent)?18:24;
// ---------- музыка: затишье (пэд, арфа, колокол, бас), волна (тайко, остинато, удары струн), босс (Volatile Reaction) ----------
const MOOD={b:{prog:[[50,0],[45,0],[47,1],[43,0]],mel:[62,64,66,69,71,74,76,78,81],bpm:64},
            n:{prog:[[45,1],[41,0],[48,0],[43,0]],mel:[57,60,62,64,67,69,72,74,76],bpm:62},
            d:{prog:[[50,1],[46,0],[43,1],[45,0]],mel:[62,65,67,69,72,74,77,79],bpm:58}};
const MUS={off:{},cur:'',mood:'n',calm:null,tense:null,boss:null,bossBuf:null,bossLoading:false,bossErr:false,inten:1};
function note(inst,m,t,g,dest,o){const B=getBuf(inst);if(!B||!B.length)return null;o=o||{};try{const s=ctx.createBufferSource();s.buffer=B[(Math.random()*B.length)|0];s.playbackRate.value=m==null?1:mtf(m)/B.base;
  const gn=ctx.createGain();s.connect(gn);gn.connect(dest);s.onended=()=>{try{s.disconnect();gn.disconnect();}catch(e){}};if(o.loop){s.loop=true;gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(g,t+(o.a||2.5));}else gn.gain.value=g;s.start(t);return {s,gn};}catch(e){STAT.errs++;return null;}}
function padOff(v,t){if(!v)return;try{v.gn.gain.cancelScheduledValues(t);v.gn.gain.setValueAtTime(v.gn.gain.value,t);v.gn.gain.setTargetAtTime(0,t,1.1);v.s.stop(t+5.5);}catch(e){}}
function calmRun(t1){const C=MUS.calm,M=MOOD[MUS.mood]||MOOD.n,beat=60/M.bpm;
  while(C.next<t1){const t=C.next,b=C.beat;
    if(b%8===0){const ch=M.prog[(b/8|0)%M.prog.length],root=ch[0];for(const v of C.pad)padOff(v,t);C.pad=[];
      for(const iv of [0,ch[1]?3:4,7,12])C.pad.push(note('m_pad',root+iv,t,iv===12?.09:.13,mCalm,{loop:1,a:2.2}));note('m_bass',root-12,t,.5,mCalm);C.chord=ch;}
    if(Math.random()<(b%4===0?.6:.38)){C.mi=clamp(C.mi+((Math.random()*5|0)-2),0,M.mel.length-1);note('m_pluck',M.mel[C.mi],t+(Math.random()<.2?beat/2:0),.24+Math.random()*.1,mCalm);}
    if(b%16===12&&Math.random()<.55)note('m_bell',M.mel[(Math.random()*M.mel.length)|0]+12,t,.11,mCalm);
    C.beat++;C.next+=beat;}}
const TK=[1,0,0,0,0,0,.55,0,.9,0,0,.45,0,0,0,0,1,0,0,0,0,0,.55,0,.9,0,0,.45,0,.35,.5,.7],OB=[0,0,0,3,0,0,7,10,0,0,0,3,0,12,10,7],TPROG=[0,-4,-2,-5];
function tenseRun(t1){const T=MUS.tense,step=60/104/4,root=MUS.mood==='d'?38:33,k=MUS.inten;
  while(T.next<t1){const t=T.next,s=T.step,s32=s%32,bar=(s/16|0),ch=TPROG[(bar>>1)%4];
    if(TK[s32])note('m_taiko',null,t,.42*TK[s32],mTense);
    if(k>=2&&(s32===14||s32===30))note('m_tom',47+(s32===30?5:0),t,.22,mTense);
    if(s%8===4)note('m_stick',null,t,.16,mTense);if(s%2===0)note('m_shk',null,t,s%4===0?.06:.035,mTense);
    if(s%2===0)note('m_obass',root+ch+OB[(s>>1)%16]-12,t,.3,mTense);
    if(s32===0||(k>=2&&s32===16)){for(const iv of [0,3,7])note('m_stab',root+ch+iv+12,t,.11,mTense);}
    if(s%128===0)note('m_brass',root+ch+12,t,.16,mTense);
    T.step++;T.next+=step;}}
// boss.mp3 — такты 8–31 «Volatile Reaction» (155 уд/мин): ровно 24 такта = 37,161 с и 0,5 с хвоста. Копии встают каждые BOSS_P с —
// стык на сильной доле, равномощный перекрёст 0,4 с (синус/косинус); первая копия входит за 0,8 с. Разбор стыка — _check/audio/boss/sim.py
const BOSS_P=37.1607,BOSS_X=.4,BOSS_G=.62,XIN=new Float32Array(64),XOUT=new Float32Array(64);
for(let i=0;i<64;i++){const k=i/63;XIN[i]=BOSS_G*Math.sin(k*Math.PI/2);XOUT[i]=BOSS_G*Math.cos(k*Math.PI/2);}
function bossRun(){const B=MUS.boss;if(!MUS.bossBuf)return;const t=now();if(B.next>t+.6)return;const st=Math.max(B.next,t+.05),P=Math.min(BOSS_P,MUS.bossBuf.duration-BOSS_X);
  try{const s=ctx.createBufferSource();s.buffer=MUS.bossBuf;const g=ctx.createGain(),p=g.gain;s.connect(g);g.connect(mBoss);s.onended=()=>{try{s.disconnect();g.disconnect();}catch(e){}};p.value=0;
    try{if(B.first){p.setValueAtTime(0,st);p.linearRampToValueAtTime(BOSS_G,st+.8);}else p.setValueCurveAtTime(XIN,st,BOSS_X);p.setValueCurveAtTime(XOUT,st+P,BOSS_X);}
    catch(e){try{p.cancelScheduledValues(0);}catch(x){}p.setValueAtTime(0,st);p.linearRampToValueAtTime(BOSS_G,st+(B.first?.8:BOSS_X));p.setValueAtTime(BOSS_G,st+P);p.linearRampToValueAtTime(0,st+P+BOSS_X);}
    s.start(st);s.stop(st+P+BOSS_X+.05);B.first=false;B.srcs.push({s,g,end:st+P+BOSS_X});B.next=st+P;}catch(e){STAT.errs++;}}
// стоп: громкость каждой копии держится и плавно гаснет, остановка источника — отдельно (сбой автоматизации её не отменит)
function bossStop(){const B=MUS.boss;if(!B)return;const t=now();for(const v of B.srcs){const p=v.g.gain;
    try{if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else{const c=p.value;p.cancelScheduledValues(t);p.setValueAtTime(c,t);}}catch(e){}
    try{p.setTargetAtTime(0,t,.6);}catch(e){}try{v.s.stop(t+3);}catch(e){}}MUS.boss=null;}
function bossLoad(){if(MUS.bossBuf||MUS.bossLoading||MUS.bossErr||!ctx)return;MUS.bossLoading=true;
  fetch('assets/audio/boss.mp3?av=2').then(r=>{if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer();}).then(ab=>new Promise((ok,no)=>{const p=ctx.decodeAudioData(ab,ok,no);if(p&&p.catch)p.catch(no);}))
   .then(b=>{MUS.bossBuf=b;MUS.bossLoading=false;}).catch(()=>{MUS.bossErr=true;MUS.bossLoading=false;});}
function musSet(w){const t=now(),G={calm:mCalm,tense:mTense,boss:mBoss};if(w==='boss'&&!MUS.bossBuf)w='tense!';const real=w==='tense!'?'tense':w;MUS.inten=w==='tense!'?3:MUS.inten;
  if(real===MUS.cur)return;if(MUS.cur)MUS.off[MUS.cur]=t+4.5;MUS.cur=real;
  for(const k in G)G[k].gain.setTargetAtTime(k===real?1:0,t,k===real?.7:.9);
  if(real==='calm'&&!MUS.calm)MUS.calm={next:t+.2,beat:0,pad:[],mi:4};
  if(real==='tense'&&!MUS.tense)MUS.tense={next:t+.15,step:0};
  if(real==='boss'){if(!MUS.boss)MUS.boss={next:t+.05,srcs:[],first:true};}else if(MUS.boss)bossStop();}
// уходящая музыка доигрывает, пока гаснет (MUS.off — когда погаснет), потом её секвенсор стоит
function musTick(){const t=now(),ahead=t+.5,live=k=>MUS.cur===k||t<(MUS.off[k]||0);
  if(MUS.calm){if(live('calm'))calmRun(ahead);else{for(const v of MUS.calm.pad)padOff(v,t);MUS.calm=null;}}
  if(MUS.tense){if(live('tense'))tenseRun(ahead);else MUS.tense=null;}
  if(MUS.boss){MUS.boss.srcs=MUS.boss.srcs.filter(v=>v.end>t);bossRun();}}
// ---------- фон регионов ----------
const AMB={kind:'',lay:null,evN:{},beds:{},want:''};
const bedBuf=(k,i)=>AMB.beds[k+'#'+i]||null;
function bedKeep(){const ks=Object.keys(AMB.beds);if(ks.length>8)for(const q of ks.slice(0,ks.length-8))if(!q.startsWith(AMB.want+'#')&&!q.startsWith(AMB.kind+'#'))delete AMB.beds[q];}
function bedGen(k){for(let i=0;i<2;i++){const key=k+'#'+i;if(AMB.beds[key]||PEND[key])continue;
  if(WK){PEND[key]=1;wkPost({bed:k,i,sr:SRA},m=>{delete PEND[key];if(m.err){STAT.errs++;return;}AMB.beds[key]=mkAB(m.x,SRA);STAT.gen++;STAT.wkMs=(STAT.wkMs||0)+m.ms;bedKeep();});continue;}
  enq(()=>{if(AMB.beds[key])return;const t0=performance.now();AMB.beds[key]=mkAB(bedArr(k,i,SRA),SRA);genStat(t0);bedKeep();},true);}}
function ambTick(kind){const t=now();if(kind!==AMB.want){AMB.want=kind;if(kind)bedGen(kind);}
  if(AMB.want!==AMB.kind&&(!AMB.want||(bedBuf(AMB.want,0)&&bedBuf(AMB.want,1)))){
    if(AMB.lay){const o=AMB.lay;o.g.gain.setTargetAtTime(0,t,1);for(const s of o.s)try{s.stop(t+5);}catch(e){}o.s[0].onended=()=>{for(const n of o.s.concat(o.p,[o.g]))try{n.disconnect();}catch(e){}};}AMB.lay=null;AMB.kind=AMB.want;AMB.evN={};
    if(AMB.kind){const K=AMBK[AMB.kind]||AMBK.forest,g=ctx.createGain();g.gain.value=0;g.gain.setTargetAtTime(K.g,t,1);g.connect(busA);const ss=[],pp=[];
      for(let i=0;i<2;i++){const s=ctx.createBufferSource();s.buffer=bedBuf(AMB.kind,i);s.loop=true;let out=s;if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=i?.55:-.55;s.connect(p);out=p;pp.push(p);}out.connect(g);s.start(t+.02,Math.random()*3);ss.push(s);}
      AMB.lay={g,s:ss,p:pp};}}
  if(AMB.kind&&AMB.lay){const K=AMBK[AMB.kind]||{ev:[]};for(const e of K.ev){const n=AMB.evN[e[0]];if(n==null){AMB.evN[e[0]]=t+rr(e[1]*.3,e[2]*.6);continue;}
      if(t>=n){AMB.evN[e[0]]=t+rr(e[1],e[2]);if(!BUF[e[0]]){reqBuf(e[0]);continue;}play(e[0],{g:e[3]*rr(.7,1.1),pan:rr(-.8,.8),bus:busA,key:'amb',max:3,pri:0,jit:.08});}}}}
// ---------- тик: состояние игры, слушатель, фоны, музыка, отсчёт ----------
let tickT=0,prev={},hold=0,lastHeart=0,cdLast=9,stT=0;
function tick(){if(!ctx||!A||!A.st)return;let s;try{s=A.st();}catch(e){return;}ST=s;if(ctx.state!=='running')return;const t=now();
  try{LX=s.x;LZ=s.z;if(isFinite(s.yaw)){RX=Math.cos(s.yaw);RZ=-Math.sin(s.yaw);}
    // фон
    let amb='';if(s.mode==='select')amb='camp';else if(s.mode==='game'){if(s.play==='world')amb=ZONE_AMB[clamp(s.zone|0,0,9)];else if(s.gorge>=0)amb=GORGE_AMB[s.gorge]||'cave';else amb='cave';}
    ambTick(amb);
    // музыка
    const zb=s.play==='world'?[0,6,7].includes(s.zone):[0,3,11].includes(s.gorge),zd=s.play==='world'?[2,8,9].includes(s.zone):[2,7,8,9].includes(s.gorge);
    MUS.mood=s.mode==='select'||zb?'b':zd?'d':'n';
    let w='calm';if(s.mode==='game'){if(s.boss)w='boss';else if(s.wv===2||s.ag>=6){w='tense';hold=t+8;}else if(t<hold)w='tense';}
    if(s.mode==='game'&&(s.wv||s.ag>=3))bossLoad();
    if(MUS.forced)w=MUS.forced;MUS.inten=s.wn>=7||s.ag>=12?2:1;musSet(w);musTick();
    // приглушение: пауза (книга, окно уровня), смерть
    const dm=s.dead?.35:s.paused&&!s.set?.55:1,da=s.paused&&!s.set?.6:(w!=='calm'?.7:1);if(dm!==duckM||da!==duckA){duckM=dm;duckA=da;applyVol();}
    // отсчёт перед волной: 3, 2, 1
    if(s.wv===1&&s.cd>0&&s.cd<=3){const c=Math.ceil(s.cd);if(c<cdLast){cdLast=c;play('w_tick',{g:c===1?.55:.4,rate:c===1?1.25:1,jit:0,pri:3,key:'tick'});}}else if(s.wv!==1||s.cd>3.5)cdLast=9;
    // кооп: напарник пришёл/ушёл, упал/поднялся
    if(prev.mode===s.mode&&stT>3){if(s.peer&&!prev.peer)ui('peer_in');else if(!s.peer&&prev.peer)ui('peer_out');
      if(s.peer&&s.pdead&&!prev.pdead)play('peer_down',{g:.33,pri:4,key:'pd'});else if(s.peer&&!s.pdead&&prev.pdead)ui('revive');
      if(s.mode==='game'&&s.ess>prev.ess&&s.play===prev.play)play('ess',{g:.14,gap:110,pri:0,rate:1+Math.min(.3,(s.ess-prev.ess)/400)});}
    if(prev.mode!==s.mode||prev.play!==s.play)stT=0;else stT+=.1;
    // сердце на малом здоровье
    if(s.mode==='game'&&!s.dead&&!s.paused&&s.hp<.3&&t-lastHeart>(s.hp<.15?.7:.9)){lastHeart=t;play('heart',{g:.34,jit:0,pri:2,key:'heart'});}
    prev={mode:s.mode,play:s.play,peer:s.peer,pdead:s.pdead,ess:s.ess};
  }catch(e){STAT.errs++;}}
// ---------- события игры (их зовут обёртки в index.html) ----------
const EXH={fire:'h_fire',ice:'h_ice',storm:'h_storm',poison:'h_poison',shadow:'h_shadow',light:'h_light',earth:'h_earth',wind:'h_wind',blood:'h_blood',arcane:'h_arcane'};
const FORM={bolt:'c_bolt',nova:'c_nova',meteor:'c_meteor',chain:'c_chain',strike:'c_strike',beam:'c_beam',summon:'c_summon',blink:'c_blink',whirl:'c_whirl',rain:'c_rain',trap:'c_trap',barrier:'c_barrier'};
const NOBOOM=new Set(['nova','blink','barrier','whirl','strike']);
let uiT=0;
function ui(n,g){uiT=performance.now();return play(n,{g:g==null?.5:g,pri:5,key:'ui_'+n,gap:60,jit:0});}
const safe=f=>function(){try{return f.apply(null,arguments);}catch(e){STAT.errs++;}};
const API={
 bind:o=>{A=o;},
 // попадание по врагу: стихия (id), удар героя/призыва/напарника, крит, редкость чары
 hit:safe((x,z,el,o,crit,sk)=>{if(!ctx)return;o=o||{};const side=o.fromS?.6:o.fromG?.8:1,lo=o.raw||o.splash||(o.depth|0)>0?.55:1;
   if(o.basic&&!el){const mel=!!(A&&A.mel&&A.mel());play(mel?'hit_f':'hit_p',{x,z,g:(mel?.42:.3)*side,key:'hb',gap:55,max:3,pri:1});}
   else{const n=EXH[el]||'hit_p',key='h'+el;if(LAST[key]!=null&&now()-LAST[key]<.065)return;let g=.3*side*lo,r=0;if(sk&&A&&A.rar)r=A.rar(sk)|0;g*=1+.12*r;
     const v=play(n,{x,z,g,key,gap:65,max:3,pri:1});
     if(v&&r>=4)play('imp_hit',{x,z,g:.32,gap:160,max:2,pri:1});else if(v&&r===3)play('r_epic',{x,z,g:.12,gap:260,key:'hrl',pri:0,rate:1.2});}
   if(crit)play('crit',{x,z,g:.3*side,gap:70,max:2,pri:1});}),
 kill:safe((x,z,tid,r,big,boss)=>{if(boss)return;tid=String(tid||'');const n=/slime|shroom|spitter|blob|plague/.test(tid)&&!/plaguedog|plaguenecro/.test(tid)?'d_slime':/bat|harpy/.test(tid)?'d_bat':/wraith|ghost|banshee|spirit/.test(tid)?'d_ghost':
   /golem|elem|sentinel|gargoyle|cryst|shard|prism|colossus|bell|statue/.test(tid)?'d_stone':/skel|bone|dead|lich|fallen|knight|guard/.test(tid)?'d_bone':/wolf|dog|yeti|bear|spider|lion|drake/.test(tid)?'d_beast':'d_flesh';
   const rate=clamp(1.2-.28*Math.min(1.6,r||.5),.72,1.15);play(n,{x,z,g:.42,rate,key:'d',gap:60,max:4,pri:2});if(big||r>=.9)play('d_big',{x,z,g:big?.4:.28,rate:rate*1.05,gap:120,max:2,pri:2});}),
 hurt:safe((fr,shield)=>{if(shield)play('shield_hit',{g:.35,gap:120,pri:3});else play('hurt',{g:clamp(.38+fr*2,.38,.7),gap:140,pri:3});}),
 die:safe(()=>play('die',{g:.75,pri:6,jit:0})),
 revive:safe(()=>ui('revive',.6)),
 basic:safe((role,melee,cid)=>{const n=melee?(role==='Танк'?'sw_heavy':role==='Ловкач'||cid==='monk'?'sw_light':'sw_blade'):(role==='Стрелок'?'bow':'wand');play(n,{g:n==='bow'?.38:.33,key:'sw',gap:80,pri:2});}),
 cast:safe((form,el,rar,clone)=>{const n=FORM[form]||'c_bolt',k=clone?.55:1,rg=1+(rar>=4?.45:rar>=3?.3:rar>=2?.1:0);
   play(n,{g:.42*k*rg,key:'c'+form,gap:70,pri:3});if(EXH[el])play(EXH[el],{g:.22*k*rg,rate:1.12,key:'ce'+el,gap:70,pri:2,t:.015});
   if(!clone){if(rar>=4)play('r_imp',{g:.6,gap:200,pri:4});else if(rar===3)play('r_leg',{g:.42,gap:200,pri:4});else if(rar===2)play('r_epic',{g:.22,gap:200,pri:3});}}),
 boom:safe((x,z,r,el,form,depth)=>{if(NOBOOM.has(form)&&!depth)return;const rate=clamp(1.25-r*.07,.72,1.2),g=clamp(r/4,.5,1.15)*(depth?.7:1);
   play('boom',{x,z,g:.38*g,rate,key:'bm',gap:90,max:3,pri:2});if(EXH[el])play(EXH[el],{x,z,g:.26*g,rate:.85,key:'bme'+el,gap:90,max:2,pri:1});}),
 eshot:safe((x,z,kind)=>play(kind==='arrow'?'e_arrow':'e_orb',{x,z,g:.32,key:'es',gap:110,max:3,pri:1})),
 tele:safe((x,z,size,boss)=>{if(boss)play('twb',{x,z,g:.62,gap:350,max:1,pri:4,dd:400,far:70});else play('tw',{x,z,g:.42,gap:220,max:2,pri:3,rate:clamp(1.15-size*.03,.85,1.15)});}),
 teleHit:safe((x,z,size,boss)=>play(boss?'b_boom':'th',{x,z,g:boss?.5:.45,gap:150,max:2,pri:3,rate:boss?1.15:clamp(1.1-size*.03,.8,1.1),dd:boss?400:170,far:boss?70:46})),
 charge:safe((x,z)=>play('charge',{x,z,g:.45,gap:300,pri:3})),
 // кооп: чара или удар напарника (mpPeerCast) — в его точке, тише своих (×0,7) и с затуханием по расстоянию; редкость слышна так же
 peerCast:safe((x,z,form,el,rar,role,melee,cid)=>{const P=(g,o)=>Object.assign({x,z,g,dd:300,far:60},o);rar=rar|0;
   if(!form){const n=melee?(role==='Танк'?'sw_heavy':role==='Ловкач'||cid==='monk'?'sw_light':'sw_blade'):(role==='Стрелок'?'bow':'wand');play(n,P((n==='bow'?.38:.33)*.7,{key:'psw',gap:90,pri:1}));return;}
   const n=FORM[form]||'c_bolt',rg=.7*(1+(rar>=4?.45:rar>=3?.3:rar>=2?.1:0));play(n,P(.42*rg,{key:'pc'+form,gap:80,pri:2}));
   if(EXH[el])play(EXH[el],P(.22*rg,{rate:1.12,key:'pce'+el,gap:80,pri:1,t:.015}));
   if(rar>=4)play('r_imp',P(.6*.7,{key:'pri',gap:250,pri:3}));else if(rar===3)play('r_leg',P(.42*.7,{key:'pri',gap:250,pri:3}));else if(rar===2)play('r_epic',P(.22*.7,{key:'pri',gap:250,pri:2}));}),
 bossIntro:safe(()=>{play('b_roar',{g:.8,pri:6,jit:0,t:.42});play('b_boom',{g:.75,pri:6,jit:0});bossLoad();}),
 bossPhase:safe(p=>play('b_phase',{g:.75,pri:6,jit:0,rate:p===2?1.08:1})),
 bossDeath:safe(()=>{play('b_death',{g:.8,pri:6,jit:0});play('win',{g:.42,pri:5,jit:0,t:1.2});}),
 bossFall:safe(()=>play('b_fall',{g:.7,pri:6,jit:0})),
 wv:safe(ev=>{const m={pre:['w_horn',.6],go:['w_drum',.8],clr:['w_clear',.55],done:['w_done',.65],fail:['w_fail',.5],cs:['champ',.6],chd:['w_clear',.55],ph:['w_gather',.55]}[ev];if(m)play(m[0],{g:m[1],pri:5,jit:0,key:'wv',gap:400});}),
 lvl:safe(()=>ui('ui_lvl',.55)),
 lu:safe(()=>ui('ui_lu',.4)),
 pick:safe(()=>ui('ui_pick',.45)),
 book:safe(open=>ui(open?'ui_book':'ui_bookc',.42)),
 rar:safe(r=>{if(r>=4)ui('ui_rar4',.6);else if(r===3)ui('ui_rar3',.6);else if(r===2)ui('ui_rar2',.45);}),
 heal:safe(()=>play('heal',{g:.32,gap:1800,pri:2})),
 shieldBreak:safe(()=>play('shield_break',{g:.5,gap:300,pri:3})),
 ess:safe(()=>ui('ess_big',.4)),
 scroll:safe(()=>play('scroll',{g:.42,gap:500,pri:3})),
 win:safe(()=>ui('win',.6)),
 cls:safe((k,x,z)=>{const n='cl_'+k;if(!L[n])return;play(n,{x,z,g:.55,gap:120,max:2,pri:4,dd:300});}),
 banner:safe((b,k,red)=>{b=String(b||'');if(k==='boss')return;if(k==='imp'){ui('ui_impw',.7);return;}
   if(/открыт[ыа]? слот/i.test(b)){setTimeout(()=>ui('ui_slot',.5),350);return;}
   if(/^Сундук открыт/.test(b)){ui('chest',.6);return;}if(/^Выход открыт/.test(b)){ui('portal',.5);return;}
   if(/^Засада/.test(b)){play('w_gather',{g:.55,pri:5,jit:0});return;}if(/^Ущелье \d/.test(b)){play('w_drum',{g:.7,pri:5,jit:0,key:'wv',gap:400});return;}
   if(/^(Мастерство|Особенность)/.test(b)){ui('ui_slot',.45);return;}
   if(k==='win'&&!/повержен|пройден/.test(b)){ui('w_clear',.5);return;}
   if(red&&!k)play('champ',{g:.4,pri:4,gap:1500});}),
 // настройки и отладка
 opt:()=>Object.assign({},OPT),
 state:()=>({ctx:ctx?ctx.state:null,sr:ctx?ctx.sampleRate:0,unlocked,worker:!!WK,pend:Object.keys(PEND).length,allowed:allowed(),voices:VO.length,buffers:Object.keys(BUF).length,beds:Object.keys(AMB.beds).length,queue:GENQ.length,amb:AMB.kind,mus:MUS.cur,mood:MUS.mood,boss:!!MUS.bossBuf,stat:Object.assign({},STAT),session:navigator.audioSession?navigator.audioSession.type:'нет'}),
 dbg:{L,play:(n,o)=>play(n,o||{}),force:w=>{MUS.forced=w||'';if(w==='boss')bossLoad();},meter:()=>{if(!meter)return null;const a=new Float32Array(meter.fftSize);meter.getFloatTimeDomainData(a);let p=0,e=0;for(const v of a){p=Math.max(p,Math.abs(v));e+=v*v;}return {peak:p,rms:Math.sqrt(e/a.length)};},
   genAll:()=>{for(const n in L)if(!BUF[n])reqBuf(n);},boss:()=>MUS.boss&&{next:+(MUS.boss.next-now()).toFixed(3),srcs:MUS.boss.srcs.length,P:BOSS_P,dur:MUS.bossBuf?MUS.bossBuf.duration:0},q:()=>GENQ.length+Object.keys(PEND).length,by:()=>Object.assign({},BY),set:o=>{Object.assign(OPT,o);applyVol();},mus:()=>({cur:MUS.cur,inten:MUS.inten,mood:MUS.mood})},
};
G.TCSND=API;

// ---------- настройки (шестерёнка): раздел «Звук» и строки «Благодарностей» ставит этот файл ----------
function uiInit(){const body=document.getElementById('setBody');if(!body||document.getElementById('sndSec'))return;
  const st=document.createElement('style');st.textContent='.snd-row{display:grid;grid-template-columns:64px minmax(0,1fr) 34px;align-items:center;gap:8px;font:600 14px var(--f-ui,sans-serif);color:var(--text,#e8ecf6)}.snd-row b{font-variant-numeric:tabular-nums;text-align:right;color:var(--muted,#9aa3b8);font-weight:600}.snd-row input{accent-color:var(--gold,#f2c46b)}.snd-dis .snd-row{opacity:.45}';document.head.appendChild(st);
  const sec=document.createElement('section');sec.className='set-sec';sec.id='sndSec';
  const row=(id,t)=>'<div class="snd-row"><span>'+t+'</span><input type="range" id="'+id+'" min="0" max="100" step="5" aria-label="'+t+'"><b id="'+id+'V"></b></div>';
  sec.innerHTML='<h3>Звук</h3><label class="toggle"><input type="checkbox" id="sndOn">Звук в игре</label>'+row('sndMus','Музыка')+row('sndSfx','Звуки')+row('sndAmb','Фон')+
    '<label class="toggle"><input type="checkbox" id="sndSil">Играть и в беззвучном режиме iPhone</label><p class="hint">С этой галочкой iPhone играет звук игры даже с выключенным звонком, но останавливает музыку других приложений. Без неё — звук только при включённом звонке, своя музыка не прерывается.</p>';
  body.insertBefore(sec,body.firstChild);
  const $=id=>document.getElementById(id),sync=()=>{$('sndOn').checked=!!OPT.on;$('sndSil').checked=!!OPT.sil;sec.classList.toggle('snd-dis',!OPT.on);
    for(const [id,k] of [['sndMus','mus'],['sndSfx','sfx'],['sndAmb','amb']]){$(id).value=OPT[k];$(id+'V').textContent=OPT[k];}};sync();
  $('sndOn').addEventListener('change',e=>{OPT.on=e.target.checked?1:0;optSave();setSession();if(OPT.on){unlock();if(ctx&&ctx.state!=='running')ctx.resume().catch(()=>{});}else if(ctx){try{ctx.suspend();}catch(x){}}applyVol();sync();});
  $('sndSil').addEventListener('change',e=>{OPT.sil=e.target.checked?1:0;optSave();setSession();});
  for(const [id,k] of [['sndMus','mus'],['sndSfx','sfx'],['sndAmb','amb']]){const el=$(id);el.addEventListener('input',()=>{OPT[k]=+el.value;$(id+'V').textContent=OPT[k];applyVol();});
    el.addEventListener('change',()=>{optSave();if(k==='sfx')play('hit_f',{g:.5,pri:5,jit:0});});}
  // благодарности: источники звука
  for(const h of body.querySelectorAll('h3'))if(/Благодарности/.test(h.textContent)){const s=h.parentNode;
    const p1=document.createElement('p');p1.className='hint';p1.innerHTML='Музыка босса: «Volatile Reaction» — Kevin MacLeod (<a href="https://incompetech.com" target="_blank" rel="noopener">incompetech.com</a>), лицензия <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">Creative Commons: By Attribution 4.0</a>.';
    const p2=document.createElement('p');p2.className='hint';p2.textContent='Остальные звуки, фоны регионов и музыка затишья и волн — свои: синтезируются прямо в игре.';s.appendChild(p1);s.appendChild(p2);break;}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',uiInit);else uiInit();
// звук кнопок в меню и окнах (не в бою: джойстик, атака и слоты чар молчат); своё у книги и карт — щелчок тогда не нужен
document.addEventListener('click',e=>{try{if(!ctx||performance.now()-uiT<80)return;const b=e.target&&e.target.closest&&e.target.closest('button,.chip,[role=button],input[type=checkbox]');
  if(!b||b.closest('#pad,#atk,#joy,#c,#luCards'))return;play('ui_click',{g:.3,pri:5,key:'ui_click',gap:40,jit:.03});}catch(x){}});
})(typeof window!=='undefined'?window:globalThis);
