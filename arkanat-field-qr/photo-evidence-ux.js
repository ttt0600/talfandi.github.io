(()=>{
'use strict';
if(window.__ARK_FIELD_PHOTO_UX_V2)return;
window.__ARK_FIELD_PHOTO_UX_V2=true;
window.__ARK_FIELD_PHOTO_UX_V1=true;

const STYLE_ID='arkFieldPhotoUxStyle';
const BAR_ID='arkFieldFlowBar';
const PROGRESS_ID='arkFieldFlowProgress';
let scheduled=false,lastBarKey='',lastProgressKey='';

function injectStyles(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
  body.ark-field-flow-active main{padding-bottom:calc(126px + env(safe-area-inset-bottom,0px))!important}
  #${BAR_ID}{position:fixed;z-index:2147482000;right:8px;left:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));max-width:640px;margin:auto;background:#fff;border:2px solid #1d6b4a;border-radius:16px;padding:9px 10px;box-shadow:0 10px 30px rgba(9,40,28,.28);direction:rtl}
  #${BAR_ID}[data-stage="review"]{border-color:#b57612;background:#fff8e9}#${BAR_ID}[data-stage="uploading"]{background:#eef8f2}#${BAR_ID}[data-stage="success"]{border-color:#167046;background:#eaf8f0}#${BAR_ID}[data-stage="error"]{border-color:#a22626;background:#fff1f1}
  .ark-flow-kicker{font-size:11px;font-weight:900;color:#68786f}.ark-flow-title{font-size:16px;font-weight:900;color:#173f31;line-height:1.35}.ark-flow-primary{width:100%;margin-top:7px;border:0;border-radius:12px;background:#176743;color:#fff;padding:12px;font-size:16px;font-weight:900;cursor:pointer;min-height:48px}.ark-flow-secondary{width:100%;margin-top:5px;border:1px solid #ccd9d1;border-radius:11px;background:#fff;color:#234437;padding:9px 12px;font-size:13px;font-weight:800;cursor:pointer}
  #${PROGRESS_ID}{margin:0 0 9px;padding:8px;background:#f6f9f7;border:1px solid #d8e5de;border-radius:12px}.ark-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.ark-step{font-size:11px;font-weight:800;text-align:center;padding:6px 3px;border-radius:9px;background:#edf1ef;color:#748179}.ark-step.done{background:#e6f4ec;color:#12633f}.ark-step.active{background:#fff1d8;color:#8a5b08;box-shadow:inset 0 0 0 1px #e4c17e}.ark-step.pending{background:#f2f4f3;color:#87918b}.ark-next{margin-top:6px;font-size:12px;font-weight:900;text-align:center;color:#5d4520}
  #photoEvidenceBox{margin-top:8px!important;padding:11px!important}#fieldPhotoPreview{max-height:min(25vh,210px)!important;margin-top:6px!important}#photoEvidenceBox #fieldPhotoTake,#photoEvidenceBox #fieldPhotoApprove,#photoEvidenceBox #fieldPhotoRetake{display:none!important}
  @media(max-width:600px){#scanMandatoryReceipt>div:first-child{display:none!important}#scanMandatoryReceipt h2{font-size:19px!important;margin:4px 0!important}#scanMandatoryReceipt>p{margin:4px 0!important;font-size:13px!important}#fieldPhotoPreview{max-height:22vh!important}}
  `;document.head.appendChild(s)
}
function removeBar(){const b=document.getElementById(BAR_ID);if(b)b.remove();document.body.classList.remove('ark-field-flow-active');lastBarKey=''}
function ensureBar(stage,title,buttonText,onPrimary,onSecondary,secondaryText){
  injectStyles();document.body.classList.add('ark-field-flow-active');let b=document.getElementById(BAR_ID);if(!b){b=document.createElement('div');b.id=BAR_ID;b.setAttribute('role','status');b.setAttribute('aria-live','polite');document.body.appendChild(b)}
  const key=[stage,title,buttonText||'',secondaryText||'',!!onSecondary].join('|');b.dataset.stage=stage;
  if(key!==lastBarKey){const kicker=stage==='camera'?'الخطوة 2 من 3':stage==='review'?'الخطوة 3 من 3':stage==='uploading'?'الخطوة الأخيرة':stage==='success'?'اكتملت العملية':'تنبيه';b.innerHTML='<div class="ark-flow-kicker">'+kicker+'</div><div class="ark-flow-title">'+title+'</div>'+(buttonText?'<button id="arkFlowPrimary" class="ark-flow-primary" type="button">'+buttonText+'</button>':'')+(onSecondary?'<button id="arkFlowSecondary" class="ark-flow-secondary" type="button">'+(secondaryText||'إعادة التصوير')+'</button>':'');lastBarKey=key}
  const p=b.querySelector('#arkFlowPrimary');if(p)p.onclick=onPrimary||null;const s=b.querySelector('#arkFlowSecondary');if(s)s.onclick=onSecondary||null
}
function ensureProgress(stage){
  const receipt=document.getElementById('scanMandatoryReceipt');if(!receipt)return;let p=document.getElementById(PROGRESS_ID);if(!p){p=document.createElement('div');p.id=PROGRESS_ID;receipt.insertBefore(p,receipt.firstChild)}
  const photoDone=['review','uploading','success'].includes(stage),sendDone=stage==='success';const s2=photoDone?'done':stage==='camera'?'active':'pending',s3=sendDone?'done':stage==='review'||stage==='uploading'?'active':'pending';const next=stage==='camera'?'المطلوب الآن: التقط صورة الموقع':stage==='review'?'الصورة التُقطت فقط — احفظها لإكمال التسجيل':stage==='uploading'?'جارٍ حفظ وإرسال الإثبات — لا تغلق الصفحة':stage==='success'?'تمت جميع الخطوات ويمكن إغلاق الصفحة':'';const key=[stage,next].join('|');if(key===lastProgressKey)return;p.innerHTML='<div class="ark-steps"><div class="ark-step done">1. البيانات ✓</div><div class="ark-step '+s2+'">2. الصورة '+(photoDone?'✓':'')+'</div><div class="ark-step '+s3+'">3. الحفظ '+(sendDone?'✓':'')+'</div></div><div class="ark-next">'+next+'</div>';lastProgressKey=key
}
function sync(){
  scheduled=false;injectStyles();const state=document.getElementById('state');if(!state){removeBar();return}const box=document.getElementById('photoEvidenceBox'),take=document.getElementById('fieldPhotoTake'),preview=document.getElementById('fieldPhotoPreview'),approve=document.getElementById('fieldPhotoApprove'),retake=document.getElementById('fieldPhotoRetake'),uploading=document.getElementById('fieldPhotoUploading'),txt=state.textContent||'';
  if(box&&uploading){ensureProgress('uploading');ensureBar('uploading','جارٍ حفظ الصورة وإكمال التسجيل… لا تغلق الصفحة.');return}
  if(box&&preview&&approve){ensureProgress('review');ensureBar('review','تم التقاط الصورة، لكن التسجيل لم يكتمل بعد.','حفظ الصورة وإنهاء التسجيل',()=>approve.click(),retake?()=>retake.click():null,'إعادة التصوير');return}
  if(box&&take){ensureProgress('camera');ensureBar('camera','التسجيل غير مكتمل. التقط صورة للموقع.','التقاط صورة للموقع',()=>take.click());return}
  if(txt.includes('اكتملت الخطوات المطلوبة ويمكن إغلاق الصفحة')||txt.includes('تم حفظ صورة الإثبات وربطها بالمسحة')){ensureProgress('success');ensureBar('success','✓ اكتمل التسجيل بالكامل. يمكنك إغلاق الصفحة الآن.');return}
  if(!document.getElementById('scanMandatoryReceipt')){removeBar();lastProgressKey=''}
}
function schedule(){if(scheduled)return;scheduled=true;(window.requestAnimationFrame||function(fn){return setTimeout(fn,16)})(sync)}
function boot(){injectStyles();schedule();const root=document.getElementById('app')||document.body;try{new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','disabled','src']})}catch(_){}window.addEventListener('pageshow',schedule);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});window.addEventListener('resize',schedule)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();