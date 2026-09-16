(()=>{
'use strict';
if(window.__ARK_DIRECT_BOOTSTRAP_V529)return;
window.__ARK_DIRECT_BOOTSTRAP_V529=true;
const V='529';
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
      const s=document.createElement('script');s.id=id;s.async=true;s.src=src+'?v='+V+(retry?'&r=1':'');
      s.onload=()=>resolve(true);
      s.onerror=()=>{try{s.remove()}catch(_){};if(!retry){load(src,id,flag,true).then(resolve)}else resolve(false)};
      (document.head||document.documentElement).appendChild(s);
    }catch(_){resolve(false)}
  })
}
function afterPaint(fn){
  try{requestAnimationFrame(()=>requestAnimationFrame(fn))}catch(_){setTimeout(fn,40)}
}
async function criticalScanLayers(){
  if(!activeScan())return;
  await Promise.all([
    load('./shift-attendance.js','directShift529','__ARK_FIELD_SHIFT_ATTENDANCE_V1',false),
    load('./photo-evidence.js','directPhoto529','__ARK_FIELD_PHOTO_EVIDENCE_V1',false),
    load('./mobile-ux.js','directMobile529','__ARK_FIELD_MOBILE_UX_V1',false)
  ]);
}
function secondaryScanLayers(){
  if(!activeScan())return;
  Promise.all([
    load('./workflow-ux.js','directWorkflow529','__ARK_FIELD_WORKFLOW_UX_V2',false),
    load('./photo-evidence-ux.js','directPhotoUx529','__ARK_FIELD_PHOTO_UX_V1',false),
    load('./mobile-fallback.js','directFallback529','__ARK_FIELD_MOBILE_FALLBACK_V1',false)
  ]).catch(()=>{});
}
function refreshWorkerLater(){
  const run=()=>{try{if(!('serviceWorker'in navigator))return;navigator.serviceWorker.getRegistration('./').then(r=>{if(r)r.update().catch(()=>{})}).catch(()=>{})}catch(_){}};
  try{if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:3500});else setTimeout(run,2500)}catch(_){setTimeout(run,2500)}
}
function boot(){
  if(activeScan()){
    criticalScanLayers().catch(()=>{});
    afterPaint(secondaryScanLayers);
  }else{
    load('./reprint-core.js','fieldReprintCore529',null,false);
  }
  refreshWorkerLater();
  setTimeout(async()=>{
    if(!activeScan())return;
    const form=document.getElementById('f'),nid=document.getElementById('nid'),phone=document.getElementById('phone');
    if(form&&nid&&phone){
      if(!document.getElementById('arkShiftChooser')&&!window.__ARK_FIELD_SHIFT_ATTENDANCE_V1)await load('./shift-attendance.js','directShift529Retry','__ARK_FIELD_SHIFT_ATTENDANCE_V1',true);
      if(!window.__ARK_FIELD_MOBILE_UX_V1)await load('./mobile-ux.js','directMobile529Retry','__ARK_FIELD_MOBILE_UX_V1',true);
      if(!window.__ARK_FIELD_PHOTO_EVIDENCE_V1)await load('./photo-evidence.js','directPhoto529Retry','__ARK_FIELD_PHOTO_EVIDENCE_V1',true);
    }
  },700);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{if(activeScan()){criticalScanLayers().catch(()=>{});afterPaint(secondaryScanLayers)}});
})();