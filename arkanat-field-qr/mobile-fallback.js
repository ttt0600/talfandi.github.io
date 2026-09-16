(function(){
'use strict';
if(window.__ARK_FIELD_MOBILE_FALLBACK_V1)return;
window.__ARK_FIELD_MOBILE_FALLBACK_V1=true;
var pending=false;
function sync(){
  pending=false;
  var f=document.getElementById('f'),nid=document.getElementById('nid'),count=document.getElementById('count');
  if(!f||!nid||count)return;
  var a=null;try{a=f.querySelector(':scope > .actions')}catch(_){var xs=f.getElementsByClassName('actions');a=xs&&xs[0]||null}
  if(!a)return;
  var has=!!(document.getElementById('arkWorkflowBar')||document.getElementById('arkFieldFlowBar'));
  document.body.classList.toggle('ark-has-sticky-flow',has);
  try{a.style.setProperty('display',has?'none':'flex','important')}catch(_){}
}
function schedule(){if(pending)return;pending=true;(window.requestAnimationFrame||function(fn){return setTimeout(fn,16)})(sync)}
function boot(){sync();var root=document.getElementById('app')||document.body;try{new MutationObserver(schedule).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled']})}catch(_){}window.addEventListener('pageshow',schedule);document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')schedule()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();