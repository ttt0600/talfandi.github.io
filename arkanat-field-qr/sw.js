const CACHE='arkanat-field-qr-v5-30-20260916';
const CORE=['./index.html','./reprint.js','./shift-attendance.js','./mobile-ux.js','./photo-evidence.js','./workflow-ux.js','./photo-evidence-ux.js','./mobile-fallback.js'];

async function cachePut(key,response){try{const c=await caches.open(CACHE);await c.put(key,response.clone())}catch(_){}}
async function network(request,key){const r=await fetch(request,{cache:'no-store'});if(r.ok)cachePut(key||request,r);return r}
async function cacheFirst(request,key){const hit=await caches.match(key||request,{ignoreSearch:true});if(hit)return hit;try{return await network(request,key)}catch(_){return Response.error()}}
function isRuntime(url){return /\/(?:reprint|shift-attendance|mobile-ux|photo-evidence|workflow-ux|photo-evidence-ux|mobile-fallback|route-guard|index)\.js?$/.test(url.pathname)||url.pathname.endsWith('/index.html')}
async function qrRequest(event,req,url){
  // The legacy page contains a synchronous QR-generation library in <head>.
  // Guard scanning never needs it, so returning an empty script prevents the CDN from blocking first paint.
  // Explicit lazy ops requests carry ark_ops=1 and are allowed through normally.
  if(url.searchParams.get('ark_ops')==='1')return fetch(req);
  try{
    const client=event.clientId?await self.clients.get(event.clientId):null;
    const cu=client&&client.url?new URL(client.url):null;
    const looksGuard=!!(cu&&(cu.searchParams.get('p')||cu.searchParams.get('field')));
    if(looksGuard)return new Response('/* QR library intentionally skipped on guard scan */',{status:200,headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store'}});
  }catch(_){}
  return fetch(req);
}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('arkanat-field-qr-')).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);
  if((url.hostname==='cdn.jsdelivr.net'||url.hostname==='cdnjs.cloudflare.com')&&/qrcode(?:\.min)?\.js/i.test(url.pathname)){event.respondWith(qrRequest(event,req,url));return}
  if(req.mode==='navigate'&&url.origin===self.location.origin){event.respondWith(cacheFirst(req,'./index.html'));return}
  if(url.origin===self.location.origin&&isRuntime(url)){event.respondWith(cacheFirst(req,url.pathname.endsWith('/index.html')?'./index.html':req));return}
});