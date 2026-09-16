(()=>{
'use strict';
if(window.__ARK_FIELD_WORKFLOW_UX_V4)return;
window.__ARK_FIELD_WORKFLOW_UX_V4=true;
window.__ARK_FIELD_WORKFLOW_UX_V3=true;
window.__ARK_FIELD_WORKFLOW_UX_V2=true;

const STYLE='arkWorkflowUxStyle';
const BAR='arkWorkflowBar';
let scheduled=false,lastKey='',mirrored=null;

function addStyles(){
  if(document.getElementById(STYLE))return;
  const s=document.createElement('style');s.id=STYLE;s.textContent=`
  body.ark-workflow-active main{padding-bottom:calc(126px + env(safe-area-inset-bottom,0px))!important}
  #${BAR}{position:fixed;z-index:2147481000;right:8px;left:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));max-width:640px;margin:auto;background:#fff;border:2px solid #1d6b4a;border-radius:16px;padding:9px 10px;box-shadow:0 10px 30px rgba(9,40,28,.24);direction:rtl;pointer-events:auto}
  #${BAR}[data-stage="warn"]{border-color:#b67817;background:#fffaf0}#${BAR}[data-stage="busy"]{border-color:#2d6b54;background:#f1f8f4}#${BAR}[data-stage="error"]{border-color:#a22626;background:#fff3f3}#${BAR}[data-stage="ready"]{border-color:#1d6b4a;background:#fff}
  .ark-wf-kicker{font-size:11px;font-weight:900;color:#718079}.ark-wf-title{font-size:15px;font-weight:900;color:#173f31;line-height:1.35}.ark-wf-sub{font-size:11px;color:#6f7b74;margin-top:2px;line-height:1.4}.ark-wf-btn{width:100%;margin-top:7px;border:0;border-radius:12px;background:#176743;color:#fff;padding:12px;font-size:16px;font-weight:900;cursor:pointer;min-height:48px}.ark-wf-btn:disabled{opacity:.48;cursor:not-allowed}
  body.ark-keyboard-open #${BAR}{display:none!important}
  @media(max-width:600px){body.ark-workflow-active .ark-wf-mirrored{display:none!important}}
  @media print{#${BAR}{display:none!important}body.ark-workflow-active main{padding-bottom:0!important}.ark-wf-mirrored{display:inline-block!important}}
  `;document.head.appendChild(s);
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function visible(el){if(!el)return false;const st=getComputedStyle(el);return st.display!=='none'&&st.visibility!=='hidden'&&!el.classList.contains('hidden')}
function text(el){return (el&&el.textContent||'').trim()}
function isScan(){return !!(document.getElementById('f')&&document.getElementById('nid')&&document.getElementById('phone')&&!document.getElementById('count'))}
function photoActive(){return !!(document.getElementById('photoEvidenceBox')||document.getElementById('arkFieldFlowBar')||document.getElementById('scanMandatoryReceipt'))}
function textEntryFocused(){const a=document.activeElement;return !!(a&&a.tagName==='INPUT'&&!['radio','checkbox','button','submit','hidden'].includes(String(a.type||'').toLowerCase()))}
function markMirrored(el){if(mirrored===el)return;if(mirrored)mirrored.classList.remove('ark-wf-mirrored');mirrored=el||null;if(mirrored)mirrored.classList.add('ark-wf-mirrored')}
function removeBar(){const b=document.getElementById(BAR);if(b)b.remove();document.body.classList.remove('ark-workflow-active');markMirrored(null);lastKey=''}
function setBar(stage,kicker,title,buttonText,target,sub='',enabled=true){
  addStyles();document.body.classList.add('ark-workflow-active');
  let b=document.getElementById(BAR);if(!b){b=document.createElement('div');b.id=BAR;b.setAttribute('role','status');b.setAttribute('aria-live','polite');document.body.appendChild(b)}
  const key=[stage,kicker,title,buttonText,sub,enabled?'1':'0'].join('|');b.dataset.stage=stage;
  if(key!==lastKey){b.innerHTML='<div class="ark-wf-kicker">'+esc(kicker)+'</div><div class="ark-wf-title">'+esc(title)+'</div>'+(sub?'<div class="ark-wf-sub">'+esc(sub)+'</div>':'')+(buttonText?'<button id="arkWorkflowPrimary" class="ark-wf-btn" type="button" '+(enabled?'':'disabled')+'>'+esc(buttonText)+'</button>':'');lastKey=key}
  const p=b.querySelector('#arkWorkflowPrimary');if(p){p.disabled=!enabled;p.onclick=()=>{if(!enabled||!target)return;try{target.click()}catch(_){}}}
  markMirrored(target&&target.nodeType===1?target:null);
}
function syncScan(){
  if(photoActive()){removeBar();return}
  const f=document.getElementById('f'),send=document.getElementById('send'),state=document.getElementById('state'),gps=document.getElementById('gps');if(!f||!send){removeBar();return}
  if(textEntryFocused()||document.body.classList.contains('ark-keyboard-open'))return;
  if(!visible(f)){markMirrored(null);const st=text(state);if(/تم حفظ المسحة على الجهاز/.test(st)){setBar('warn','التسجيل غير مكتمل','تم حفظ البيانات محلياً بانتظار الاتصال.','',null,'لا تغلق الصفحة حتى يكتمل الإثبات.');return}if(/تعذر|خطأ|فشل/.test(st)){setBar('error','يلزم إجراء','لم تكتمل العملية. راجع الرسالة الظاهرة.','',null,'أعد المحاولة قبل إغلاق الصفحة.');return}if(/تم تسجيل التواجد|المسحة مسجلة مسبقاً/.test(st)){setBar('busy','الخطوة التالية','جارٍ تجهيز صورة الإثبات…','',null,'لا تغلق الصفحة الآن.');return}removeBar();return}
  const busy=!!send.disabled||/جارٍ/.test(send.textContent||'')||/جارٍ/.test(text(gps));if(busy){setBar('busy','الخطوة 2 من 3','جارٍ تحديد الموقع وتسجيل البيانات…','',null,'لا تغلق الصفحة.');return}
  const nid=document.getElementById('nid'),phone=document.getElementById('phone'),action=document.querySelector('input[name="arkShiftAction"]:checked');const nidOk=/^[12][0-9]{9}$/.test(String(nid&&nid.value||'').trim());const pval=String(phone&&phone.value||'').replace(/[\s-]/g,'');const phoneOk=/^(?:\+?966|00966|0)?5\d{8}$/.test(pval)||pval.length>=9;const ready=nidOk&&phoneOk&&!!action;
  setBar(ready?'ready':'warn','الخطوة 1 من 3',ready?'البيانات جاهزة. التالي تحديد الموقع.':'أكمل الهوية والجوال واختر نوع العملية.','متابعة وإثبات التواجد',send,ready?'بعد الموقع ستظهر صورة الإثبات.':'لن يتم الإرسال قبل اكتمال البيانات.',ready);
}
function sync(){scheduled=false;addStyles();if(isScan())syncScan();else removeBar()}
function schedule(){if(scheduled)return;scheduled=true;(window.requestAnimationFrame||function(fn){return setTimeout(fn,16)})(sync)}
function boot(){addStyles();schedule();const root=document.getElementById('app')||document.body;try{new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled']})}catch(_){}document.addEventListener('input',schedule,true);document.addEventListener('change',schedule,true);document.addEventListener('focusin',schedule,true);document.addEventListener('focusout',()=>setTimeout(schedule,220),true);window.addEventListener('pageshow',schedule);window.addEventListener('resize',schedule);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();