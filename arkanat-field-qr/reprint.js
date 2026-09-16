(()=>{
'use strict';
if(window.__ARK_DIRECT_BOOTSTRAP_V530)return;
window.__ARK_DIRECT_BOOTSTRAP_V530=true;
const V='530';
function activeScan(){
  try{
    if(typeof TOKEN!=='undefined'&&TOKEN)return true;
    const q=new URLSearchParams(location.search||''),h=new URLSearchParams((location.hash||'').replace(/^#\??/,''));
    if(q.get('p')||q.get('field')||h.get('p')||h.get('field'))return true;
    return !!sessionStorage.getItem('arkanat_field_token_v5');
  }catch(_){return false}
}
function load(src,id,flag,retry){
  return new Promise(resolve=>{
    try{
      if(flag&&window[flag])return resolve(true);
      if(document.getElementById(id))return resolve(true);
      const s=document.createElement('script');s.id=id;s.async=true;s.src=src+'?v='+V+(retry?'-r'+Date.now():'');
      s.onload=()=>resolve(true);
      s.onerror=()=>{try{s.remove()}catch(_){};if(!retry){load(src,id,flag,true).then(resolve)}else resolve(false)};
      (document.head||document.documentElement).appendChild(s);
    }catch(_){resolve(false)}
  })
}
function loadQrLib(){
  if(typeof window.QRCode==='function'||document.getElementById('arkLazyQrLib'))return;
  const s=document.createElement('script');s.id='arkLazyQrLib';s.async=true;
  s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js?ark_ops=1';
  s.onerror=()=>{try{s.remove()}catch(_){};const f=document.createElement('script');f.id='arkLazyQrLibFallback';f.async=true;f.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js?ark_ops=1';(document.head||document.documentElement).appendChild(f)};
  (document.head||document.documentElement).appendChild(s);
}
function idle(fn,timeout=900){
  try{if('requestIdleCallback'in window)return requestIdleCallback(fn,{timeout})}catch(_){}
  return setTimeout(fn,Math.min(timeout,450));
}
function refreshWorkerLater(){
  idle(()=>{
    try{if(!('serviceWorker'in navigator))return;navigator.serviceWorker.getRegistration('./').then(r=>{if(r)r.update().catch(()=>{})}).catch(()=>{})}catch(_){}
  },2500);
}
function loadGuardCritical(){
  if(!activeScan())return;
  // Only what is required for the first usable guard screen.
  load('./shift-attendance.js','directShift530','__ARK_FIELD_SHIFT_ATTENDANCE_V1',false);
  load('./mobile-ux.js','directMobile530','__ARK_FIELD_MOBILE_UX_V1',false);
}
function loadGuardDeferred(){
  if(!activeScan())return;
  Promise.all([
    load('./photo-evidence.js','directPhoto530','__ARK_FIELD_PHOTO_EVIDENCE_V1',false),
    load('./workflow-ux.js','directWorkflow530','__ARK_FIELD_WORKFLOW_UX_V2',false)
  ]).then(()=>{
    idle(()=>{
      load('./photo-evidence-ux.js','directPhotoUx530','__ARK_FIELD_PHOTO_UX_V1',false);
      load('./mobile-fallback.js','directFallback530','__ARK_FIELD_MOBILE_FALLBACK_V1',false);
      load('./route-guard.js','directRouteGuard530','__ARK_FIELD_ROUTE_GUARD_V1',false);
    },1200);
  });
}
function armDeferredOnIntent(){
  let fired=false;
  const go=()=>{if(fired)return;fired=true;loadGuardDeferred();['pointerdown','touchstart','focusin','keydown'].forEach(ev=>document.removeEventListener(ev,go,true))};
  ['pointerdown','touchstart','focusin','keydown'].forEach(ev=>document.addEventListener(ev,go,{capture:true,passive:true,once:false}));
  idle(go,1100);
}
function boot(){
  if(activeScan()){
    loadGuardCritical();
    armDeferredOnIntent();
  }else{
    loadQrLib();
    load('./reprint-core.js','fieldReprintCore530',null,false);
  }
  refreshWorkerLater();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{if(activeScan()){loadGuardCritical();armDeferredOnIntent()}refreshWorkerLater()});
})();