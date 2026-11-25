// Сервис-воркер «Тысячи чар»: офлайн-кэш и обновление без залипания на старой версии.
// При каждом выпуске меняй VERSION — старый кэш удалится, новая версия подхватится сама.
const VERSION = 'v13.21';
const CACHE='tysyacha-char-'+VERSION;
// Модели героев (assets/models, загрузчик glTF, hero-models.js) — отдельный кэш, не пропадает при новой версии игры.
// Грузятся при первом показе героя, не при установке. Новая сборка моделей — поменять MODELS_V здесь и HM_V в index.html.
const MODELS_V='1',MCACHE='tc-models';
// декор локаций (assets/models/env_*.glb, env-models.js) — тот же кэш, своя версия ?ev= (ENV_V = EM_V в index.html)
const ENV_V='1';
const isModel=p=>p.includes('/assets/models/')||p.endsWith('/vendor/GLTFLoader.js')||p.endsWith('/hero-models.js')||p.endsWith('/env-models.js');
const CORE=['./','index.html','net-relay.js','campaign.js','net-p2p.js','manifest.webmanifest','vendor/three.min.js','vendor/trystero-nostr-0.21.5.js','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('tysyacha-char-')&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>caches.open(MCACHE)).then(c=>c.keys().then(rs=>Promise.all(rs.filter(r=>{const q=new URL(r.url).searchParams;return q.has('ev')?q.get('ev')!==ENV_V:q.get('v')!==MODELS_V;}).map(r=>c.delete(r))))).catch(()=>{})
    .then(()=>self.clients.claim()));
});
const netFirst=async(req,ms)=>{
  const c=await caches.open(CACHE);
  try{
    // cache:'no-cache' — всегда сверяться с сервером, а не брать страницу из кэша браузера (иначе «Обновить» возвращало старую версию)
    const r=await Promise.race([fetch(req.url,{cache:'no-cache',credentials:'same-origin'}),new Promise((_,j)=>setTimeout(()=>j(new Error('t')),ms))]);
    if(r&&r.ok)c.put(req,r.clone());
    return r;
  }catch(e){const m=await c.match(req,{ignoreSearch:true});if(m)return m;throw e;}
};
const swr=async req=>{
  const c=await caches.open(CACHE),m=await c.match(req);
  const f=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r;}).catch(()=>m);
  return m||f;
};
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.protocol!=='https:'&&u.protocol!=='http:')return;
  if(u.origin===location.origin){
    // модели — из своего кэша, сеть только в первый раз
    if(isModel(u.pathname)){e.respondWith(caches.open(MCACHE).then(c=>c.match(req).then(m=>m||fetch(req).then(r=>{if(r&&r.ok)c.put(req,r.clone());return r;}))));return;}
    // страница и скрипты — сначала сеть (свежая версия), без сети — кэш
    if(req.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('.html')||u.pathname.endsWith('sw.js')||u.pathname.endsWith('.webmanifest')){e.respondWith(netFirst(req,8000));return;}
    e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>{if(r&&r.ok){const cl=r.clone();caches.open(CACHE).then(c=>c.put(req,cl));}return r;})));
    return;
  }
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){e.respondWith(swr(req));return;}
  // сигнальные соединения и всё остальное (WebSocket, relay) воркер не трогает
});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting();});
