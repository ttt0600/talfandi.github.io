const CACHE='arkanat-field-qr-v5-41-20260918';
const CORE=['./index.html','./reprint.js','./shift-attendance.js','./mobile-ux.js','./photo-evidence.js','./workflow-ux.js','./photo-evidence-ux.js'];

function keyFor(url){const name=url.pathname.split('/').pop()||'index.html';return './'+(name||'index.html')}
async function currentCache(){return await caches.open(CACHE)}
async function precacheFresh(){
  const c=await currentCache();
  await Promise.all(CORE.map(async key=>{
    const r=await fetch(new Request(key,{cache:'no-store'}));
    if(!r.ok)throw new Error('precache_failed:'+key+':'+r.status);
    await c.put(key,r.clone());
  }));
}
async function cacheFirstCurrent(request,key){
  const c=await currentCache(),k=key||keyFor(new URL(request.url)),hit=await c.match(k);
  if(hit)return hit;
  try{
    const r=await fetch(request,{cache:'no-store'});
    if(r.ok)await c.put(k,r.clone());
    return r;
  }catch(_){
    return new Response('Offline',{status:503,statusText:'Offline'});
  }
}
async function networkFirstNavigation(request,preload){
  const c=await currentCache(),key='./index.html';
  try{
    const pre=preload?await preload:null;
    const r=pre&&pre.ok?pre:await fetch(request,{cache:'no-store'});
    if(r&&r.ok)await c.put(key,r.clone());
    if(r)return r;
  }catch(_){}
  const hit=await c.match(key);
  return hit||new Response('Offline',{status:503,statusText:'Offline'});
}
function isRuntime(url){return /\/(?:reprint|shift-attendance|mobile-ux|photo-evidence|workflow-ux|photo-evidence-ux|index)\.js?$/.test(url.pathname)||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/arkanat-field-qr/')}

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
  if(isRuntime(url))event.respondWith(cacheFirstCurrent(req,keyFor(url)));
});