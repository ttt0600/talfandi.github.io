(()=>{
'use strict';
if(window.__ARK_FIELD_MOBILE_UX_V4)return;
window.__ARK_FIELD_MOBILE_UX_V4=true;
window.__ARK_FIELD_MOBILE_UX_V3=true;
window.__ARK_FIELD_MOBILE_UX_V2=true;
window.__ARK_FIELD_MOBILE_UX_V1=true;

const STYLE_ID='arkMobileUxStyle';
const TOP_STEPPER='arkMobileTopStepper';
const GPS_TITLE='arkGpsCompactTitle';
const LOC_RECOVERY='arkLocationRecovery';
let scheduled=false,blurTimer=0,leftForSettings=false,recoveryCheckBusy=false;

function addStyles(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
  html{-webkit-text-size-adjust:100%;text-size-adjust:100%}body{overscroll-behavior-y:contain}button,summary{-webkit-tap-highlight-color:transparent}button{touch-action:manipulation;min-height:44px}input{-webkit-tap-highlight-color:transparent;font-size:16px!important;min-height:46px;touch-action:auto}
  #nid,#phone{direction:ltr!important;text-align:left!important;unicode-bidi:plaintext}
  body.ark-mobile-scan main{padding-top:10px!important;padding-bottom:48px}body.ark-mobile-scan .card{margin-top:10px!important;padding:14px!important;border-radius:16px!important}body.ark-mobile-scan .brand{font-size:22px!important;line-height:1.25}body.ark-mobile-scan #subtitle{font-size:13px!important;line-height:1.35}body.ark-mobile-scan #app>h2{font-size:24px!important;margin:2px 0 6px!important}body.ark-mobile-scan #app>p.sub{font-size:13px!important;line-height:1.5!important;margin:0 0 8px!important}
  body.ark-mobile-scan #arkGpsRequired{display:none!important}body.ark-mobile-scan #gps{margin:8px 0 2px!important;padding:10px 11px!important;border:1px solid #d7e4dd!important;border-radius:12px!important;background:#f7faf8!important;color:#32483c!important;line-height:1.5!important}body.ark-mobile-scan #gps .spin{width:26px!important;height:26px!important;margin:6px auto!important;border-width:3px!important}body.ark-mobile-scan #gps .actions{margin-top:8px!important}body.ark-mobile-scan #gps button{width:100%;padding:10px 12px!important;font-size:14px!important}
  #${GPS_TITLE}{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px}#${GPS_TITLE} b{font-size:14px;color:#173f31}#${GPS_TITLE} span{font-size:11px;font-weight:900;color:#8c2626;background:#fff0f0;border:1px solid #e8c2c2;border-radius:999px;padding:3px 8px}
  #${TOP_STEPPER}{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:0 0 9px}#${TOP_STEPPER} .ark-m-step{font-size:11px;font-weight:900;text-align:center;padding:7px 3px;border-radius:9px;background:#eef2f0;color:#77847d}#${TOP_STEPPER} .ark-m-step.active{background:#fff1d8;color:#8a5b08;box-shadow:inset 0 0 0 1px #e2bd73}#${TOP_STEPPER} .ark-m-step.done{background:#e6f4ec;color:#12633f}
  body.ark-mobile-scan label{margin:8px 0 5px!important;font-size:14px}body.ark-mobile-scan .ark-shift{margin:9px 0 5px!important}body.ark-mobile-scan .ark-shift-title{font-size:14px!important;margin-bottom:6px!important}body.ark-mobile-scan .ark-shift-grid{gap:6px!important}body.ark-mobile-scan .ark-shift-opt span{min-height:48px!important;font-size:13px!important;padding:7px 5px!important;border-radius:11px!important}body.ark-mobile-scan .ark-shift-help{font-size:11px!important;margin-top:5px!important}body.ark-mobile-scan #pending{font-size:12px!important;margin-top:5px!important}
  body.ark-mobile-scan.ark-workflow-active #f>.actions,body.ark-mobile-scan.ark-has-sticky-flow #f>.actions{display:none!important}body.ark-mobile-scan #f>.actions:not([style*="display: none"]){display:flex;margin-top:12px!important}body.ark-mobile-scan #f>.actions button{width:100%}
  body.ark-mobile-scan #arkWorkflowBar,body.ark-mobile-scan #arkFieldFlowBar{bottom:calc(8px + env(safe-area-inset-bottom,0px));right:8px!important;left:8px!important;border-radius:15px!important;padding:9px 10px!important}
  body.ark-mobile-scan #arkWorkflowBar .ark-wf-btn,body.ark-mobile-scan #arkFieldFlowBar .ark-flow-primary{min-height:48px!important;padding:12px!important;font-size:16px!important;margin-top:7px!important}
  body.ark-keyboard-open #arkWorkflowBar,body.ark-keyboard-open #arkFieldFlowBar{display:none!important}
  body.ark-keyboard-open #nid,body.ark-keyboard-open #phone{scroll-margin-top:88px;scroll-margin-bottom:42vh}
  #${LOC_RECOVERY}{margin-top:9px;padding:10px;border:1px solid #e0c995;border-radius:11px;background:#fffaf0;color:#4f4025}#${LOC_RECOVERY} .ark-loc-head{font-weight:900;color:#734b08;margin-bottom:5px}#${LOC_RECOVERY} .ark-loc-sub{font-size:12px;line-height:1.65;color:#5f5544}#${LOC_RECOVERY} ol{margin:7px 0 0;padding-right:20px;font-size:12px;line-height:1.75}#${LOC_RECOVERY} details{margin:7px 0 0;padding:0;border:0}#${LOC_RECOVERY} summary{font-size:12px;font-weight:900;color:#355646;cursor:pointer}#${LOC_RECOVERY} geolocation{display:block;width:100%;min-height:48px;margin-top:8px}#${LOC_RECOVERY} .ark-copy-link{margin-top:7px;background:#edf4f0!important;color:#194d37!important}
  @media(max-width:390px){#${TOP_STEPPER} .ark-m-step{font-size:10px;padding:6px 2px}body.ark-mobile-scan .ark-shift-opt span{font-size:12px}body.ark-mobile-scan #app>h2{font-size:22px!important}}
  @media(max-height:680px){body.ark-mobile-scan #app>p.sub{display:none!important}}
  @media(print){#${TOP_STEPPER},#${GPS_TITLE},#${LOC_RECOVERY}{display:none!important}}
  `;document.head.appendChild(s);
}
function route(){if(document.getElementById('nid')&&document.getElementById('phone')&&!document.getElementById('count'))return'scan';if(document.getElementById('count')&&document.getElementById('name'))return'ops';if(document.getElementById('sharePrint'))return'share';return'other'}
function setRouteClass(r){const b=document.body;['ark-mobile-scan','ark-mobile-ops','ark-mobile-share'].forEach(c=>{const on=(r==='scan'&&c==='ark-mobile-scan')||(r==='ops'&&c==='ark-mobile-ops')||(r==='share'&&c==='ark-mobile-share');if(b.classList.contains(c)!==on)b.classList.toggle(c,on)})}
function safeAttr(el,name,value){try{if(el&&el.getAttribute(name)!==value)el.setAttribute(name,value)}catch(_){}}
function isTextEntry(el){return !!(el&&el.tagName==='INPUT'&&!['radio','checkbox','button','submit','hidden'].includes(String(el.type||'').toLowerCase()))}
function setKeyboard(open){if(document.body.classList.contains('ark-keyboard-open')!==open)document.body.classList.toggle('ark-keyboard-open',open)}
function syncKeyboard(){setKeyboard(isTextEntry(document.activeElement))}
function normalizeDigits(v){return String(v||'').replace(/[٠-٩]/g,d=>'0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).replace(/[۰-۹]/g,d=>'0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])}
function normalizeInputs(r){
  const nid=document.getElementById('nid'),phone=document.getElementById('phone');
  if(nid&&nid.dataset.arkInputNormalized!=='1'){
    safeAttr(nid,'type','text');safeAttr(nid,'inputmode','numeric');safeAttr(nid,'autocomplete','off');safeAttr(nid,'autocorrect','off');safeAttr(nid,'autocapitalize','off');safeAttr(nid,'enterkeyhint','next');safeAttr(nid,'dir','ltr');safeAttr(nid,'placeholder','10 أرقام');try{nid.spellcheck=false;if(nid.value==='UNKNOWN_TYPE')nid.value='';nid.dataset.arkInputNormalized='1'}catch(_){}
    nid.addEventListener('input',()=>{const v=normalizeDigits(nid.value).replace(/\D/g,'').slice(0,10);if(nid.value!==v)nid.value=v},{passive:true});
    nid.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const p=document.getElementById('phone');if(p)try{p.focus({preventScroll:false})}catch(_){p.focus()}}});
  }
  if(phone&&phone.dataset.arkInputNormalized!=='1'){
    safeAttr(phone,'type','tel');safeAttr(phone,'inputmode','tel');safeAttr(phone,'autocomplete','off');safeAttr(phone,'autocorrect','off');safeAttr(phone,'autocapitalize','off');safeAttr(phone,'enterkeyhint','done');safeAttr(phone,'dir','ltr');safeAttr(phone,'placeholder','05xxxxxxxx');try{phone.spellcheck=false;if(phone.value==='UNKNOWN_TYPE')phone.value='';phone.dataset.arkInputNormalized='1'}catch(_){}
    phone.addEventListener('input',()=>{const v=normalizeDigits(phone.value);if(phone.value!==v)phone.value=v},{passive:true});
  }
}
function escHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function deviceProfile(){
  const ua=navigator.userAgent||'',platform=navigator.platform||'';const ios=/iPhone|iPad|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator.maxTouchPoints||0)>1),android=/Android/i.test(ua);
  const inApp=/FBAN|FBAV|Instagram|WhatsApp|Snapchat|TikTok|Line\//i.test(ua)||(android&&(/;\s*wv\)/i.test(ua)||/\bwv\b/i.test(ua)))||(ios&&!/Safari|CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua));
  let browser='other',label='المتصفح الحالي';
  if(inApp){browser=ios?'ios_inapp':android?'android_inapp':'inapp';label='متصفح داخل تطبيق'}
  else if(ios){if(/CriOS/i.test(ua)){browser='ios_chrome';label='Chrome على iPhone / iPad'}else if(/FxiOS/i.test(ua)){browser='ios_firefox';label='Firefox على iPhone / iPad'}else if(/EdgiOS/i.test(ua)){browser='ios_edge';label='Edge على iPhone / iPad'}else if(/OPiOS/i.test(ua)){browser='ios_opera';label='Opera على iPhone / iPad'}else{browser='ios_safari';label='Safari على iPhone / iPad'}}
  else if(android){if(/SamsungBrowser/i.test(ua)){browser='android_samsung';label='Samsung Internet'}else if(/EdgA/i.test(ua)){browser='android_edge';label='Edge على Android'}else if(/Firefox/i.test(ua)){browser='android_firefox';label='Firefox على Android'}else if(/OPR/i.test(ua)){browser='android_opera';label='Opera على Android'}else{browser='android_chrome';label='Chrome / Chromium على Android'}}
  return{ios,android,inApp,browser,label};
}
async function permissionState(){try{if(navigator.permissions&&navigator.permissions.query){const p=await navigator.permissions.query({name:'geolocation'});return p&&p.state||'unknown'}}catch(_){}return'unknown'}
function deniedDetected(){const gps=document.getElementById('gps');if(!gps)return false;const t=(gps.textContent||'').replace(/\s+/g,' ');return /صلاحية الموقع مرفوضة|تم رفض صلاحية الموقع|لم يتم السماح للمتصفح باستخدام الموقع/.test(t)}
function recoverySteps(p){
  if(p.browser==='ios_safari')return['من Safari افتح قائمة الصفحة بجانب شريط العنوان.','اختر «إعدادات موقع الويب» ثم «الموقع» واختر «سماح».','ارجع للصفحة؛ سيحاول النظام المتابعة تلقائياً.'];
  if(p.ios&&!p.inApp)return['افتح «الإعدادات» في iPhone / iPad ثم إعدادات المتصفح المستخدم.','افتح «الموقع» واختر السماح أثناء استخدام التطبيق، وفعّل «الموقع الدقيق» إن ظهر.','ارجع للصفحة؛ سيحاول النظام المتابعة تلقائياً.'];
  if(p.browser==='android_samsung')return['من معلومات الموقع أو إعدادات Samsung Internet افتح أذونات هذا الموقع.','اجعل «الموقع» = سماح، وتأكد أن خدمة الموقع في الجهاز مفعلة.','ارجع للصفحة؛ سيحاول النظام المتابعة تلقائياً.'];
  if(p.android&&!p.inApp)return['اضغط رمز معلومات الموقع بجانب العنوان ثم «الأذونات / Permissions».','اجعل «الموقع» = سماح، وتأكد أن خدمة الموقع في الجهاز مفعلة.','ارجع للصفحة؛ سيحاول النظام المتابعة تلقائياً.'];
  if(p.inApp)return['المتصفح داخل التطبيق قد يمنع صلاحية الموقع.','من قائمة التطبيق اختر «فتح في المتصفح» إن كان الخيار متاحاً.','إذا لم يظهر الخيار، انسخ رابط الرصد وافتحه في Safari أو Chrome.'];
  return['اسمح للموقع الحالي باستخدام موقعك من إعدادات المتصفح.','تأكد أن خدمة الموقع في الجهاز مفعلة.','ارجع للصفحة؛ سيحاول النظام المتابعة تلقائياً.'];
}
function formReady(){const f=document.getElementById('f'),a=document.querySelector('input[name="arkShiftAction"]:checked');try{return !!(f&&f.checkValidity()&&a)}catch(_){return false}}
function markPermissionReady(){const gps=document.getElementById('gps');if(!gps)return;gps.innerHTML='<b class="ok">تم السماح بالموقع.</b> سيتم التقاط الموقع عند المتابعة.';schedule()}
function continueIfReady(){const b=document.getElementById('retryGps')||document.getElementById('send');if(formReady()&&b&&!b.disabled){setTimeout(()=>b.click(),100);return true}markPermissionReady();return false}
function copyScanLink(btn){
  let token='';try{if(typeof TOKEN!=='undefined'&&TOKEN)token=String(TOKEN);else token=sessionStorage.getItem('arkanat_field_token_v5')||''}catch(_){}if(!token)return;const url=location.origin+location.pathname+'?p='+encodeURIComponent(token);
  const done=()=>{if(btn){btn.textContent='تم نسخ رابط الرصد ✓';setTimeout(()=>{if(btn)btn.textContent='نسخ رابط الرصد'},1800)}};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(done).catch(()=>fallback())}else fallback();
  function fallback(){try{const i=document.createElement('input');i.value=url;i.style.position='fixed';i.style.opacity='0';document.body.appendChild(i);i.select();document.execCommand('copy');i.remove();done()}catch(_){}}
}
function nativeGeoRecovery(host){
  if(typeof HTMLGeolocationElement!=='function'||!host||host.querySelector('geolocation'))return false;
  try{
    const geo=document.createElement('geolocation');geo.id='arkNativeGeoRecovery';geo.setAttribute('lang','ar');host.appendChild(geo);
    geo.addEventListener('location',()=>{try{if(geo.position)continueIfReady()}catch(_){}});
    geo.addEventListener('promptaction',()=>{try{if(geo.permissionStatus==='granted')continueIfReady()}catch(_){}});
    return true;
  }catch(_){return false}
}
function enhanceLocationRecovery(){
  if(route()!=='scan'||!deniedDetected())return;
  const gps=document.getElementById('gps');if(!gps||document.getElementById(LOC_RECOVERY))return;const p=deviceProfile();
  const box=document.createElement('div');box.id=LOC_RECOVERY;box.innerHTML='<div class="ark-loc-head">استعادة صلاحية الموقع</div><div class="ark-loc-sub">لن تفقد بياناتك. اسمح بالموقع ثم ارجع لهذه الصفحة.</div>';
  const nativeHost=document.createElement('div');nativeHost.id='arkNativeGeoHost';box.appendChild(nativeHost);const nativeOk=nativeGeoRecovery(nativeHost);
  const details=document.createElement('details');details.open=!nativeOk;details.innerHTML='<summary>'+(nativeOk?'إذا لم يعمل زر السماح، اعرض الخطوات':'طريقة السماح بالموقع على '+escHtml(p.label))+'</summary><ol>'+recoverySteps(p).map(x=>'<li>'+escHtml(x)+'</li>').join('')+'</ol>';box.appendChild(details);
  if(p.inApp){const copy=document.createElement('button');copy.type='button';copy.className='ark-copy-link';copy.textContent='نسخ رابط الرصد';copy.onclick=()=>copyScanLink(copy);box.appendChild(copy)}
  const retry=document.getElementById('retryGps');if(retry)retry.textContent=nativeOk?'تحقق من الصلاحية والمواصلة':'أعد المحاولة بعد السماح';gps.appendChild(box);
}
async function resumeAfterSettings(){
  if(recoveryCheckBusy||route()!=='scan'||!deniedDetected())return;recoveryCheckBusy=true;
  try{const st=await permissionState();if(st==='granted')continueIfReady()}catch(_){}finally{setTimeout(()=>{recoveryCheckBusy=false},500)}
}
function ensureTopStepper(){
  const app=document.getElementById('app'),f=document.getElementById('f');if(!app||!f)return;
  let st=document.getElementById(TOP_STEPPER);if(!st){st=document.createElement('div');st.id=TOP_STEPPER;st.innerHTML='<div class="ark-m-step active">1. البيانات</div><div class="ark-m-step">2. الموقع</div><div class="ark-m-step">3. الإثبات</div>';app.insertBefore(st,f)}
  const state=document.getElementById('state'),box=document.getElementById('photoEvidenceBox'),txt=(state&&state.textContent)||'';let phase=1;if(box||/تم تسجيل التواجد|المسحة مسجلة مسبقاً/.test(txt))phase=3;else{const send=document.getElementById('send');if(send&&(send.disabled||/جارٍ/.test(send.textContent||'')))phase=2}
  [...st.children].forEach((el,i)=>{const cls='ark-m-step '+(i+1<phase?'done':i+1===phase?'active':'');if(el.className!==cls)el.className=cls});
}
function compactGps(){const gps=document.getElementById('gps'),f=document.getElementById('f');if(!gps||!f)return;const actions=f.querySelector('.actions');if(gps.parentNode!==f){try{f.insertBefore(gps,actions||null)}catch(_){}}if(!document.getElementById(GPS_TITLE)){const t=document.createElement('div');t.id=GPS_TITLE;t.innerHTML='<b>الموقع</b><span>إلزامي</span>';gps.insertBefore(t,gps.firstChild)}}
function sync(){scheduled=false;addStyles();const r=route();setRouteClass(r);normalizeInputs(r);syncKeyboard();if(r==='scan'&&!isTextEntry(document.activeElement)){ensureTopStepper();compactGps();enhanceLocationRecovery()}}
function schedule(){if(scheduled)return;scheduled=true;(window.requestAnimationFrame||function(fn){return setTimeout(fn,16)})(sync)}
function boot(){
  addStyles();sync();const root=document.getElementById('app')||document.body;
  try{new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled','checked']})}catch(_){}
  document.addEventListener('input',schedule,true);document.addEventListener('change',schedule,true);
  document.addEventListener('focusin',e=>{clearTimeout(blurTimer);if(isTextEntry(e.target))setKeyboard(true);schedule()},true);
  document.addEventListener('focusout',()=>{clearTimeout(blurTimer);blurTimer=setTimeout(()=>{syncKeyboard();schedule()},180)},true);
  window.addEventListener('pageshow',()=>{schedule();if(leftForSettings){leftForSettings=false;setTimeout(resumeAfterSettings,450)}});
  window.addEventListener('focus',()=>{if(leftForSettings){leftForSettings=false;setTimeout(resumeAfterSettings,450)}});
  window.addEventListener('resize',schedule);window.addEventListener('orientationchange',()=>setTimeout(schedule,180));
  if(window.visualViewport){window.visualViewport.addEventListener('resize',()=>{if(isTextEntry(document.activeElement))setKeyboard(true);schedule()},{passive:true})}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&deniedDetected())leftForSettings=true;if(document.visibilityState==='visible'){setTimeout(schedule,80);if(leftForSettings){leftForSettings=false;setTimeout(resumeAfterSettings,450)}}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();