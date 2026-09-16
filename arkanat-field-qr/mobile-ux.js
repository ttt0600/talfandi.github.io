(function(){
'use strict';
if(window.__ARK_FIELD_MOBILE_UX_V1)return;
window.__ARK_FIELD_MOBILE_UX_V1=true;

var STYLE_ID='arkMobileUxStyle';
var TOP_STEPPER='arkMobileTopStepper';
var GPS_TITLE='arkGpsCompactTitle';
var scheduled=false;

function addStyles(){
  if(document.getElementById(STYLE_ID))return;
  var s=document.createElement('style');s.id=STYLE_ID;
  s.textContent='\
  html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}\
  body{overscroll-behavior-y:contain;}\
  button,input,summary{-webkit-tap-highlight-color:transparent;}\
  button{touch-action:manipulation;min-height:44px;}\
  input{font-size:16px!important;min-height:46px;}\
  body.ark-mobile-scan main{padding-top:10px!important;}\
  body.ark-mobile-scan .card{margin-top:10px!important;padding:14px!important;border-radius:16px!important;}\
  body.ark-mobile-scan .brand{font-size:22px!important;line-height:1.25;}\
  body.ark-mobile-scan #subtitle{font-size:13px!important;line-height:1.35;}\
  body.ark-mobile-scan #app>h2{font-size:24px!important;margin:2px 0 6px!important;}\
  body.ark-mobile-scan #app>p.sub{font-size:13px!important;line-height:1.55!important;margin:0 0 8px!important;}\
  body.ark-mobile-scan #arkGpsRequired{display:none!important;}\
  body.ark-mobile-scan #arkWorkflowGuide{display:none!important;}\
  body.ark-mobile-scan #gps{margin:8px 0 2px!important;padding:10px 11px!important;border:1px solid #d7e4dd!important;border-radius:12px!important;background:#f7faf8!important;color:#32483c!important;line-height:1.5!important;}\
  body.ark-mobile-scan #gps .spin{width:26px!important;height:26px!important;margin:6px auto!important;border-width:3px!important;}\
  body.ark-mobile-scan #gps .actions{margin-top:8px!important;}\
  body.ark-mobile-scan #gps button{width:100%;padding:10px 12px!important;font-size:14px!important;}\
  body.ark-mobile-scan #gps .perm-help{margin-top:8px!important;padding:8px 10px!important;font-size:12px!important;}\
  body.ark-mobile-scan #gps .perm-device,body.ark-mobile-scan #gps .perm-small{font-size:12px!important;line-height:1.5!important;}\
  body.ark-mobile-scan .ark-gps-help-wrap{margin-top:7px;border-top:1px dashed #d4dfd8;padding-top:7px;}\
  body.ark-mobile-scan .ark-gps-help-wrap summary{font-size:12px;font-weight:900;color:#315844;}\
  #'+GPS_TITLE+'{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;}\
  #'+GPS_TITLE+' b{font-size:14px;color:#173f31;}\
  #'+GPS_TITLE+' span{font-size:11px;font-weight:900;color:#8c2626;background:#fff0f0;border:1px solid #e8c2c2;border-radius:999px;padding:3px 8px;}\
  #'+TOP_STEPPER+'{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:0 0 9px;}\
  #'+TOP_STEPPER+' .ark-m-step{font-size:11px;font-weight:900;text-align:center;padding:7px 3px;border-radius:9px;background:#eef2f0;color:#77847d;}\
  #'+TOP_STEPPER+' .ark-m-step.active{background:#fff1d8;color:#8a5b08;box-shadow:inset 0 0 0 1px #e2bd73;}\
  #'+TOP_STEPPER+' .ark-m-step.done{background:#e6f4ec;color:#12633f;}\
  body.ark-mobile-scan label{margin:8px 0 5px!important;font-size:14px;}\
  body.ark-mobile-scan .ark-shift{margin:9px 0 5px!important;}\
  body.ark-mobile-scan .ark-shift-title{font-size:14px!important;margin-bottom:6px!important;}\
  body.ark-mobile-scan .ark-shift-grid{gap:6px!important;}\
  body.ark-mobile-scan .ark-shift-opt span{min-height:48px!important;font-size:13px!important;padding:7px 5px!important;border-radius:11px!important;}\
  body.ark-mobile-scan .ark-shift-help{font-size:11px!important;margin-top:5px!important;}\
  body.ark-mobile-scan #f>.actions{display:none!important;}\
  body.ark-mobile-scan #pending{font-size:12px!important;margin-top:5px!important;}\
  body.ark-mobile-scan #arkWorkflowBar,body.ark-mobile-scan #arkFieldFlowBar{bottom:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px) + var(--ark-vv-bottom,0px));right:8px!important;left:8px!important;border-radius:15px!important;padding:9px 10px!important;}\
  body.ark-mobile-scan #arkWorkflowBar .ark-wf-btn,body.ark-mobile-scan #arkFieldFlowBar .ark-flow-primary{min-height:48px!important;padding:12px!important;font-size:16px!important;margin-top:7px!important;}\
  body.ark-mobile-scan #arkWorkflowBar .ark-wf-title,body.ark-mobile-scan #arkFieldFlowBar .ark-flow-title{font-size:14px!important;}\
  body.ark-mobile-scan #arkWorkflowBar .ark-wf-sub,body.ark-mobile-scan #arkWorkflowBar .ark-wf-kicker,body.ark-mobile-scan #arkFieldFlowBar .ark-flow-kicker{font-size:10px!important;}\
  body.ark-keyboard-open #arkWorkflowBar .ark-wf-sub,body.ark-keyboard-open #arkWorkflowBar .ark-wf-kicker,body.ark-keyboard-open #arkFieldFlowBar .ark-flow-kicker{display:none!important;}\
  body.ark-keyboard-open #arkWorkflowBar,body.ark-keyboard-open #arkFieldFlowBar{padding:7px 8px!important;}\
  body.ark-keyboard-open #arkWorkflowBar .ark-wf-btn,body.ark-keyboard-open #arkFieldFlowBar .ark-flow-primary{min-height:44px!important;padding:10px!important;}\
  body.ark-mobile-ops main,body.ark-mobile-share main{padding-top:10px!important;}\
  body.ark-mobile-ops .card,body.ark-mobile-share .card{margin-top:10px!important;padding:14px!important;}\
  body.ark-mobile-ops .ops-guide{margin:7px 0 9px!important;padding:9px 10px!important;}\
  body.ark-mobile-ops label{margin-top:8px!important;}\
  body.ark-mobile-ops .actions,body.ark-mobile-share .actions{margin-top:10px!important;}\
  body.ark-mobile-ops .rp-results{max-height:28vh!important;}\
  body.ark-mobile-ops #arkWorkflowBar,body.ark-mobile-share #arkWorkflowBar{bottom:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px) + var(--ark-vv-bottom,0px));}\
  @media(max-width:390px){#'+TOP_STEPPER+' .ark-m-step{font-size:10px;padding:6px 2px;}body.ark-mobile-scan .ark-shift-opt span{font-size:12px;}body.ark-mobile-scan #app>h2{font-size:22px!important;}}\
  @media(max-height:680px){body.ark-mobile-scan #app>p.sub{display:none!important;}body.ark-mobile-scan #gps .perm-device{display:none!important;}body.ark-mobile-scan #arkWorkflowBar .ark-wf-sub,body.ark-mobile-scan #arkFieldFlowBar .ark-flow-kicker{display:none!important;}}\
  @media(print){#'+TOP_STEPPER+',#'+GPS_TITLE+'{display:none!important;}}';
  document.head.appendChild(s);
}

function route(){
  if(document.getElementById('nid')&&document.getElementById('phone')&&!document.getElementById('count'))return'scan';
  if(document.getElementById('count')&&document.getElementById('name'))return'ops';
  if(document.getElementById('sharePrint'))return'share';
  return'other';
}
function setRouteClass(r){
  document.body.classList.remove('ark-mobile-scan','ark-mobile-ops','ark-mobile-share');
  if(r==='scan')document.body.classList.add('ark-mobile-scan');
  else if(r==='ops')document.body.classList.add('ark-mobile-ops');
  else if(r==='share')document.body.classList.add('ark-mobile-share');
}
function safeAttr(el,name,value){try{if(el&&el.getAttribute(name)!==value)el.setAttribute(name,value)}catch(_){}}
function normalizeInputs(r){
  var nid=document.getElementById('nid'),phone=document.getElementById('phone');
  if(nid){safeAttr(nid,'type','text');safeAttr(nid,'inputmode','numeric');safeAttr(nid,'autocomplete','off');safeAttr(nid,'autocapitalize','off');safeAttr(nid,'enterkeyhint','next');safeAttr(nid,'placeholder','10 أرقام');try{nid.spellcheck=false;if(nid.value==='UNKNOWN_TYPE')nid.value=''}catch(_){}}
  if(phone){safeAttr(phone,'type','tel');safeAttr(phone,'inputmode','tel');safeAttr(phone,'autocomplete',r==='scan'?'tel':'off');safeAttr(phone,'autocapitalize','off');safeAttr(phone,'enterkeyhint',r==='scan'?'done':'next');safeAttr(phone,'placeholder','05xxxxxxxx');try{phone.spellcheck=false;if(phone.value==='UNKNOWN_TYPE')phone.value=''}catch(_){}}
  var name=document.getElementById('name');if(name){safeAttr(name,'type','text');safeAttr(name,'autocomplete','off');safeAttr(name,'enterkeyhint','next')}
  var old=document.getElementById('oldCode');if(old){safeAttr(old,'type','text');safeAttr(old,'autocomplete','off');safeAttr(old,'autocapitalize','characters');safeAttr(old,'enterkeyhint','done')}
}
function shortenIntro(){
  var app=document.getElementById('app');if(!app)return;
  var p=app.querySelector('h2 + p.sub');
  if(p&&/أدخل رقم الهوية والجوال/.test(p.textContent||''))p.textContent='أكمل البيانات واختر نوع العملية. الموقع وصورة الإثبات إلزاميان.';
}
function ensureTopStepper(){
  var app=document.getElementById('app'),f=document.getElementById('f');if(!app||!f)return;
  var st=document.getElementById(TOP_STEPPER);if(!st){st=document.createElement('div');st.id=TOP_STEPPER;st.innerHTML='<div class="ark-m-step active">1. البيانات</div><div class="ark-m-step">2. الموقع</div><div class="ark-m-step">3. الإثبات</div>';app.insertBefore(st,f)}
  else if(st.nextSibling!==f){try{app.insertBefore(st,f)}catch(_){}}
  var state=document.getElementById('state'),box=document.getElementById('photoEvidenceBox'),txt=(state&&state.textContent)||'';
  var phase=1;if(box||/تم تسجيل التواجد|المسحة مسجلة مسبقاً/.test(txt))phase=3;else{var send=document.getElementById('send');if(send&&(send.disabled||/جارٍ/.test(send.textContent||'')))phase=2}
  var a=st.children;for(var i=0;i<a.length;i++){a[i].className='ark-m-step '+(i+1<phase?'done':i+1===phase?'active':'')}
}
function compactGps(){
  var gps=document.getElementById('gps'),f=document.getElementById('f');if(!gps||!f)return;
  var actions=f.querySelector('.actions');
  if(gps.parentNode!==f){try{f.insertBefore(gps,actions||null)}catch(_){}}
  if(!document.getElementById(GPS_TITLE)){
    var t=document.createElement('div');t.id=GPS_TITLE;t.innerHTML='<b>الموقع</b><span>إلزامي</span>';gps.insertBefore(t,gps.firstChild);
  }
  var help=gps.querySelector('.perm-help');
  if(help&&(!help.parentNode||!help.parentNode.classList||!help.parentNode.classList.contains('ark-gps-help-wrap'))){
    var d=document.createElement('details');d.className='ark-gps-help-wrap';var sm=document.createElement('summary');sm.textContent='طريقة تفعيل الموقع';d.appendChild(sm);help.parentNode.insertBefore(d,help);d.appendChild(help);
  }
}
function syncKeyboardOffset(){
  var vv=window.visualViewport;
  if(!vv){document.documentElement.style.setProperty('--ark-vv-bottom','0px');document.body.classList.remove('ark-keyboard-open');return}
  var bottom=Math.max(0,window.innerHeight-(vv.height+vv.offsetTop));
  document.documentElement.style.setProperty('--ark-vv-bottom',Math.round(bottom)+'px');
  document.body.classList.toggle('ark-keyboard-open',vv.height<window.innerHeight*0.72);
}
function sync(){
  scheduled=false;addStyles();var r=route();setRouteClass(r);normalizeInputs(r);syncKeyboardOffset();
  if(r==='scan'){shortenIntro();ensureTopStepper();compactGps()}
}
function schedule(){if(scheduled)return;scheduled=true;(window.requestAnimationFrame||function(fn){return setTimeout(fn,16)})(sync)}
function boot(){
  addStyles();sync();
  var root=document.getElementById('app')||document.body;
  try{new MutationObserver(schedule).observe(root,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','disabled','open','value']})}catch(_){}
  document.addEventListener('input',schedule,true);document.addEventListener('change',schedule,true);document.addEventListener('focusin',schedule,true);document.addEventListener('focusout',function(){setTimeout(schedule,80)},true);
  window.addEventListener('pageshow',schedule);window.addEventListener('resize',schedule);window.addEventListener('orientationchange',function(){setTimeout(schedule,180)});
  if(window.visualViewport){window.visualViewport.addEventListener('resize',schedule);window.visualViewport.addEventListener('scroll',schedule)}
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')setTimeout(schedule,80)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();