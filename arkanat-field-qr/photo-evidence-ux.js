(()=>{
'use strict';
if(window.__ARK_FIELD_PHOTO_UX_V1)return;
window.__ARK_FIELD_PHOTO_UX_V1=true;

const STYLE_ID='arkFieldPhotoUxStyle';
const BAR_ID='arkFieldFlowBar';
const PROGRESS_ID='arkFieldFlowProgress';
let lastStage='';
let lastFocusKey='';

function injectStyles(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
  html{scroll-behavior:smooth}
  body.ark-field-flow-active main{padding-bottom:calc(122px + env(safe-area-inset-bottom,0px))!important}
  #${BAR_ID}{position:fixed;z-index:10000;right:10px;left:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));max-width:640px;margin:auto;background:#fff;border:2px solid #1d6b4a;border-radius:16px;padding:10px 11px;box-shadow:0 12px 36px rgba(9,40,28,.24);direction:rtl}
  #${BAR_ID}[data-stage="review"]{border-color:#a96b10;background:#fffaf0}
  #${BAR_ID}[data-stage="uploading"]{border-color:#1d6b4a;background:#f1f8f4}
  #${BAR_ID}[data-stage="success"]{border-color:#167046;background:#effaf4}
  #${BAR_ID}[data-stage="error"]{border-color:#a22626;background:#fff3f3}
  .ark-flow-line{display:flex;align-items:center;gap:9px}.ark-flow-copy{flex:1;min-width:0}.ark-flow-kicker{font-size:11px;font-weight:900;color:#68786f}.ark-flow-title{font-size:15px;font-weight:900;color:#173f31;line-height:1.35}.ark-flow-warn{color:#8a5b08}.ark-flow-ok{color:#12633f}.ark-flow-bad{color:#9e2727}.ark-flow-primary{width:100%;margin-top:8px;border:0;border-radius:12px;background:#176743;color:#fff;padding:13px 14px;font-size:16px;font-weight:900;cursor:pointer}.ark-flow-primary.review{background:#176743}.ark-flow-primary:disabled{opacity:.62}.ark-flow-secondary{width:100%;margin-top:6px;border:1px solid #ccd9d1;border-radius:11px;background:#fff;color:#234437;padding:9px 12px;font-size:13px;font-weight:800;cursor:pointer}
  #${PROGRESS_ID}{margin:0 0 12px;padding:9px 8px;background:#f6f9f7;border:1px solid #d8e5de;border-radius:12px}.ark-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.ark-step{font-size:11px;font-weight:800;text-align:center;padding:6px 3px;border-radius:9px;background:#edf1ef;color:#748179}.ark-step.done{background:#e6f4ec;color:#12633f}.ark-step.active{background:#fff1d8;color:#8a5b08;box-shadow:inset 0 0 0 1px #e4c17e}.ark-step.pending{background:#f2f4f3;color:#87918b}.ark-next{margin-top:7px;font-size:13px;font-weight:900;text-align:center;color:#5d4520}
  #photoEvidenceBox{margin-top:10px!important;padding:12px!important}
  #fieldPhotoPreview{max-height:min(34vh,250px)!important;margin-top:7px!important}
  #photoEvidenceBox #fieldPhotoTake,#photoEvidenceBox #fieldPhotoApprove,#photoEvidenceBox #fieldPhotoRetake{display:none!important}
  #photoEvidenceBox .sub{font-size:12px!important}
  @media(max-width:600px){main{padding-top:14px!important}.card{padding:16px!important}.brand{font-size:23px!important}#scanMandatoryReceipt>div:first-child{font-size:38px!important}#scanMandatoryReceipt h2{font-size:20px!important;margin:5px 0!important}#scanMandatoryReceipt>p{margin:5px 0!important}#photoEvidenceBox{scroll-margin-top:8px!important}#fieldPhotoPreview{max-height:31vh!important}}
  `;document.head.appendChild(s);
}

function removeBar(){const b=document.getElementById(BAR_ID);if(b)b.remove();document.body.classList.remove('ark-field-flow-active');lastStage=''}
function ensureBar(stage,title,buttonText,onPrimary,onSecondary,secondaryText){
  injectStyles();document.body.classList.add('ark-field-flow-active');
  let b=document.getElementById(BAR_ID);if(!b){b=document.createElement('div');b.id=BAR_ID;b.setAttribute('role','status');b.setAttribute('aria-live','polite');document.body.appendChild(b)}
  b.dataset.stage=stage;
  const cls=stage==='success'?'ark-flow-ok':stage==='error'?'ark-flow-bad':stage==='review'?'ark-flow-warn':'';
  b.innerHTML='<div class="ark-flow-line"><div class="ark-flow-copy"><div class="ark-flow-kicker">'+(stage==='camera'?'الخطوة 2 من 3':stage==='review'?'الخطوة 3 من 3':stage==='uploading'?'الخطوة الأخيرة':stage==='success'?'اكتملت العملية':'تنبيه')+'</div><div class="ark-flow-title '+cls+'">'+title+'</div></div></div>'+(buttonText?'<button id="arkFlowPrimary" class="ark-flow-primary '+(stage==='review'?'review':'')+'" type="button">'+buttonText+'</button>':'')+(onSecondary?'<button id="arkFlowSecondary" class="ark-flow-secondary" type="button">'+(secondaryText||'إعادة التصوير')+'</button>':'');
  const p=b.querySelector('#arkFlowPrimary');if(p&&onPrimary)p.onclick=onPrimary;
  const s=b.querySelector('#arkFlowSecondary');if(s&&onSecondary)s.onclick=onSecondary;
  lastStage=stage;
}

function ensureProgress(stage){
  const receipt=document.getElementById('scanMandatoryReceipt');if(!receipt)return;
  let p=document.getElementById(PROGRESS_ID);if(!p){p=document.createElement('div');p.id=PROGRESS_ID;receipt.insertBefore(p,receipt.firstChild)}
  const photoDone=['review','uploading','success'].includes(stage),sendDone=stage==='success';
  const s2=photoDone?'done':stage==='camera'?'active':'pending';
  const s3=sendDone?'done':stage==='review'||stage==='uploading'?'active':'pending';
  const next=stage==='camera'?'المطلوب الآن: التقط صورة للموقع':stage==='review'?'الصورة التُقطت، لكن العملية لم تنتهِ — اضغط إرسال وإنهاء التسجيل':stage==='uploading'?'جارٍ إرسال الإثبات — لا تغلق الصفحة':stage==='success'?'تمت جميع الخطوات ويمكن إغلاق الصفحة':'';
  p.innerHTML='<div class="ark-steps"><div class="ark-step done">1. البيانات ✓</div><div class="ark-step '+s2+'">2. الصورة '+(photoDone?'✓':'')+'</div><div class="ark-step '+s3+'">3. الإرسال '+(sendDone?'✓':'')+'</div></div><div class="ark-next">'+next+'</div>';
}

function compactFocus(key,el){
  if(!el||lastFocusKey===key)return;lastFocusKey=key;
  setTimeout(()=>{try{const r=el.getBoundingClientRect();const y=Math.max(0,window.scrollY+r.top-86);window.scrollTo({top:y,behavior:'smooth'})}catch(_){}},120);
}

function sync(){
  injectStyles();
  const state=document.getElementById('state');if(!state)return;
  const box=document.getElementById('photoEvidenceBox');
  const take=document.getElementById('fieldPhotoTake');
  const preview=document.getElementById('fieldPhotoPreview');
  const approve=document.getElementById('fieldPhotoApprove');
  const retake=document.getElementById('fieldPhotoRetake');
  const uploading=document.getElementById('fieldPhotoUploading');
  const txt=state.textContent||'';

  if(box&&uploading){
    ensureProgress('uploading');ensureBar('uploading','جارٍ حفظ الصورة وإكمال التسجيل… لا تغلق الصفحة.',null);compactFocus('uploading',box);return;
  }
  if(box&&preview&&approve){
    ensureProgress('review');
    ensureBar('review','الصورة التُقطت فقط. التسجيل لم يكتمل بعد.', 'إرسال الصورة وإنهاء التسجيل',()=>approve.click(),retake?()=>retake.click():null,'إعادة التصوير');
    compactFocus('review',box);return;
  }
  if(box&&take){
    ensureProgress('camera');
    ensureBar('camera','التسجيل غير مكتمل. المطلوب الآن تصوير الموقع.', 'التقاط صورة للموقع',()=>take.click());
    compactFocus('camera',box);return;
  }
  if(txt.includes('اكتملت الخطوات المطلوبة ويمكن إغلاق الصفحة')||txt.includes('تم حفظ صورة الإثبات وربطها بالمسحة')){
    ensureProgress('success');ensureBar('success','✓ تم التسجيل بالكامل. يمكنك إغلاق الصفحة الآن.',null);lastFocusKey='success';return;
  }
  if(txt.includes('التسجيل غير مكتمل')&&(txt.includes('تعذر')||txt.includes('أعد المحاولة'))){
    ensureBar('error','التسجيل غير مكتمل. نفّذ الإجراء الظاهر في الصفحة قبل الإغلاق.',null);return;
  }
  if(!document.getElementById('scanMandatoryReceipt'))removeBar();
}

function boot(){injectStyles();sync();const root=document.getElementById('app')||document.body;const mo=new MutationObserver(()=>queueMicrotask(sync));mo.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','disabled','src']});window.addEventListener('pageshow',()=>setTimeout(sync,60));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(sync,80)});window.addEventListener('resize',()=>setTimeout(sync,80));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
