(()=>{
'use strict';
if(window.__ARK_DIRECT_BOOTSTRAP_V527)return;
window.__ARK_DIRECT_BOOTSTRAP_V527=true;
const V='527';
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
      const s=document.createElement('script');s.id=id;s.async=false;s.src=src+'?v='+V+(retry?'-r'+Date.now():'');
      s.onload=()=>resolve(true);
      s.onerror=()=>{try{s.remove()}catch(_){};if(!retry){load(src,id,flag,true).then(resolve)}else resolve(false)};
      (document.head||document.documentElement).appendChild(s);
    }catch(_){resolve(false)}
  })
}
async function scanLayers(){
  if(!activeScan())return;
  await load('./route-guard.js','directRouteGuard527','__ARK_FIELD_ROUTE_GUARD_V1',false);
  await load('./shift-attendance.js','directShift527','__ARK_FIELD_SHIFT_ATTENDANCE_V1',false);
  await load('./photo-evidence.js','directPhoto527','__ARK_FIELD_PHOTO_EVIDENCE_V1',false);
  await load('./photo-evidence-ux.js','directPhotoUx527','__ARK_FIELD_PHOTO_UX_V1',false);
  await load('./workflow-ux.js','directWorkflow527','__ARK_FIELD_WORKFLOW_UX_V2',false);
  await load('./mobile-ux.js','directMobile527','__ARK_FIELD_MOBILE_UX_V1',false);
  await load('./mobile-fallback.js','directFallback527','__ARK_FIELD_MOBILE_FALLBACK_V1',false);
}
async function boot(){
  await load('./reprint-core.js','fieldReprintCore527',null,false);
  await scanLayers();
  setTimeout(async()=>{
    if(!activeScan())return;
    const form=document.getElementById('f'),nid=document.getElementById('nid'),phone=document.getElementById('phone');
    if(form&&nid&&phone){
      if(!document.getElementById('arkShiftChooser')&&!window.__ARK_FIELD_SHIFT_ATTENDANCE_V1)await load('./shift-attendance.js','directShift527Retry','__ARK_FIELD_SHIFT_ATTENDANCE_V1',true);
      if(!document.getElementById('arkWorkflowBar')&&!window.__ARK_FIELD_WORKFLOW_UX_V2)await load('./workflow-ux.js','directWorkflow527Retry','__ARK_FIELD_WORKFLOW_UX_V2',true);
      if(!window.__ARK_FIELD_MOBILE_UX_V1)await load('./mobile-ux.js','directMobile527Retry','__ARK_FIELD_MOBILE_UX_V1',true);
    }
  },1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{if(activeScan())scanLayers()});
})();