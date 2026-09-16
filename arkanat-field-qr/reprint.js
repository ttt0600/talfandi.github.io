(()=>{
'use strict';
if(window.__ARK_DIRECT_BOOTSTRAP_V533)return;
window.__ARK_DIRECT_BOOTSTRAP_V533=true;
const V='533';

function activeScan(){try{if(typeof TOKEN!=='undefined'&&TOKEN)return true;const q=new URLSearchParams(location.search||''),h=new URLSearchParams((location.hash||'').replace(/^#\??/,''));if(q.get('p')||q.get('field')||h.get('p')||h.get('field'))return true;return !!sessionStorage.getItem('arkanat_field_token_v5')}catch(_){return false}}
function load(src,id,flag,retry){return new Promise(resolve=>{try{if(flag&&window[flag])return resolve(true);if(document.getElementById(id))return resolve(true);const s=document.createElement('script');s.id=id;s.async=true;s.src=src+'?v='+V+(retry?'-r'+Date.now():'');s.onload=()=>resolve(true);s.onerror=()=>{try{s.remove()}catch(_){};if(!retry)load(src,id,flag,true).then(resolve);else resolve(false)};(document.head||document.documentElement).appendChild(s)}catch(_){resolve(false)}})}
function later(fn,ms){return setTimeout(fn,ms)}
function refreshWorkerLater(){later(()=>{try{if(!('serviceWorker'in navigator))return;navigator.serviceWorker.getRegistration('./').then(r=>{if(r)r.update().catch(()=>{})}).catch(()=>{})}catch(_){}},2200)}
function bootGuard(){
  if(!activeScan())return;
  load('./shift-attendance.js','directShift533','__ARK_FIELD_SHIFT_ATTENDANCE_V2',false);
  load('./mobile-ux.js','directMobile533','__ARK_FIELD_MOBILE_UX_V3',false);
  later(()=>load('./photo-evidence.js','directPhoto533','__ARK_FIELD_PHOTO_EVIDENCE_V1',false),180);
  later(()=>load('./workflow-ux.js','directWorkflow533','__ARK_FIELD_WORKFLOW_UX_V4',false),320);
  later(()=>load('./photo-evidence-ux.js','directPhotoUx533','__ARK_FIELD_PHOTO_UX_V2',false),700);
}
function boot(){if(activeScan())bootGuard();else load('./reprint-core.js','fieldReprintCore533',null,false);refreshWorkerLater()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{if(activeScan())bootGuard();refreshWorkerLater()});
})();