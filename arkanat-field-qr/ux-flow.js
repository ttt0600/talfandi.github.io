(()=>{
'use strict';
if(window.__ARK_FIELD_UX_FLOW_V1)return;
window.__ARK_FIELD_UX_FLOW_V1=true;

const DOCK_ID='arkScanFlowDock';
let lastStage='';
let finalScrolled=false;

function isScan(){
  try{
    if(window.__ARK_FIELD_ROUTE==='scan')return true;
    if(typeof TOKEN!=='undefined'&&TOKEN)return true;
    return !!sessionStorage.getItem('arkanat_field_token_v5');
  }catch(_){return false}
}
function addStyle(){
  if(document.getElementById('arkScanFlowStyle'))return;
  const s=document.createElement('style');s.id='arkScanFlowStyle';
  s.textContent=`
  #${DOCK_ID}{position:fixed;z-index:2147483000;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));max-width:620px;margin:auto;background:#173f31;color:#fff;border-radius:15px;padding:11px 13px;box-shadow:0 8px 30px rgba(0,0,0,.28);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;direction:rtl;transition:opacity .18s ease,transform .18s ease}
  #${DOCK_ID}.ark-done{background:#12633f}#${DOCK_ID}.ark-warn{background:#8a5a12}
  #${DOCK_ID} .ark-flow-title{font-weight:900;font-size:15px;line-height:1.45}#${DOCK_ID} .ark-flow-sub{font-size:12px;line-height:1.55;opacity:.92;margin-top:2px}
  body.ark-photo-auto #fieldPhotoPreview{display:none!important}
  body.ark-photo-auto #fieldPhotoApprove,body.ark-photo-auto #fieldPhotoRetake{display:none!important}
  body.ark-photo-auto #photoEvidenceBox .actions:has(#fieldPhotoApprove){display:none!important}
  body.ark-photo-stage #scanMandatoryReceipt>div:first-child{display:none!important}
  body.ark-photo-stage #scanMandatoryReceipt>h2{font-size:20px!important;margin:4px 0!important}
  body.ark-photo-stage #scanMandatoryReceipt>p{margin:5px 0!important;font-size:14px!important}
  body.ark-photo-stage #photoEvidenceBox{margin-top:8px!important;padding:13px!important}
  body.ark-photo-stage #photoEvidenceBox>p{margin:5px 0!important}
  @media(max-width:480px){body{padding-bottom:92px!important}#${DOCK_ID}{left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));padding:10px 12px;border-radius:14px}}
  `;
  document.head.appendChild(s);
}
function dock(){
  let d=document.getElementById(DOCK_ID);if(d)return d;
  d=document.createElement('div');d.id=DOCK_ID;d.setAttribute('role','status');d.setAttribute('aria-live','polite');
  d.innerHTML='<div class="ark-flow-title"></div><div class="ark-flow-sub"></div>';
  document.body.appendChild(d);return d;
}
function show(stage,title,sub,cls=''){
  if(!isScan())return;
  addStyle();const d=dock();
  d.className=cls;d.querySelector('.ark-flow-title').textContent=title;d.querySelector('.ark-flow-sub').textContent=sub||'';
  if(lastStage!==stage){lastStage=stage;d.style.opacity='1';d.style.transform='translateY(0)'}
}
function hideDock(){const d=document.getElementById(DOCK_ID);if(d)d.remove()}
function visible(el){return !!(el&&el.offsetParent!==null&&!el.classList.contains('hidden'))}
function finalizeScroll(){
  if(finalScrolled)return;finalScrolled=true;
  setTimeout(()=>{try{const st=document.getElementById('state');(st||document.querySelector('main')||document.body).scrollIntoView({behavior:'smooth',block:'start'})}catch(_){}},80);
}
function autoSubmitPhoto(){
  const approve=document.getElementById('fieldPhotoApprove');
  if(!approve||approve.dataset.arkAutoSubmitted==='1')return false;
  approve.dataset.arkAutoSubmitted='1';document.body.classList.add('ark-photo-auto','ark-photo-stage');
  show('photo-saving','الخطوة الأخيرة — جارٍ حفظ الصورة وإكمال التسجيل','لا تغلق الصفحة. لا تحتاج إلى الضغط على زر آخر؛ سيتم الإرسال تلقائياً.');
  try{approve.click()}catch(_){}
  return true;
}
function sync(){
  if(!isScan()){hideDock();return}
  addStyle();
  const state=document.getElementById('state'),text=(state&&state.textContent||'').replace(/\s+/g,' ').trim();
  const photoBox=document.getElementById('photoEvidenceBox'),photoInput=document.getElementById('fieldPhotoInput');
  const uploading=document.getElementById('fieldPhotoUploading');
  const form=document.getElementById('f'),send=document.getElementById('send'),gps=document.getElementById('gps');

  if(text.includes('اكتملت الخطوات المطلوبة ويمكن إغلاق الصفحة')||(text.includes('تم تسجيل التواجد')&&text.includes('صورة الإثبات'))){
    document.body.classList.remove('ark-photo-auto','ark-photo-stage');
    show('done','✓ اكتمل التسجيل بالكامل','تم حفظ المسحة وصورة الإثبات. يمكنك الآن إغلاق الصفحة.','ark-done');finalizeScroll();return;
  }
  finalScrolled=false;
  if(uploading||autoSubmitPhoto()){
    document.body.classList.add('ark-photo-stage');
    show('photo-saving','الخطوة الأخيرة — جارٍ حفظ الصورة وإكمال التسجيل','لا تغلق الصفحة. سيظهر تأكيد واضح عند اكتمال العملية.');return;
  }
  if(photoBox||photoInput||text.includes('صورة الإثبات إلزامية')||text.includes('التسجيل غير مكتمل حتى التقاط صورة الإثبات')){
    document.body.classList.remove('ark-photo-auto');document.body.classList.add('ark-photo-stage');
    show('photo','الخطوة 4 من 4 — التقط صورة الموقع','بعد اختيار «استخدام الصورة» من الكاميرا سيحفظ النظام الصورة ويرسلها تلقائياً. لا توجد خطوة حفظ إضافية.');return;
  }
  document.body.classList.remove('ark-photo-auto','ark-photo-stage');
  if(text.includes('جارٍ استكمال تسجيل التواجد')||text.includes('جارٍ تجهيز خطوة التصوير')){
    show('prepare-photo','الخطوة 3 من 4 — جارٍ تجهيز التصوير','لا تغلق الصفحة. ستظهر الكاميرا كخطوة أخيرة لإكمال التسجيل.');return;
  }
  if(send&&send.disabled||text.includes('جارٍ الإرسال')||(gps&&/جارٍ تحديد موقعك|تم تجهيز الموقع/.test(gps.textContent||''))){
    show('sending','الخطوة 3 من 4 — التحقق من الموقع وحفظ البيانات','الموقع إلزامي. انتظر حتى ينتقل النظام تلقائياً إلى التصوير.');return;
  }
  if(form&&visible(form)){
    show('form','الخطوة 1 من 4 — أدخل البيانات واختر نوع العملية','الهوية والجوال ونوع العملية والموقع والصورة كلها مطلوبة لإكمال التسجيل.');return;
  }
  if(text.includes('غير مكتمل')||text.includes('لا تغلق الصفحة')){
    show('incomplete','التسجيل غير مكتمل','تابع الخطوة الظاهرة على الشاشة حتى يظهر لك «اكتمل التسجيل بالكامل».','ark-warn');return;
  }
}

function boot(){if(!isScan())return;addStyle();sync();const mo=new MutationObserver(sync);try{mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','disabled']})}catch(_){};document.addEventListener('change',()=>setTimeout(sync,0),true);document.addEventListener('click',()=>setTimeout(sync,0),true);window.addEventListener('pageshow',sync);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(sync,50)});setInterval(sync,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();