const CACHE='arkanat-field-qr-v5-28-20260916';
const CORE=['./','./index.html','./reprint.js','./reprint-core.js','./photo-evidence.js','./photo-evidence-ux.js','./workflow-ux.js','./mobile-ux.js','./mobile-fallback.js','./route-guard.js','./shift-attendance.js'];

async function updateShell(){
  const shell=new URL('./index.html',self.registration.scope);shell.searchParams.set('__ark_sw','528');
  const response=await fetch(shell.href,{cache:'no-store',credentials:'same-origin',redirect:'follow'});
  if(!response.ok)throw new Error('shell_fetch_failed');
  const cache=await caches.open(CACHE);await cache.put('./index.html',response.clone());
  return response;
}
async function fastShell(request,event){
  const cached=await caches.match('./index.html',{ignoreSearch:true});
  if(cached){
    try{event.waitUntil(updateShell().catch(()=>{}))}catch(_){}
    return cached;
  }
  try{return await updateShell()}catch(_){return fetch(request,{cache:'no-store'})}
}
async function refreshAsset(request){
  const response=await fetch(request,{cache:'no-store'});
  if(response.ok){
    const url=new URL(request.url),canonical=new URL(url.pathname,self.location.origin).href;
    const cache=await caches.open(CACHE);await cache.put(canonical,response.clone());
  }
  return response;
}
async function fastAsset(request,event){
  const cached=await caches.match(request,{ignoreSearch:true});
  if(cached){
    try{event.waitUntil(refreshAsset(request).catch(()=>{}))}catch(_){}
    return cached;
  }
  try{return await refreshAsset(request)}catch(_){return Response.error()}
}
function isRuntimeAsset(url){
  return url.pathname.endsWith('/reprint.js')||url.pathname.endsWith('/reprint-core.js')||url.pathname.endsWith('/photo-evidence.js')||url.pathname.endsWith('/photo-evidence-ux.js')||url.pathname.endsWith('/workflow-ux.js')||url.pathname.endsWith('/mobile-ux.js')||url.pathname.endsWith('/mobile-fallback.js')||url.pathname.endsWith('/route-guard.js')||url.pathname.endsWith('/shift-attendance.js')||url.pathname.endsWith('/index.html');
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
  if(req.mode==='navigate'&&url.origin===self.location.origin){event.respondWith(fastShell(req,event));return}
  if(url.origin===self.location.origin&&isRuntimeAsset(url)){event.respondWith(fastAsset(req,event))}
});