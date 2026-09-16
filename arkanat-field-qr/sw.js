const CACHE='arkanat-field-qr-v5-29-20260916';
const CORE=['./index.html','./reprint.js','./shift-attendance.js','./photo-evidence.js','./mobile-ux.js','./workflow-ux.js','./photo-evidence-ux.js','./mobile-fallback.js'];

async function fetchAndCache(request,key){
  const response=await fetch(request,{cache:'no-store'});
  if(response.ok){try{const cache=await caches.open(CACHE);await cache.put(key||request,response.clone())}catch(_){}}
  return response;
}
async function fastShell(request){
  const cached=await caches.match('./index.html',{ignoreSearch:true});
  if(cached)return cached;
  return fetchAndCache(request,'./index.html');
}
async function fastAsset(request){
  const cached=await caches.match(request,{ignoreSearch:true});
  if(cached)return cached;
  return fetchAndCache(request,new URL(request.url).pathname);
}
function isRuntimeAsset(url){
  return url.pathname.endsWith('/reprint.js')||url.pathname.endsWith('/reprint-core.js')||url.pathname.endsWith('/photo-evidence.js')||url.pathname.endsWith('/photo-evidence-ux.js')||url.pathname.endsWith('/workflow-ux.js')||url.pathname.endsWith('/mobile-ux.js')||url.pathname.endsWith('/mobile-fallback.js')||url.pathname.endsWith('/route-guard.js')||url.pathname.endsWith('/shift-attendance.js')||url.pathname.endsWith('/index.html');
}
function isQrLibrary(url){
  return (url.hostname==='cdn.jsdelivr.net'&&url.pathname.includes('/qrcodejs@1.0.0/qrcode.min.js'))||(url.hostname==='cdnjs.cloudflare.com'&&url.pathname.includes('/qrcodejs/1.0.0/qrcode.min.js'));
}
async function scanClient(clientId){
  try{
    if(!clientId)return false;
    const client=await self.clients.get(clientId);if(!client)return false;
    const u=new URL(client.url);
    if(u.searchParams.get('p')||u.searchParams.get('field'))return true;
    const h=new URLSearchParams((u.hash||'').replace(/^#\??/,''));
    return !!(h.get('p')||h.get('field'));
  }catch(_){return false}
}
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('arkanat-field-qr-')).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(isQrLibrary(url)){
    event.respondWith((async()=>{
      if(await scanClient(event.clientId))return new Response('window.__ARK_QR_SKIPPED_FOR_SCAN=true;', {status:200,headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'public,max-age=86400'}});
      return fetch(req);
    })());
    return;
  }
  if(req.mode==='navigate'&&url.origin===self.location.origin){event.respondWith(fastShell(req));return}
  if(url.origin===self.location.origin&&isRuntimeAsset(url)){event.respondWith(fastAsset(req))}
});