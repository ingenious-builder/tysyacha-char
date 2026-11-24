// Сервис-воркер «Тысячи чар»: офлайн-кэш и обновление без залипания на старой версии.
// При каждом выпуске меняй VERSION — старый кэш удалится, новая версия подхватится сама.
const VERSION='v8.5';
const CACHE='tysyacha-char-'+VERSION;
const CORE=['./','index.html','manifest.webmanifest','vendor/three.min.js','net-relay.js','vendor/trystero-nostr-0.21.5.js','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('tysyacha-char-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
const netFirst=async(req,ms)=>{
  const c=await caches.open(CACHE);
  try{
    const r=await Promise.race([fetch(req),new Promise((_,j)=>setTimeout(()=>j(new Error('t')),ms))]);
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
    // страница и скрипты — сначала сеть (свежая версия), без сети — кэш
    if(req.mode==='navigate'||u.pathname.endsWith('/')||u.pathname.endsWith('.html')||u.pathname.endsWith('sw.js')||u.pathname.endsWith('.webmanifest')){e.respondWith(netFirst(req,8000));return;}
    e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>{if(r&&r.ok){const cl=r.clone();caches.open(CACHE).then(c=>c.put(req,cl));}return r;})));
    return;
  }
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){e.respondWith(swr(req));return;}
  // сигнальные соединения и всё остальное (WebSocket, relay) воркер не трогает
});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting();});
