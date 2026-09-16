(()=>{
'use strict';
if(window.__ARK_FIELD_WORKFLOW_UX_V2)return;
window.__ARK_FIELD_WORKFLOW_UX_V2=true;

const STYLE='arkWorkflowUxStyle';
const BAR='arkWorkflowBar';
const GUIDE='arkWorkflowGuide';
let lastKey='';
let mirrored=null;
let lastFocus='';
let printPromptedAt=0;

function addStyles(){
  if(document.getElementById(STYLE))return;
  const s=document.createElement('style');s.id=STYLE;s.textContent=`
  html{scroll-behavior:smooth}
  body.ark-workflow-active main{padding-bottom:calc(132px + env(safe-area-inset-bottom,0px))!important}
  #${BAR}{position:fixed;z-index:2147481000;right:8px;left:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));max-width:640px;margin:auto;background:#fff;border:2px solid #1d6b4a;border-radius:16px;padding:10px 11px;box-shadow:0 12px 38px rgba(9,40,28,.28);direction:rtl}
  #${BAR}[data-stage="warn"]{border-color:#b67817;background:#fffaf0}#${BAR}[data-stage="busy"]{border-color:#2d6b54;background:#f1f8f4}#${BAR}[data-stage="error"]{border-color:#a22626;background:#fff3f3}#${BAR}[data-stage="done"]{border-color:#167046;background:#effaf4}#${BAR}[data-stage="ready"]{border-color:#1d6b4a;background:#fff}
  .ark-wf-line{display:flex;gap:9px;align-items:center}.ark-wf-copy{flex:1;min-width:0}.ark-wf-kicker{font-size:11px;font-weight:900;color:#718079}.ark-wf-title{font-size:15px;font-weight:900;color:#173f31;line-height:1.4}.ark-wf-sub{font-size:11px;color:#6f7b74;margin-top:3px;line-height:1.45}.ark-wf-btn{width:100%;margin-top:8px;border:0;border-radius:12px;background:#176743;color:#fff;padding:14px;font-size:16px;font-weight:900;cursor:pointer}.ark-wf-btn:disabled{opacity:.5;cursor:not-allowed}
  #${GUIDE}{margin:0 0 10px;padding:8px;background:#f6f9f7;border:1px solid #d8e5de;border-radius:12px}.ark-wf-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.ark-wf-step{font-size:11px;font-weight:800;text-align:center;padding:6px 3px;border-radius:9px;background:#edf1ef;color:#748179}.ark-wf-step.on{background:#fff1d8;color:#8a5b08;box-shadow:inset 0 0 0 1px #e4c17e}.ark-wf-step.done{background:#e6f4ec;color:#12633f}.ark-wf-next{margin-top:6px;font-size:12px;font-weight:900;text-align:center;color:#5d4520}
  .ark-wf-compact-guide details{margin:0!important;border:0!important;padding:0!important}.ark-wf-compact-guide summary{font-weight:900;color:#173f31;cursor:pointer}.ark-wf-compact-guide details>div{margin-top:8px}
  @media(max-width:600px){main{padding-top:10px!important}.card{padding:14px!important;margin-top:10px!important}.brand{font-size:22px!important}.sub{line-height:1.5!important}label{margin-top:8px!important}input{padding:10px 11px!important}.actions{margin-top:10px!important}.note{margin:7px 0!important;padding:9px 11px!important}details{margin-top:11px!important;padding-top:9px!important}.ark-shift{margin-top:9px!important}.ark-shift-opt span{min-height:48px!important}.rp-results{max-height:30vh!important}.ops-guide{margin:8px 0 10px!important;padding:10px 12px!important}.ark-wf-mirrored{display:none!important}}
  @media print{#${BAR},#${GUIDE}{display:none!important}body.ark-workflow-active main{padding-bottom:0!important}.ark-wf-mirrored{display:inline-block!important}}
  `;document.head.appendChild(s);
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function visible(el){if(!el)return false;const st=getComputedStyle(el);return st.display!=='none'&&st.visibility!=='hidden'&&!el.classList.contains('hidden')}
function text(el){return (el&&el.textContent||'').trim()}
function click(el){if(!el||el.disabled)return;try{el.click()}catch(_){}}
function photoFlowActive(){return !!(document.getElementById('photoEvidenceBox')||document.getElementById('arkFieldFlowBar')||document.getElementById('scanMandatoryReceipt'))}
function route(){
  if(photoFlowActive())return'photo';
  if(document.getElementById('sharePrint'))return'share';
  if(document.getElementById('count')&&document.getElementById('name'))return'ops';
  if(document.getElementById('nid')&&document.getElementById('phone')&&!document.getElementById('count'))return'scan';
  return'other';
}
function markMirrored(el){
  if(mirrored===el)return;
  if(mirrored)mirrored.classList.remove('ark-wf-mirrored');
  mirrored=el||null;
  if(mirrored)mirrored.classList.add('ark-wf-mirrored');
}
function removeBar(){const b=document.getElementById(BAR);if(b)b.remove();document.body.classList.remove('ark-workflow-active');markMirrored(null);lastKey=''}
function setBar(stage,kicker,title,buttonText,target,sub='',enabled=true){
  addStyles();document.body.classList.add('ark-workflow-active');
  let b=document.getElementById(BAR);if(!b){b=document.createElement('div');b.id=BAR;b.setAttribute('role','status');b.setAttribute('aria-live','polite');document.body.appendChild(b)}
  b.dataset.stage=stage;
  const key=[stage,kicker,title,buttonText,sub,enabled?'1':'0'].join('|');
  if(key!==lastKey){
    b.innerHTML='<div class="ark-wf-line"><div class="ark-wf-copy"><div class="ark-wf-kicker">'+esc(kicker)+'</div><div class="ark-wf-title">'+esc(title)+'</div>'+(sub?'<div class="ark-wf-sub">'+esc(sub)+'</div>':'')+'</div></div>'+(buttonText?'<button id="arkWorkflowPrimary" class="ark-wf-btn" type="button" '+(enabled?'':'disabled')+'>'+esc(buttonText)+'</button>':'');
    lastKey=key;
  }
  const p=b.querySelector('#arkWorkflowPrimary');
  if(p){p.disabled=!enabled;p.onclick=()=>{if(!enabled)return;if(typeof target==='function')target();else click(target)}}
  markMirrored(target&&target.nodeType===1?target:null);
}
function removeGuide(){const g=document.getElementById(GUIDE);if(g)g.remove()}
function setGuide(host,labels,active,next){
  if(!host||!visible(host)){removeGuide();return}
  let g=document.getElementById(GUIDE);if(!g){g=document.createElement('div');g.id=GUIDE}
  if(g.parentNode!==host)host.insertBefore(g,host.firstChild);
  g.innerHTML='<div class="ark-wf-steps">'+labels.map((x,i)=>'<div class="ark-wf-step '+(i+1<active?'done':i+1===active?'on':'')+'">'+esc(x)+(i+1<active?' ✓':'')+'</div>').join('')+'</div><div class="ark-wf-next">'+esc(next||'')+'</div>';
}
function compactFocus(key,el){
  if(!el||lastFocus===key)return;lastFocus=key;
  setTimeout(()=>{try{const r=el.getBoundingClientRect();if(r.top<65||r.bottom>innerHeight-145){const y=Math.max(0,scrollY+r.top-72);scrollTo({top:y,behavior:'smooth'})}}catch(_){}},90);
}
function compactOpsGuide(){
  const g=document.getElementById('opsGuide');if(!g||g.dataset.compacted==='1')return;
  g.dataset.compacted='1';g.classList.add('ark-wf-compact-guide');
  const html=g.innerHTML;g.innerHTML='<details '+(innerWidth>700?'open':'')+'><summary>إرشادات موظف العمليات</summary><div>'+html+'</div></details>';
}
function sanitizeGpsHelp(){
  const gps=document.getElementById('gps');if(!gps)return;
  const noGps=gps.querySelector('#noGps');if(noGps){const d=noGps.closest('details');if(d)d.remove();else noGps.remove()}
  [...gps.querySelectorAll('.perm-small,.sub,p')].forEach(el=>{if(/بدون موقع|تسجيل التواجد بدون|متابعة وتسجيل التواجد/.test(el.textContent||''))el.textContent='الموقع إلزامي لإكمال العملية. فعّل صلاحية الموقع ثم أعد المحاولة.'});
}
function closeOtherPanels(opened){
  if(!opened||!opened.open)return;
  const rp=document.getElementById('reprintCenter');
  const repl=document.getElementById('replaceBtn')?.closest('details');
  if(opened===rp&&repl&&repl.open)repl.open=false;
  if(opened===repl&&rp&&rp.open)rp.open=false;
  const og=document.querySelector('#opsGuide details');if(og)og.open=false;
}
function invokePrint(btn){
  printPromptedAt=Date.now();
  click(btn);
  setTimeout(()=>{setBar('warn','الخطوة الأخيرة','تم فتح أمر الطباعة / الحفظ. أكمل حفظ PDF أو الطباعة قبل مغادرة الصفحة.','',null,'لا يستطيع الموقع التحقق من إتمام الحفظ داخل نافذة المتصفح.')},300);
}

function scanSync(){
  sanitizeGpsHelp();
  const f=document.getElementById('f'),send=document.getElementById('send'),state=document.getElementById('state'),gps=document.getElementById('gps');
  if(!f||!send){removeGuide();removeBar();return}
  if(!visible(f)){
    removeGuide();markMirrored(null);
    const st=text(state);
    if(/تم حفظ المسحة على الجهاز/.test(st)){setBar('warn','التسجيل غير مكتمل','تم حفظ البيانات محلياً بانتظار الاتصال.','',null,'لا تعتبر العملية منتهية حتى يكتمل الإرسال وصورة الإثبات.');return}
    if(/تعذر|خطأ|فشل/.test(st)){setBar('error','يلزم إجراء','لم تكتمل العملية. راجع الرسالة الظاهرة وأعد المحاولة.','',null,'لا تغلق الصفحة قبل تأكيد الاكتمال.');return}
    if(/تم تسجيل التواجد|المسحة مسجلة مسبقاً/.test(st)){setBar('busy','الخطوة التالية','تم حفظ بيانات التواجد الأولية. جارٍ الانتقال لصورة الإثبات.','',null,'لا تغلق الصفحة الآن.');return}
    removeBar();return;
  }
  const busy=send.disabled||/جارٍ/.test(send.textContent||'')||/جارٍ/.test(text(gps));
  if(busy){setGuide(f,['1. البيانات','2. الموقع','3. الإثبات'],2,'جارٍ التحقق من الموقع وتسجيل البيانات. لا تغلق الصفحة.');setBar('busy','الخطوة 2 من 3','جارٍ تحديد الموقع وتسجيل البيانات… لا تغلق الصفحة.','',null);return}
  const nid=document.getElementById('nid'),phone=document.getElementById('phone'),action=document.querySelector('input[name="arkShiftAction"]:checked');
  const nidOk=/^[12][0-9]{9}$/.test(String(nid&&nid.value||'').trim()),phoneOk=String(phone&&phone.value||'').trim().length>=9,ready=nidOk&&phoneOk&&!!action;
  setGuide(f,['1. البيانات','2. الموقع','3. الإثبات'],1,ready?'البيانات جاهزة. اضغط متابعة وسيتم طلب الموقع.':'أكمل الهوية والجوال واختر نوع العملية.');
  setBar(ready?'ready':'warn','الخطوة 1 من 3',ready?'البيانات جاهزة. الخطوة التالية تحديد الموقع.':'أكمل الحقول الإلزامية واختر نوع العملية.','متابعة وإثبات التواجد',send,ready?'بعد الموقع ستظهر صورة الإثبات قبل اكتمال التسجيل.':'لن يتم الإرسال قبل استكمال البيانات.',ready);
}

function reprintSync(rp){
  removeGuide();
  const rs=document.getElementById('rpState'),search=document.getElementById('rpSearchBtn'),reprint=document.getElementById('rpReprint'),share=document.getElementById('rpShare'),results=document.getElementById('rpResults');
  const url=document.getElementById('rpShareUrl'),copy=document.getElementById('rpCopy');
  const selected=rp.querySelectorAll('input[data-batch]:checked').length;
  const rows=results?results.querySelectorAll('input[data-batch]').length:0;
  if(/spin/.test(rs&&rs.innerHTML||'')){setGuide(rp,['1. البحث','2. الاختيار','3. الإجراء'],selected?3:1,'جارٍ تنفيذ الطلب. انتظر ولا تكرر الضغط.');setBar('busy','جارٍ التنفيذ','جارٍ تنفيذ الطلب… لا تغلق الصفحة.','',null);compactFocus('rp-busy',rp);return}
  if(url&&copy){
    const copied=/تم النسخ/.test(copy.textContent||'');
    setGuide(rp,['1. البحث','2. الاختيار','3. الإجراء'],3,copied?'تم نسخ الرابط. أرسله للمشرف أو احتفظ به.':'الرابط جاهز، وبقي نسخه وإرساله للمشرف.');
    setBar(copied?'done':'ready',copied?'تم النسخ':'الخطوة الأخيرة',copied?'تم نسخ الرابط.':'الرابط أُنشئ، لكنه لم يُرسل بعد.','نسخ الرابط',copy,copied?'يمكنك الآن لصقه وإرساله للمشرف.':'بعد النسخ أرسله للمشرف عبر القناة المعتمدة.',!copied);
    compactFocus('rp-share',rp);return;
  }
  if(selected){
    setGuide(rp,['1. البحث','2. الاختيار','3. الإجراء'],3,'تم اختيار الدفعة. اختر الإجراء المطلوب الآن.');
    setBar('ready','الخطوة 3 من 3','تم اختيار '+selected+' دفعة. الإجراء التالي إعادة الطباعة.','إعادة طباعة المحدد',reprint,'لإنشاء رابط للمشرف استخدم الخيار الثانوي الظاهر في نفس القسم.',true);compactFocus('rp-selected',rp);return;
  }
  if(rows){
    setGuide(rp,['1. البحث','2. الاختيار','3. الإجراء'],2,'اختر دفعة واحدة أو أكثر قبل المتابعة.');
    setBar('warn','الخطوة 2 من 3','ظهرت النتائج. اختر الدفعة المطلوبة أولاً.','',null,'لن يتم تنفيذ أي إجراء قبل الاختيار.');compactFocus('rp-results',rp);return;
  }
  setGuide(rp,['1. البحث','2. الاختيار','3. الإجراء'],1,'ابحث باسم المشرف أو الهوية أو الجوال أو رقم الدفعة.');
  setBar('ready','الخطوة 1 من 3','ابدأ بالبحث عن الدفعة المطلوبة.','بحث',search,'بعد ظهور النتائج ستختار الدفعة ثم الإجراء.',true);compactFocus('rp-search',rp);
}

function replaceSync(details,printArea){
  removeGuide();
  const btn=document.getElementById('replaceBtn'),st=document.getElementById('replaceState'),old=document.getElementById('oldCode');
  const busy=/spin/.test(st&&st.innerHTML||'')||!!(btn&&btn.disabled);
  const success=/تم إنشاء البديل/.test(text(st));
  if(busy){setGuide(details,['1. الرمز القديم','2. إنشاء البديل','3. الطباعة'],2,'جارٍ إنشاء البديل. لا تكرر الطلب.');setBar('busy','الخطوة 2 من 3','جارٍ إنشاء QR بديل… لا تغلق الصفحة.','',null);compactFocus('replace-busy',details);return}
  if(success&&printArea&&visible(printArea)){
    const printBtn=[...printArea.querySelectorAll('button')].find(b=>/طباعة|PDF/.test(text(b)));
    setGuide(details,['1. الرمز القديم','2. إنشاء البديل','3. الطباعة'],3,'تم إنشاء البديل. بقيت طباعة / حفظ الرمز الجديد.');
    setBar('ready','الخطوة 3 من 3','تم إنشاء البديل، لكن بقيت طباعة أو حفظ الكود الجديد.','طباعة / حفظ PDF',()=>invokePrint(printBtn),'الكود القديم أوقفه النظام عند نجاح الاستبدال؛ احفظ البديل قبل المغادرة.',true);compactFocus('replace-print',printArea);return;
  }
  const valid=/^CP-[0-9]{6}$/.test(String(old&&old.value||'').trim().toUpperCase());
  setGuide(details,['1. الرمز القديم','2. إنشاء البديل','3. الطباعة'],1,valid?'الرمز جاهز. أنشئ البديل الآن.':'أدخل الرمز بالشكل CP-000123.');
  setBar('warn','استبدال QR',valid?'الرمز القديم جاهز للاستبدال.':'أدخل رمز QR القديم أولاً.','إنشاء البديل',btn,'هذا الإجراء يوقف الرمز القديم عند نجاح إنشاء البديل.',valid);compactFocus('replace',details);
}

function opsSync(){
  compactOpsGuide();
  const f=document.getElementById('f'),send=document.getElementById('send'),state=document.getElementById('state'),printArea=document.getElementById('printArea');
  const rp=document.getElementById('reprintCenter');if(rp&&rp.open){reprintSync(rp);return}
  const repl=document.getElementById('replaceBtn')?.closest('details');if(repl&&repl.open){replaceSync(repl,printArea);return}
  if(f&&visible(f)&&send){
    const busy=send.disabled||/جارٍ/.test(send.textContent||'');
    const name=document.getElementById('name'),nid=document.getElementById('nid'),phone=document.getElementById('phone'),count=document.getElementById('count');
    const ready=String(name&&name.value||'').trim().length>=4&&/^[12][0-9]{9}$/.test(String(nid&&nid.value||'').trim())&&String(phone&&phone.value||'').trim().length>=9&&Number(count&&count.value)>=1;
    setGuide(f,['1. بيانات المشرف','2. إنشاء QR','3. الطباعة'],busy?2:1,busy?'جارٍ إنشاء الأكواد. انتظر النتيجة.':ready?'البيانات جاهزة. أنشئ الأكواد الآن.':'أكمل بيانات المشرف وعدد الأكواد.');
    if(busy){setBar('busy','الخطوة 2 من 3','جارٍ إنشاء أكواد QR… لا تغلق الصفحة.','',null);return}
    setBar(ready?'ready':'warn','الخطوة 1 من 3',ready?'بيانات المشرف جاهزة.':'أكمل الحقول الإلزامية قبل إنشاء الأكواد.','إنشاء الأكواد',send,'بعد الإنشاء ستبقى خطوة الطباعة / الحفظ قبل انتهاء المهمة.',ready);return;
  }
  removeGuide();
  if(printArea&&visible(printArea)){
    const printBtn=[...printArea.querySelectorAll('button')].find(b=>/طباعة|PDF/.test(text(b)));
    setBar('ready','الخطوة 3 من 3','تم إنشاء الأكواد. بقيت طباعتها أو حفظها PDF قبل التوزيع.','طباعة / حفظ PDF',()=>invokePrint(printBtn),'لا تعتبر عملية التجهيز منتهية قبل حفظ الملف أو طباعته.',true);compactFocus('ops-print',printArea);return;
  }
  const st=text(state);if(/تعذر|خطأ|فشل/.test(st)){setBar('error','تعذر إكمال العملية','راجع الخطأ الظاهر ثم استخدم إعادة المحاولة.','',null,'لا تغلق الصفحة على أنها مكتملة.');return}
  removeBar();
}

function shareSync(){
  removeGuide();
  const print=document.getElementById('sharePrint'),st=document.getElementById('shareState'),txt=text(st);
  if(!print){if(/تعذر|خطأ|فشل/.test(txt)){setBar('error','تعذر تحميل الأكواد','لم تكتمل العملية. راجع الرسالة الظاهرة.','',null);return}setBar('busy','الخطوة 1 من 2','جارٍ تحميل الأكواد المعتمدة… انتظر.','',null,'لا تغلق الصفحة الآن.');return}
  if(/تعذر|خطأ|فشل/.test(txt)){setBar('error','تعذر تحميل الأكواد','لم تكتمل العملية. راجع الرسالة الظاهرة.','',null);return}
  if(/تم تحميل/.test(txt)){
    setBar('ready','الخطوة 2 من 2','تم تحميل الأكواد. بقيت الطباعة أو الحفظ PDF.','طباعة / حفظ PDF',()=>invokePrint(print),'احفظ الملف قبل مغادرة الصفحة.',true);compactFocus('share-print',print);return
  }
  setBar('busy','الخطوة 1 من 2','جارٍ تحميل الأكواد المعتمدة… انتظر.','',null);
}

function otherSync(){
  removeGuide();
  const app=document.getElementById('app'),t=text(app);
  if(/تعذر تحميل صفحة العمليات|تعذر/.test(t)){setBar('error','تعذر التحميل','لم يتم تحميل الصفحة بشكل صحيح.','تحديث الصفحة',()=>location.reload(),'لا تنفذ أي إجراء قبل اكتمال التحميل.',true);return}
  removeBar();
}
function sync(){
  addStyles();
  if(photoFlowActive()){removeGuide();removeBar();return}
  const r=route();if(r==='scan')scanSync();else if(r==='ops')opsSync();else if(r==='share')shareSync();else otherSync();
}
function boot(){
  addStyles();sync();
  const root=document.getElementById('app')||document.body;
  const mo=new MutationObserver(()=>queueMicrotask(sync));mo.observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','disabled','open','value']});
  document.addEventListener('input',()=>queueMicrotask(sync),true);document.addEventListener('change',()=>queueMicrotask(sync),true);
  document.addEventListener('toggle',e=>{closeOtherPanels(e.target);queueMicrotask(sync)},true);
  window.addEventListener('pageshow',()=>setTimeout(sync,60));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(sync,80)});window.addEventListener('resize',()=>setTimeout(sync,80));
  window.addEventListener('focus',()=>{if(printPromptedAt&&Date.now()-printPromptedAt<120000)setTimeout(sync,100)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();