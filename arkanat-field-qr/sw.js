const CACHE='arkanat-field-qr-v5-17-20260915';
const CORE=['./','./index.html','./reprint.js','./photo-evidence.js','./route-guard.js'];
const SCAN_GUARD=`<script id="__ARK_SCAN_ROUTE_GUARD">(()=>{try{const q=new URLSearchParams(location.search),h=new URLSearchParams((location.hash||'').replace(/^#\??/,'')),t=q.get('p')||q.get('field')||h.get('p')||h.get('field');if(!t)return;sessionStorage.setItem('arkanat_field_token_v5',t);sessionStorage.removeItem('arkanat_field_ops_v5');sessionStorage.removeItem('arkanat_field_share_mode_v1');sessionStorage.removeItem('arkanat_field_share_v1');window.__ARK_FIELD_ROUTE='scan'}catch(_){}})();<\/script>`;
const ROUTE_BOOT=`<script id="fieldRouteGuardScript" src="./route-guard.js?v=517"><\/script>`;
const PHOTO_BOOT=`<script id="fieldPhotoEvidenceScript" src="./photo-evidence.js?v=517"><\/script>`;
function isScan(url){
  if(url.searchParams.get('p')||url.searchParams.get('field'))return true;
  try{const h=new URLSearchParams((url.hash||'').replace(/^#\??/,''));return !!(h.get('p')||h.get('field'))}catch(_){return false}
}
function cleanHtmlHeaders(source){const h=new Headers(source);['content-encoding','content-length','etag','last-modified'].forEach(k=>h.delete(k));h.set('cache-control','no-store');return h}
async function injectBoot(response,url){
  const text=await response.text();
  let boot='';
  const scan=isScan(url);
  if(scan&&!text.includes('__ARK_SCAN_ROUTE_GUARD'))boot+=SCAN_GUARD;
  if(!text.includes('id="fieldRouteGuardScript"'))boot+=ROUTE_BOOT;
  if(scan&&!text.includes('id="fieldPhotoEvidenceScript"'))boot+=PHOTO_BOOT;
  const guarded=boot?(text.includes('<head>')?text.replace('<head>','<head>'+boot):boot+text):text;
  return new Response(guarded,{status:response.status,statusText:response.statusText,headers:cleanHtmlHeaders(response.headers)});
}
async function freshShell(request,url){
  try{
    const shell=new URL('./index.html',self.registration.scope);shell.searchParams.set('__ark_sw','517');
    const response=await fetch(shell.href,{cache:'no-store',credentials:'same-origin',redirect:'follow'});
    if(!response.ok)throw new Error('shell_fetch_failed');
    const raw=response.clone();caches.open(CACHE).then(c=>c.put('./index.html',raw)).catch(()=>{});
    return await injectBoot(response,url);
  }catch(_){
    const cached=await caches.match('./index.html');
    if(cached)return injectBoot(cached,url);
    return fetch(request,{cache:'no-store'});
  }
}
async function freshAsset(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(c=>c.put(request,copy)).catch(()=>{})}
    return response;
  }catch(_){return (await caches.match(request))||Response.error()}
}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('arkanat-field-qr-')).map(k=>caches.delete(k)));try{if(self.registration.navigationPreload)await self.registration.navigationPreload.enable()}catch(_){}await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(req.mode==='navigate'&&url.origin===self.location.origin){event.respondWith(freshShell(req,url));return}
  if(url.origin===self.location.origin&&(url.pathname.endsWith('/reprint.js')||url.pathname.endsWith('/photo-evidence.js')||url.pathname.endsWith('/route-guard.js')||url.pathname.endsWith('/index.html'))){event.respondWith(freshAsset(req))}
});