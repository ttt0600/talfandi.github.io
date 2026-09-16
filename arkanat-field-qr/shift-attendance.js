(()=>{
'use strict';
if(window.__ARK_FIELD_SHIFT_ATTENDANCE_V1)return;
window.__ARK_FIELD_SHIFT_ATTENDANCE_V1=true;

const SHIFT_API='https://dbxvfrkkocfwjumvoaha.supabase.co/functions/v1/field-shift-evidence';
const MAP_KEY='arkanat_field_shift_action_map_v1';
const PENDING_KEY='arkanat_field_shift_pending_v1';
const MAX_MAP=250;
const MAX_PENDING=250;
const ACTIONS=new Set(['start_shift','field_check','end_shift']);

function activeToken(){
  try{
    if(typeof TOKEN!=='undefined'&&TOKEN)return String(TOKEN);
  }catch(_){}
  try{return sessionStorage.getItem('arkanat_field_token_v5')||''}catch(_){return''}
}
function isScanForm(){
  const f=document.getElementById('f');
  if(!f||document.getElementById('count'))return false;
  return !!(document.getElementById('nid')&&document.getElementById('phone')&&activeToken());
}
function readObj(key){try{const x=JSON.parse(localStorage.getItem(key)||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch(_){return{}}}
function writeObj(key,x){try{localStorage.setItem(key,JSON.stringify(x))}catch(_){}}
function readArr(key){try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}}
function writeArr(key,x){try{localStorage.setItem(key,JSON.stringify(x.slice(-MAX_PENDING)))}catch(_){}}
function mapSet(nonce,action){
  if(!nonce||!ACTIONS.has(action))return;
  const x=readObj(MAP_KEY);x[nonce]={action,at:Date.now()};
  const keys=Object.keys(x).sort((a,b)=>Number(x[a]?.at||0)-Number(x[b]?.at||0));
  while(keys.length>MAX_MAP){delete x[keys.shift()]}
  writeObj(MAP_KEY,x);
}
function mapGet(nonce){const x=readObj(MAP_KEY);const v=x[nonce];return v&&ACTIONS.has(v.action)?v.action:''}
function mapDel(nonce){const x=readObj(MAP_KEY);if(x[nonce]){delete x[nonce];writeObj(MAP_KEY,x)}}
function currentAction(){const r=document.querySelector('input[name="arkShiftAction"]:checked');return r&&ACTIONS.has(r.value)?r.value:'field_check'}
function actionLabel(v){return v==='start_shift'?'بدء الوردية':v==='end_shift'?'انتهاء الوردية':'رصد ميداني'}

function addStyles(){
  if(document.getElementById('arkShiftStyle'))return;
  const s=document.createElement('style');s.id='arkShiftStyle';
  s.textContent=`.ark-shift{margin:16px 0 4px}.ark-shift-title{font-weight:900;margin-bottom:8px}.ark-shift-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ark-shift-opt{position:relative}.ark-shift-opt input{position:absolute;opacity:0;pointer-events:none}.ark-shift-opt span{display:flex;min-height:58px;align-items:center;justify-content:center;text-align:center;padding:9px 7px;border:1.5px solid #cfdad4;border-radius:13px;background:#fff;color:#274437;font-weight:800;line-height:1.35;cursor:pointer}.ark-shift-opt input:checked+span{border-color:#1d6b4a;background:#e8f4ed;color:#123f2c;box-shadow:0 0 0 2px rgba(29,107,74,.10)}.ark-shift-help{font-size:12px;color:#69776f;line-height:1.6;margin-top:7px}@media(max-width:390px){.ark-shift-grid{gap:6px}.ark-shift-opt span{font-size:13px;padding:8px 5px}}`;
  document.head.appendChild(s);
}
function ensureChooser(){
  if(!isScanForm()||document.getElementById('arkShiftChooser'))return;
  addStyles();
  const f=document.getElementById('f');if(!f)return;
  const actions=f.querySelector('.actions');
  const box=document.createElement('div');box.id='arkShiftChooser';box.className='ark-shift';
  box.innerHTML=`<div class="ark-shift-title">نوع العملية</div><div class="ark-shift-grid">
    <label class="ark-shift-opt"><input type="radio" name="arkShiftAction" value="start_shift"><span>بدء الوردية</span></label>
    <label class="ark-shift-opt"><input type="radio" name="arkShiftAction" value="field_check" checked><span>رصد ميداني</span></label>
    <label class="ark-shift-opt"><input type="radio" name="arkShiftAction" value="end_shift"><span>انتهاء الوردية</span></label>
  </div><div class="ark-shift-help">اختر بدء أو انتهاء الوردية عند بداية أو نهاية الدوام. للمسحات أثناء الوردية اترك «رصد ميداني».</div>`;
  if(actions)f.insertBefore(box,actions);else f.appendChild(box);
}

async function postShift(row){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);
  try{
    const r=await fetch(SHIFT_API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(row),signal:c.signal,cache:'no-store'});
    const z=await r.json().catch(()=>({}));
    if(!r.ok||!z.ok){const e=new Error(z.message||'تعذر حفظ نوع العملية.');e.status=r.status;e.permanent=r.status>=400&&r.status<500&&r.status!==408&&r.status!==409&&r.status!==429;throw e}
    return z;
  }finally{clearTimeout(t)}
}
function queueShift(row){
  if(!row||!row.event_nonce||!ACTIONS.has(row.attendance_action))return;
  const q=readArr(PENDING_KEY).filter(x=>x&&x.event_nonce!==row.event_nonce);
  q.push({...row,queued_at:Date.now()});writeArr(PENDING_KEY,q);
}
async function saveShift(eventId,eventNonce,token,action){
  if(!eventNonce||!token||!ACTIONS.has(action))return;
  const row={event_id:eventId||'',event_nonce:eventNonce,checkpoint_token:token,attendance_action:action};
  try{await postShift(row);mapDel(eventNonce)}catch(e){queueShift(row);if(e&&e.permanent)mapDel(eventNonce)}
}
async function flushShift(){
  if(!navigator.onLine)return;
  const q=readArr(PENDING_KEY);if(!q.length)return;
  const keep=[];
  for(const row of q.slice(0,20)){
    try{await postShift(row);mapDel(row.event_nonce)}catch(e){if(!(e&&e.permanent))keep.push(row)}
  }
  writeArr(PENDING_KEY,[...keep,...q.slice(20)]);
}

const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  let body=null,mode='';
  try{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.includes('/functions/v1/guard-control-uat-helper')&&init&&String(init.method||'GET').toUpperCase()==='POST'&&typeof init.body==='string'){
      body=JSON.parse(init.body);
      if(body&&body.action==='scan')mode='scan';
      else if(body&&body.action==='scan_batch'&&Array.isArray(body.scans))mode='batch';
    }
  }catch(_){}
  if(mode==='scan'&&body&&body.event_nonce)mapSet(String(body.event_nonce),currentAction());
  const r=await nativeFetch(input,init);
  if(mode){
    try{
      const c=r.clone();
      c.json().then(z=>{
        const token=(body&&body.checkpoint_token)||activeToken();
        if(mode==='scan'){
          const nonce=String(body.event_nonce||'');const a=mapGet(nonce);
          if(a&&z&&z.ok)saveShift(String(z.event_id||''),nonce,String(token||''),a);
        }else if(mode==='batch'&&z&&z.ok&&Array.isArray(z.results)){
          body.scans.forEach((s,i)=>{const nonce=String(s&&s.event_nonce||'');const a=mapGet(nonce);const rr=z.results[i]||{};if(a&&rr&&rr.ok)saveShift(String(rr.event_id||''),nonce,String(s&&s.checkpoint_token||token||''),a)});
        }
      }).catch(()=>{});
    }catch(_){}
  }
  return r;
};

function boot(){ensureChooser();flushShift();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
const mo=new MutationObserver(()=>ensureChooser());
try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(_){}
window.addEventListener('online',flushShift);
window.addEventListener('pageshow',()=>{ensureChooser();flushShift()});
setInterval(flushShift,60000);
})();