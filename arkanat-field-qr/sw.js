const CACHE='arkanat-field-qr-v5-47-20260919';
const V='547';
const CORE=[
  './index.html',
  './reprint.js?v='+V,
  './shift-attendance.js?v='+V,
  './mobile-ux.js?v='+V,
  './photo-evidence.js?v='+V,
  './workflow-ux.js?v='+V,
  './photo-evidence-ux.js?v='+V
];

async function currentCache(){return await caches.open(CACHE)}
async function precacheFresh(){
  const c=await currentCache(),ok=new Set();
  await Promise.allSettled(CORE.map(async key=>{
    const req=new Request(key,{cache:'no-store'});
    const r=await fetch(req);
    if(!r.ok)throw new Error('precache_failed:'+key+':'+r.status);
    await c.put(req,r.clone());ok.add(key);
  }));
  if(!ok.has('./index.html')||!ok.has('./reprint.js?v='+V))throw new Error('critical_precache_failed');
}
async function cacheFirstExact(request){
  const c=await currentCache(),hit=await c.match(request,{ignoreSearch:false});
  if(hit)return hit;
  try{
    const r=await fetch(request,{cache:'no-store'});
    if(r.ok)await c.put(request,r.clone());
    return r;
  }catch(_){
    return new Response('Offline',{status:503,statusText:'Offline'});
  }
}
async function networkFirstNavigation(request,preload){
  const c=await currentCache(),fallback=new Request('./index.html');
  try{
    const pre=preload?await preload:null;
    const r=pre&&pre.ok?pre:await fetch(request,{cache:'no-store'});
    if(r&&r.ok)await c.put(fallback,r.clone());
    if(r)return r;
  }catch(_){}
  const hit=await c.match(fallback);
  return hit||new Response('Offline',{status:503,statusText:'Offline'});
}
function isRuntime(url){
  return /\/(?:reprint|shift-attendance|mobile-ux|photo-evidence|workflow-ux|photo-evidence-ux)\.js$/.test(url.pathname);
}

self.addEventListener('install',event=>{event.waitUntil((async()=>{await precacheFresh();await self.skipWaiting()})())});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('arkanat-field-qr-')).map(k=>caches.delete(k)));
  try{if(self.registration.navigationPreload)await self.registration.navigationPreload.enable()}catch(_){}
  await self.clients.claim();
})())});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){event.respondWith(networkFirstNavigation(req,event.preloadResponse));return}
  if(isRuntime(url))event.respondWith(cacheFirstExact(req));
});