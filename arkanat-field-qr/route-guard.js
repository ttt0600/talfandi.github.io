(()=>{
'use strict';
if(window.__ARK_FIELD_ROUTE_GUARD_V1)return;
window.__ARK_FIELD_ROUTE_GUARD_V1=true;

const K_TOKEN='arkanat_field_token_v5';
const K_OPS='arkanat_field_ops_v5';
const K_SHARE='arkanat_field_share_v1';
const K_SHARE_MODE='arkanat_field_share_mode_v1';
const K_ROUTE='arkanat_field_route_guard_v1';
const REPAIR_KEY='arkanat_field_route_repair_v1';
const SHIFT_SCRIPT_ID='fieldShiftAttendanceRuntime';
const PHOTO_UX_SCRIPT_ID='fieldPhotoEvidenceUxRuntime';
const WORKFLOW_UX_SCRIPT_ID='fieldWorkflowUxRuntime';
const MOBILE_UX_SCRIPT_ID='fieldMobileUxRuntime';
const MOBILE_FALLBACK_SCRIPT_ID='fieldMobileFallbackRuntime';

function params(){
  const q=new URLSearchParams(location.search||'');
  let h=new URLSearchParams();
  try{h=new URLSearchParams((location.hash||'').replace(/^#\??/,''))}catch(_){}
  return{q,h};
}
function first(a,b,...keys){for(const k of keys){const v=a.get(k)||b.get(k);if(v)return v}return''}
function clearLegacyOps(){
  try{
    const keys=[];for(let i=0;i<sessionStorage.length;i++)keys.push(sessionStorage.key(i));
    for(const k of keys){if(!k)continue;if(k===K_OPS||k===K_SHARE||k===K_SHARE_MODE||/^arkanat_field_ops_/i.test(k)||/^arkanat_field_share_/i.test(k))sessionStorage.removeItem(k)}
  }catch(_){}
}
function setScan(token){
  if(!token)return;
  try{sessionStorage.setItem(K_TOKEN,token);clearLegacyOps();sessionStorage.setItem(K_ROUTE,'scan')}catch(_){}
  window.__ARK_FIELD_ROUTE='scan';window.__ARK_FIELD_TOKEN=token;
}
function setOps(key){
  if(!key)return;
  try{sessionStorage.setItem(K_OPS,key);sessionStorage.removeItem(K_TOKEN);sessionStorage.removeItem(K_SHARE);sessionStorage.removeItem(K_SHARE_MODE);sessionStorage.setItem(K_ROUTE,'ops')}catch(_){}
  window.__ARK_FIELD_ROUTE='ops';
}
function setShare(share){
  if(!share)return;
  try{sessionStorage.setItem(K_SHARE,share);sessionStorage.setItem(K_SHARE_MODE,'1');sessionStorage.removeItem(K_TOKEN);sessionStorage.removeItem(K_OPS);sessionStorage.setItem(K_ROUTE,'share')}catch(_){}
  window.__ARK_FIELD_ROUTE='share';
}
function resolveRoute(){
  const {q,h}=params(),scan=first(q,h,'p','field'),ops=first(q,h,'ops'),share=first(q,h,'share');
  if(scan){setScan(scan);return{route:'scan',token:scan,explicit:true}}
  if(ops){setOps(ops);return{route:'ops',ops,explicit:true}}
  if(share){setShare(share);return{route:'share',share,explicit:true}}
  try{
    const token=sessionStorage.getItem(K_TOKEN)||'',shareMode=sessionStorage.getItem(K_SHARE_MODE)==='1',shareStored=sessionStorage.getItem(K_SHARE)||'',opsStored=sessionStorage.getItem(K_OPS)||'';
    if(token){setScan(token);return{route:'scan',token,explicit:false}}
    if(shareMode&&shareStored)return{route:'share',share:shareStored,explicit:false};
    if(opsStored)return{route:'ops',ops:opsStored,explicit:false};
  }catch(_){}
  return{route:'none'};
}
function loadScript(id,flag,src,existingId){
  if(window[flag]||document.getElementById(id)||(existingId&&document.getElementById(existingId)))return;
  try{
    const s=document.createElement('script');s.id=id;s.src=src;s.async=false;
    s.onerror=()=>{try{s.remove();if(window[flag]||document.getElementById(id))return;const retry=document.createElement('script');retry.id=id;retry.src=src+'-r'+Date.now();retry.async=false;(document.head||document.documentElement).appendChild(retry)}catch(_){}};
    (document.head||document.documentElement).appendChild(s);
  }catch(_){}
}
function bootScanLayers(){
  const r=resolveRoute();if(r.route!=='scan'||!r.token)return;
  loadScript(SHIFT_SCRIPT_ID,'__ARK_FIELD_SHIFT_ATTENDANCE_V1','./shift-attendance.js?v=526','fieldShiftAttendanceScript');
  loadScript(PHOTO_UX_SCRIPT_ID,'__ARK_FIELD_PHOTO_UX_V1','./photo-evidence-ux.js?v=526','fieldPhotoEvidenceUxScript');
  loadScript(WORKFLOW_UX_SCRIPT_ID,'__ARK_FIELD_WORKFLOW_UX_V2','./workflow-ux.js?v=526','fieldWorkflowUxScript');
  loadScript(MOBILE_UX_SCRIPT_ID,'__ARK_FIELD_MOBILE_UX_V1','./mobile-ux.js?v=526','fieldMobileUxScript');
  loadScript(MOBILE_FALLBACK_SCRIPT_ID,'__ARK_FIELD_MOBILE_FALLBACK_V1','./mobile-fallback.js?v=526','fieldMobileFallbackScript');
}
function looksLikeOps(){
  try{const subtitle=document.getElementById('subtitle'),app=document.getElementById('app'),s=(subtitle&&subtitle.textContent||'')+' '+(app&&app.textContent||'');return /إدارة العمليات|بيانات المشرف|اسم المشرف/.test(s)&&!!document.getElementById('count')}catch(_){return false}
}
function enforce(){
  const r=resolveRoute();if(r.route!=='scan'||!r.token)return false;
  setScan(r.token);bootScanLayers();if(!looksLikeOps())return false;
  try{if(typeof TOKEN!=='undefined')TOKEN=r.token}catch(_){}
  try{if(typeof OPS!=='undefined')OPS=null}catch(_){}
  try{if(typeof SHARE!=='undefined')SHARE=null}catch(_){}
  try{if(typeof scanView==='function'){scanView();sessionStorage.removeItem(REPAIR_KEY);return true}}catch(_){}
  return false;
}
function fallbackRepair(){
  const r=resolveRoute();if(r.route!=='scan'||!r.token||!looksLikeOps())return;
  try{const n=Number(sessionStorage.getItem(REPAIR_KEY)||0);if(n>=1)return;sessionStorage.setItem(REPAIR_KEY,String(n+1));const u=new URL(location.origin+location.pathname);u.searchParams.set('p',r.token);u.searchParams.set('__ark_route_repair','1');location.replace(u.href)}catch(_){}
}

resolveRoute();bootScanLayers();
window.addEventListener('pageshow',()=>{bootScanLayers();setTimeout(()=>{if(!enforce())setTimeout(fallbackRepair,350)},0)});
window.addEventListener('popstate',()=>{bootScanLayers();setTimeout(enforce,0)});
window.addEventListener('hashchange',()=>{bootScanLayers();setTimeout(enforce,0)});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){bootScanLayers();setTimeout(enforce,0)}});
document.addEventListener('DOMContentLoaded',()=>{
  bootScanLayers();enforce();let tries=0;
  const timer=setInterval(()=>{tries++;bootScanLayers();const fixed=enforce();if(fixed||tries>=20){clearInterval(timer);if(!fixed)fallbackRepair()}},150);
  try{const root=document.getElementById('app')||document.documentElement;const mo=new MutationObserver(()=>{bootScanLayers();enforce()});mo.observe(root,{subtree:true,childList:true,characterData:true});setTimeout(()=>mo.disconnect(),8000)}catch(_){}
});
})();