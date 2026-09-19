(()=>{
'use strict';
if(window.__ARK_DIRECT_BOOTSTRAP_V546)return;
window.__ARK_DIRECT_BOOTSTRAP_V546=true;
const V='546';
const MODE_KEY='arkanat_field_mode_v5';
const TOKEN_KEY='arkanat_field_token_v5';
const OPS_KEY='arkanat_field_ops_v5';
const SHARE_MODE_KEY='arkanat_field_share_mode_v1';
const SHARE_KEY='arkanat_field_share_v1';

function navUrl(){try{const e=performance.getEntriesByType&&performance.getEntriesByType('navigation');return e&&e[0]&&e[0].name?new URL(e[0].name):new URL(location.href)}catch(_){try{return new URL(location.href)}catch(__){return null}}}
function hashParams(){try{return new URLSearchParams((location.hash||'').replace(/^#\??/,''))}catch(_){return new URLSearchParams()}}
function initialParams(){const u=navUrl();return u?u.searchParams:new URLSearchParams()}
function hashToken(){const h=hashParams();return h.get('p')||h.get('field')||''}
function initialToken(){const q=initialParams();const st=history.state&&history.state.arkToken?String(history.state.arkToken):'';return q.get('p')||q.get('field')||st||''}
function initialOps(){const q=initialParams();return q.get('ops')||''}
function hashOpsKey(){try{const v=hashParams().get('ops')||'';return v&&v!=='1'?v:''}catch(_){return''}}
function hashOpsMarker(){const raw=(location.hash||'').replace(/^#/,'');if(raw==='ops'||raw==='ops=1')return true;try{return hashParams().get('ops')==='1'}catch(_){return false}}
function hashShare(){try{return hashParams().get('share')||''}catch(_){return''}}
function activeShare(){const hs=hashShare();if(hs)return hs;try{if(history.state&&history.state.arkShare)return String(history.state.arkShare)}catch(_){};return''}
function scanUiPresent(){return !!(document.getElementById('f')&&document.getElementById('nid')&&document.getElementById('phone')&&!document.getElementById('count'))}
function opsUiPresent(){return !!document.getElementById('count')}
function safeSetGlobal(name,value){try{if(name==='TOKEN')TOKEN=value;else if(name==='OPS')OPS=value;else if(name==='SHARE')SHARE=value}catch(_){}}
function stored(k){try{return sessionStorage.getItem(k)||''}catch(_){return''}}
function put(k,v){try{if(v)sessionStorage.setItem(k,v);else sessionStorage.removeItem(k)}catch(_){}}
function base(){try{return location.origin+location.pathname}catch(_){return location.href.split(/[?#]/)[0]}}
function setHashRoute(hash,state){try{history.replaceState(state||null,'',base()+hash)}catch(_){}}
function renderIncomplete(){try{safeSetGlobal('OPS',null);safeSetGlobal('SHARE',null);put(OPS_KEY,'');put(SHARE_MODE_KEY,'');put(MODE_KEY,'');const s=document.getElementById('subtitle');if(s)s.textContent='نظام الرصد الميداني السريع';const a=document.getElementById('app');if(a)a.innerHTML='<h2>الرابط غير مكتمل</h2><p class="sub">امسح رمز QR المعتمد لنقطة الحراسة. صفحة إنشاء الأكواد لا تُفتح من روابط الحراس.</p>'}catch(_){}
}
function activateScan(token,rerender){
  if(!token)return false;
  safeSetGlobal('TOKEN',token);safeSetGlobal('OPS',null);safeSetGlobal('SHARE',null);
  put(TOKEN_KEY,token);put(OPS_KEY,'');put(SHARE_MODE_KEY,'');put(MODE_KEY,'scan');
  window.__ARK_SCAN_CONTEXT_LOCK=true;
  setHashRoute('#p='+encodeURIComponent(token),{arkMode:'scan',arkToken:token});
  if(rerender&&!scanUiPresent()&&typeof scanView==='function'){
    const a=document.getElementById('app');if(a)a.style.visibility='hidden';
    try{scanView()}finally{if(a)a.style.visibility=''}
  }
  return true;
}
function activateOps(explicitKey){
  const key=explicitKey||(typeof OPS!=='undefined'&&OPS)||stored(OPS_KEY);if(!key)return false;
  safeSetGlobal('OPS',key);safeSetGlobal('TOKEN',null);safeSetGlobal('SHARE',null);
  put(OPS_KEY,key);put(TOKEN_KEY,'');put(SHARE_MODE_KEY,'');put(MODE_KEY,'ops');
  setHashRoute('#ops='+encodeURIComponent(key),{arkMode:'ops'});return true;
}
function isolateRoute(){
  const ht=hashToken()||initialToken();
  if(ht)return activateScan(ht,!scanUiPresent());
  const liveToken=(typeof TOKEN!=='undefined'&&TOKEN)||stored(TOKEN_KEY);
  if(liveToken&&scanUiPresent())return activateScan(liveToken,false);
  const hop=hashOpsKey();
  if(hop){
    activateOps(hop);
    if(!opsUiPresent()&&typeof opsView==='function'){
      const a=document.getElementById('app');if(a)a.style.visibility='hidden';
      try{opsView()}finally{if(a)a.style.visibility=''}
    }
    return false;
  }
  const qop=initialOps();
  if(qop){
    activateOps(qop);
    if(!opsUiPresent()&&typeof opsView==='function'){
      const a=document.getElementById('app');if(a)a.style.visibility='hidden';
      try{opsView()}finally{if(a)a.style.visibility=''}
    }
    return false;
  }
  const share=activeShare();
  if(share){
    safeSetGlobal('SHARE',share);safeSetGlobal('OPS',null);safeSetGlobal('TOKEN',null);
    put(SHARE_KEY,share);put(SHARE_MODE_KEY,'1');put(OPS_KEY,'');put(TOKEN_KEY,'');put(MODE_KEY,'share');
    setHashRoute('#share='+encodeURIComponent(share),{arkMode:'share',arkShare:share});
    return false;
  }
  const explicitOps=hashOpsMarker()||(history.state&&history.state.arkMode==='ops');
  const liveOps=(typeof OPS!=='undefined'&&OPS)||stored(OPS_KEY);
  if(explicitOps&&liveOps)return activateOps(liveOps),false;
  if(liveOps&&opsUiPresent())return activateOps(liveOps),false;
  if(opsUiPresent()){renderIncomplete();return false}
  return false;
}
function activeScan(){try{if(hashToken()||initialToken())return true;if(typeof TOKEN!=='undefined'&&TOKEN)return true;return false}catch(_){return false}}
function load(src,id,flag,retry){return new Promise(resolve=>{try{if(flag&&window[flag])return resolve(true);if(document.getElementById(id))return resolve(true);const s=document.createElement('script');s.id=id;s.async=true;s.src=src+'?v='+V+(retry?'-r'+Date.now():'');s.onload=()=>resolve(true);s.onerror=()=>{try{s.remove()}catch(_){};if(!retry)load(src,id,flag,true).then(resolve);else resolve(false)};(document.head||document.documentElement).appendChild(s)}catch(_){resolve(false)}})}
function later(fn,ms){return setTimeout(fn,ms)}
function refreshWorkerLater(){later(()=>{try{if(!('serviceWorker'in navigator))return;navigator.serviceWorker.getRegistration('./').then(r=>{if(r)r.update().catch(()=>{})}).catch(()=>{})}catch(_){}},2200)}
function bootGuard(){
  if(!activeScan())return;
  load('./shift-attendance.js','directShift546','__ARK_FIELD_SHIFT_ATTENDANCE_V2',false);
  load('./mobile-ux.js','directMobile546','__ARK_FIELD_MOBILE_UX_V4',false);
  later(()=>load('./photo-evidence.js','directPhoto546','__ARK_FIELD_PHOTO_EVIDENCE_V2',false),180);
  later(()=>load('./workflow-ux.js','directWorkflow546','__ARK_FIELD_WORKFLOW_UX_V4',false),320);
  later(()=>load('./photo-evidence-ux.js','directPhotoUx546','__ARK_FIELD_PHOTO_UX_V2',false),700);
}
function boot(){isolateRoute();if(activeScan())bootGuard();else if(activeShare())load('./reprint-core.js','fieldReprintCore546',null,false);else if(opsUiPresent())load('./reprint-core.js','fieldReprintCore546',null,false);refreshWorkerLater()}
isolateRoute();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('pageshow',()=>{isolateRoute();if(activeScan())bootGuard();refreshWorkerLater()});
window.addEventListener('hashchange',()=>{isolateRoute();if(activeScan())bootGuard()});
})();