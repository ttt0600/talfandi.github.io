(()=>{
'use strict';
if(window.__ARK_FIELD_WORKFLOW_UX_V1)return;
window.__ARK_FIELD_WORKFLOW_UX_V1=true;

const STYLE='arkWorkflowUxStyle';
const BAR='arkWorkflowBar';
const GUIDE='arkWorkflowGuide';
let lastKey='';

function addStyles(){
  if(document.getElementById(STYLE))return;
  const s=document.createElement('style');s.id=STYLE;s.textContent=`
  body.ark-workflow-active main{padding-bottom:calc(118px + env(safe-area-inset-bottom,0px))!important}
  #${BAR}{position:fixed;z-index:9800;right:10px;left:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));max-width:640px;margin:auto;background:#fff;border:2px solid #1d6b4a;border-radius:16px;padding:10px 11px;box-shadow:0 12px 36px rgba(9,40,28,.22);direction:rtl}
  #${BAR}[data-stage="warn"]{border-color:#b67817;background:#fffaf0}#${BAR}[data-stage="busy"]{border-color:#2d6b54;background:#f1f8f4}#${BAR}[data-stage="error"]{border-color:#a22626;background:#fff3f3}#${BAR}[data-stage="done"]{border-color:#167046;background:#effaf4}
  .ark-wf-line{display:flex;gap:9px;align-items:center}.ark-wf-copy{flex:1;min-width:0}.ark-wf-kicker{font-size:11px;font-weight:900;color:#718079}.ark-wf-title{font-size:15px;font-weight:900;color:#173f31;line-height:1.35}.ark-wf-sub{font-size:11px;color:#6f7b74;margin-top:2px;line-height:1.4}.ark-wf-btn{width:100%;margin-top:8px;border:0;border-radius:12px;background:#176743;color:#fff;padding:13px 14px;font-size:16px;font-weight:900;cursor:pointer}.ark-wf-btn.soft{background:#edf4f0;color:#194d37;border:1px solid #d3e1d9}.ark-wf-btn:disabled{opacity:.58;cursor:default}
  #${GUIDE}{margin:0 0 12px;padding:9px 8px;background:#f6f9f7;border:1px solid #d8e5de;border-radius:12px}.ark-wf-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.ark-wf-step{font-size:11px;font-weight:800;text-align:center;padding:6px 3px;border-radius:9px;background:#edf1ef;color:#748179}.ark-wf-step.on{background:#fff1d8;color:#8a5b08;box-shadow:inset 0 0 0 1px #e4c17e}.ark-wf-step.done{background:#e6f4ec;color:#12633f}.ark-wf-next{margin-top:7px;font-size:12px;font-weight:900;text-align:center;color:#5d4520}
  @media(max-width:600px){main{padding-top:12px!important}.card{padding:15px!important;margin-top:12px!important}.brand{font-size:22px!important}.sub{line-height:1.55!important}label{margin-top:9px!important}input{padding:11px 12px!important}.actions{margin-top:12px!important}.note{margin:8px 0!important;padding:10px 12px!important}details{margin-top:14px!important;padding-top:11px!important}.ark-shift{margin-top:11px!important}.ark-shift-opt span{min-height:50px!important}.rp-results{max-height:34vh!important}}
  @media print{#${BAR},#${GUIDE}{display:none!important}body.ark-workflow-active main{padding-bottom:0!important}}
  `;document.head.appendChild(s);
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function visible(el){if(!el)return false;const st=getComputedStyle(el);return st.display!=='none'&&st.visibility!=='hidden'&&!el.classList.contains('hidden')}
function text(el){return (el&&el.textContent||'').trim()}
function photoFlowActive(){return !!(document.getElementById('photoEvidenceBox')||document.getElementById('arkFieldFlowBar')||document.getElementById('scanMandatoryReceipt'))}
function route(){
  if(photoFlowActive())return'photo';
  if(document.getElementById('rpShareUrl')||document.getElementById('sharePrint'))return'share';
  if(document.getElementById('count')&&document.getElementById('name'))return'ops';
  if(document.getElementById('nid')&&document.getElementById('phone')&&!document.getElementById('count'))return'scan';
  return'other';
}
function removeBar(){const b=document.getElementById(BAR);if(b)b.remove();document.body.classList.remove('ark-workflow-active');lastKey=''}
function setBar(stage,kicker,title,buttonText,action,sub=''){
  addStyles();document.body.classList.add('ark-workflow-active');
  let b=document.getElementById(BAR);if(!b){b=document.createElement('div');b.id=BAR;b.setAttribute('role','status');b.setAttribute('aria-live','polite');document.body.appendChild(b)}
  b.dataset.stage=stage;
  const key=[stage,kicker,title,buttonText,sub].join('|');
  if(key===lastKey)return;
  b.innerHTML='<div class="ark-wf-line"><div class="ark-wf-copy"><div class="ark-wf-kicker">'+esc(kicker)+'</div><div class="ark-wf-title">'+esc(title)+'</div>'+(sub?'<div class="ark-wf-sub">'+esc(sub)+'</div>':'')+'</div></div>'+(buttonText?'<button id="arkWorkflowPrimary" class="ark-wf-btn" type="button">'+esc(buttonText)+'</button>':'');
  const p=b.querySelector('#arkWorkflowPrimary');if(p&&action)p.onclick=action;
  lastKey=key;
}
function removeGuide(){const g=document.getElementById(GUIDE);if(g)g.remove()}
function setGuide(kind,active){
  let host=document.getElementById('f');if(!host||!visible(host)){removeGuide();return}
  let g=document.getElementById(GUIDE);if(!g){g=document.createElement('div');g.id=GUIDE;host.insertBefore(g,host.firstChild)}
  let labels,next;
  if(kind==='scan'){
    labels=['1. البيانات','2. الموقع','3. الإثبات'];
    next=active===1?'المطلوب الآن: أدخل البيانات واختر نوع العملية، ثم اضغط متابعة.':active===2?'جارٍ التحقق من الموقع وتسجيل التواجد. لا تغلق الصفحة.':'بعد حفظ البيانات ستظهر خطوة صورة الإثبات.';
  }else{
    labels=['1. بيانات المشرف','2. إنشاء QR','3. الطباعة'];
    next=active===1?'المطلوب الآن: أدخل بيانات المشرف وعدد الأكواد.':active===2?'جارٍ إنشاء الأكواد. انتظر حتى تظهر رسالة النجاح.':'بعد الإنشاء استخدم زر الطباعة الظاهر أسفل الشاشة.';
  }
  g.innerHTML='<div class="ark-wf-steps">'+labels.map((x,i)=>'<div class="ark-wf-step '+(i+1<active?'done':i+1===active?'on':'')+'">'+x+(i+1<active?' ✓':'')+'</div>').join('')+'</div><div class="ark-wf-next">'+esc(next)+'</div>';
}
function click(el){if(!el||el.disabled)return;try{el.click()}catch(_){}}
function scanSync(){
  const f=document.getElementById('f'),send=document.getElementById('send'),state=document.getElementById('state'),gps=document.getElementById('gps');
  if(!f||!send)return removeBar();
  if(!visible(f)){
    removeGuide();
    const st=text(state);
    if(/تم حفظ المسحة على الجهاز/.test(st)){setBar('warn','التسجيل غير مكتمل','تم حفظ البيانات محلياً بانتظار الاتصال.','',null,'لا تعتبر العملية منتهية حتى يكتمل الإرسال وصورة الإثبات.');return}
    if(/تعذر|خطأ|فشل/.test(st)){setBar('error','يلزم إجراء','لم تكتمل العملية. راجع الرسالة الظاهرة وأعد المحاولة.','',null,'لا تغلق الصفحة قبل ظهور تأكيد الاكتمال.');return}
    if(/تم تسجيل التواجد|المسحة مسجلة مسبقاً/.test(st)){setBar('busy','الخطوة التالية','تم حفظ بيانات التواجد الأولية. انتظر خطوة صورة الإثبات.','',null,'لا تغلق الصفحة الآن.');return}
    removeBar();return;
  }
  const busy=send.disabled||/جارٍ/.test(send.textContent||'')||/جارٍ/.test(text(gps));
  if(busy){setGuide('scan',2);setBar('busy','الخطوة 2 من 3','جارٍ تحديد الموقع وتسجيل البيانات… لا تغلق الصفحة.','');return}
  setGuide('scan',1);
  const nid=document.getElementById('nid'),phone=document.getElementById('phone'),action=document.querySelector('input[name="arkShiftAction"]:checked');
  const missing=!String(nid&&nid.value||'').trim()||!String(phone&&phone.value||'').trim()||!action;
  setBar(missing?'warn':'ready','الخطوة 1 من 3',missing?'أكمل البيانات المطلوبة واختر نوع العملية.':'البيانات جاهزة. انتقل للتحقق من الموقع.','متابعة وإثبات التواجد',()=>click(send),missing?'لن يتم الإرسال قبل استكمال الحقول الإلزامية.':'سيطلب الموقع ثم تظهر صورة الإثبات قبل اكتمال العملية.');
}
function opsSync(){
  const f=document.getElementById('f'),send=document.getElementById('send'),state=document.getElementById('state'),printArea=document.getElementById('printArea');
  const replaceBtn=document.getElementById('replaceBtn'),replaceDetails=replaceBtn&&replaceBtn.closest('details');
  const rp=document.getElementById('reprintCenter');
  if(rp&&rp.open){
    removeGuide();
    const rs=document.getElementById('rpState'),search=document.getElementById('rpSearchBtn'),reprint=document.getElementById('rpReprint'),share=document.getElementById('rpShare');
    const s=text(rs);
    if(/spin/.test(rs&&rs.innerHTML||'')){setBar('busy','إعادة الطباعة','جارٍ تنفيذ الطلب… انتظر النتيجة.','');return}
    if(document.getElementById('rpShareUrl')){const cp=document.getElementById('rpCopy');setBar('done','تم إنشاء الرابط','الرابط جاهز. انسخه وأرسله للمشرف.','نسخ الرابط',()=>click(cp));return}
    if(reprint&&!reprint.disabled){setBar('ready','إعادة الطباعة','تم اختيار الدفعات. اختر الإجراء المطلوب.','إعادة طباعة المحدد',()=>click(reprint),'يمكن استخدام «إنشاء رابط للمشرف» من نفس القسم إذا كان المطلوب إرسالها إلكترونياً.');return}
    if(search){setBar('ready','إعادة الطباعة','ابحث أولاً ثم اختر الدفعة المطلوبة.','بحث',()=>click(search));return}
  }
  if(replaceDetails&&replaceDetails.open&&replaceBtn){removeGuide();const st=document.getElementById('replaceState');if(/spin/.test(st&&st.innerHTML||'')){setBar('busy','استبدال QR','جارٍ إنشاء البديل… لا تكرر الطلب.','');return}setBar('warn','استبدال QR','سيتم إيقاف الرمز القديم عند نجاح إنشاء البديل.','إنشاء البديل',()=>click(replaceBtn),'استخدم هذا الإجراء فقط للرمز التالف أو المفقود.');return}
  if(f&&visible(f)&&send){
    const busy=send.disabled||/جارٍ/.test(send.textContent||'');
    setGuide('ops',busy?2:1);
    if(busy){setBar('busy','الخطوة 2 من 3','جارٍ إنشاء أكواد QR… لا تغلق الصفحة.','');return}
    setBar('ready','الخطوة 1 من 3','أدخل بيانات المشرف ثم أنشئ الأكواد.','إنشاء الأكواد',()=>click(send),'لن تعتبر العملية مكتملة حتى تظهر الأكواد وزر الطباعة.');return;
  }
  removeGuide();
  if(printArea&&visible(printArea)){
    const printBtn=[...printArea.querySelectorAll('button')].find(b=>/طباعة|PDF/.test(text(b)));
    setBar('done','الخطوة 3 من 3','تم إنشاء الأكواد بنجاح. أصبحت جاهزة للطباعة أو الحفظ.','طباعة / حفظ PDF',()=>printBtn?click(printBtn):window.print());return;
  }
  const st=text(state);if(/تعذر|خطأ|فشل/.test(st)){setBar('error','تعذر إكمال العملية','راجع الخطأ الظاهر ثم استخدم زر إعادة المحاولة.','');return}
  removeBar();
}
function shareSync(){
  removeGuide();
  const url=document.getElementById('rpShareUrl'),copy=document.getElementById('rpCopy');
  if(url&&copy){setBar('done','الرابط جاهز','تم إنشاء رابط المشرف. انسخه قبل مغادرة الصفحة.','نسخ الرابط',()=>click(copy));return}
  const print=document.getElementById('sharePrint');
  if(print){const st=document.getElementById('shareState'),txt=text(st);if(/تعذر|خطأ|فشل/.test(txt)){setBar('error','تعذر تحميل الأكواد','راجع الرسالة الظاهرة قبل إغلاق الصفحة.','');return}if(/تم تحميل/.test(txt)){setBar('done','الأكواد جاهزة','تم تحميل أكواد QR المعتمدة.','طباعة / حفظ PDF',()=>click(print));return}setBar('busy','جارٍ التحميل','جارٍ تحميل الأكواد المعتمدة… انتظر.','');return}
  removeBar();
}
function sync(){
  addStyles();
  if(photoFlowActive()){removeGuide();removeBar();return}
  const r=route();
  if(r==='scan')scanSync();else if(r==='ops')opsSync();else if(r==='share')shareSync();else{removeGuide();removeBar()}
}
function boot(){
  addStyles();sync();
  const root=document.getElementById('app')||document.body;
  const mo=new MutationObserver(()=>queueMicrotask(sync));
  mo.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','disabled','open','value']});
  document.addEventListener('input',()=>queueMicrotask(sync),true);document.addEventListener('change',()=>queueMicrotask(sync),true);document.addEventListener('toggle',()=>queueMicrotask(sync),true);
  window.addEventListener('pageshow',()=>setTimeout(sync,60));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(sync,80)});window.addEventListener('resize',()=>setTimeout(sync,80));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();