(()=>{
'use strict';
if(window.__ARK_FIELD_PHOTO_EVIDENCE_V2)return;
window.__ARK_FIELD_PHOTO_EVIDENCE_V2=true;
window.__ARK_FIELD_PHOTO_EVIDENCE_V1=true;

const PHOTO_API='https://dbxvfrkkocfwjumvoaha.supabase.co/functions/v1/field-photo-evidence';
const PHOTO_DB='arkanat-field-photo-v1';
const PHOTO_STORE='pending';
const REQUIRED_KEY='arkanat_field_photo_required_v2';
const TARGET_BYTES=450000;
const HARD_BYTES=850000;
const MAX_INPUT_BYTES=30*1024*1024;
const MAX_PENDING_PHOTOS=30;
const MAX_GALLERY_AGE_MS=30*60*1000;
const REQUIRED_TTL_MS=2*60*60*1000;
const PICKER_CANCEL_GRACE_MS=2200;
let lastPromptedEvent='';
let requiredEventId='';
let lastScanResult=null;
let awaitingScan=false;
let stateObserver=null;
let pickerActive=false;
let pickerInput=null;
let pickerEventId='';
let pickerCancelTimer=0;
let photoProcessing=false;

function h(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function fmtTime(v){try{return new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',dateStyle:'medium',timeStyle:'medium'}).format(new Date(v))}catch(_){return String(v||'')}}
function hasToken(){try{return typeof TOKEN!=='undefined'&&!!TOKEN}catch(_){return false}}
function getToken(){try{return typeof TOKEN!=='undefined'?TOKEN:''}catch(_){return''}}
function freshEnough(file){const lm=Number(file&&file.lastModified||0),now=Date.now();if(!lm)return true;if(lm>now+5*60*1000)return false;return now-lm<=MAX_GALLERY_AGE_MS}
function timeoutFetch(url,init,ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);return fetch(url,{...init,signal:c.signal}).finally(()=>clearTimeout(t))}
function stateEl(){return document.getElementById('state')}
function hideScanForm(){const f=document.getElementById('f'),gps=document.getElementById('gps');if(f)f.classList.add('hidden');if(gps)gps.classList.add('hidden')}
function livePhotoBox(eventId){const b=document.getElementById('photoEvidenceBox');return !!(b&&(!eventId||b.dataset.eventId===String(eventId)))}
function clearPickerTimer(){if(pickerCancelTimer){clearTimeout(pickerCancelTimer);pickerCancelTimer=0}}
function resetPickerState(){clearPickerTimer();pickerActive=false;pickerInput=null;pickerEventId=''}
function pickerOrProcessing(){return pickerActive||photoProcessing}

function saveRequired(eventId){
  if(!eventId)return;
  try{sessionStorage.setItem(REQUIRED_KEY,JSON.stringify({event_id:eventId,at:Date.now()}))}catch(_){}
}
function loadRequired(){
  try{
    const x=JSON.parse(sessionStorage.getItem(REQUIRED_KEY)||'null');
    if(!x||!x.event_id||Date.now()-Number(x.at||0)>REQUIRED_TTL_MS){sessionStorage.removeItem(REQUIRED_KEY);return''}
    return String(x.event_id)
  }catch(_){return''}
}
function clearRequired(){try{sessionStorage.removeItem(REQUIRED_KEY)}catch(_){} requiredEventId='';resetPickerState();photoProcessing=false;window.removeEventListener('beforeunload',beforeUnloadGuard)}
function beforeUnloadGuard(e){if(!requiredEventId||pickerActive)return;e.preventDefault();e.returnValue='';return''}
function armRequired(eventId,result){
  if(!eventId)return;
  requiredEventId=String(eventId);lastScanResult=result||lastScanResult;awaitingScan=false;saveRequired(requiredEventId);hideScanForm();
  window.addEventListener('beforeunload',beforeUnloadGuard);
  ensureStateObserver();
  if(!livePhotoBox(requiredEventId))showMandatoryReceipt();
}

function receiptDetails(){
  const z=lastScanResult||{};
  return (z.server_time_local?'<p><b>'+h(z.server_time_local)+'</b></p>':'')+(z.guard_name?'<p>تمت مطابقة الموظف: '+h(z.guard_name)+'</p>':'<p class="sub">تم حفظ بيانات التواجد للمطابقة.</p>');
}
function showHolding(){
  if(pickerOrProcessing())return;
  const state=stateEl();if(!state)return;
  hideScanForm();
  state.innerHTML='<div class="center"><div style="font-size:52px">📷</div><h2 class="warn">جارٍ استكمال تسجيل التواجد</h2><p style="font-weight:900">لا تغلق الصفحة. صورة الإثبات إلزامية لإكمال التسجيل.</p><div class="note"><div class="spin"></div><div class="center">جارٍ تجهيز خطوة التصوير…</div></div></div>';
}
function showMandatoryReceipt(){
  const state=stateEl();if(!state||!requiredEventId)return;
  if((pickerOrProcessing()||livePhotoBox(requiredEventId))&&livePhotoBox(requiredEventId))return;
  hideScanForm();
  state.innerHTML='<div id="scanMandatoryReceipt" class="center"><div style="font-size:52px">📷</div><h2 class="warn">تم حفظ بيانات التواجد الأولية</h2><p style="font-weight:900;font-size:18px;margin:8px 0">التسجيل غير مكتمل حتى التقاط صورة الإثبات.</p>'+receiptDetails()+'<div id="photoEvidenceAnchor" class="note" style="border:2px solid #1d6b4a;background:#eef7f2"><b class="warn">صورة الموقع مطلوبة لإكمال التسجيل.</b><div class="spin"></div><div class="center">جارٍ تجهيز الكاميرا…</div></div></div>';
}
function completeRegistration(note,queued=false){
  const state=stateEl();
  clearRequired();awaitingScan=false;
  if(!state)return;
  state.innerHTML='<div class="center"><div style="font-size:54px">✓</div><h2 class="ok">تم تسجيل التواجد</h2>'+receiptDetails()+'<div class="note"><b class="'+(queued?'warn':'ok')+'">✓ '+h(note)+'</b><p class="sub">اكتملت الخطوات المطلوبة ويمكن إغلاق الصفحة.</p></div></div>';
}
function ensureStateObserver(){
  if(stateObserver)return;
  const state=stateEl();if(!state){setTimeout(ensureStateObserver,80);return}
  stateObserver=new MutationObserver(()=>{
    if(pickerOrProcessing())return;
    const txt=state.textContent||'';
    const legacySuccess=txt.includes('تم تسجيل التواجد')||txt.includes('المسحة مسجلة مسبقاً');
    if(!legacySuccess)return;
    if(requiredEventId){if(!livePhotoBox(requiredEventId)){showMandatoryReceipt();setTimeout(()=>renderPhotoStep(requiredEventId,true),0)}return}
    if(awaitingScan)showHolding();
  });
  stateObserver.observe(state,{childList:true,subtree:true,characterData:true});
}

async function apiJson(body){
  let r;try{r=await timeoutFetch(PHOTO_API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'},25000)}catch(e){if(e&&e.name==='AbortError')throw new Error('انتهت مهلة تجهيز صورة الإثبات.');throw e}
  const z=await r.json().catch(()=>({}));if(!r.ok||!z.ok){const e=new Error(z.message||'تعذر تجهيز صورة الإثبات.');e.status=r.status;e.permanent=r.status>=400&&r.status<500&&r.status!==408&&r.status!==429;throw e}return z
}
function openDb(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window)){reject(new Error('indexeddb_unavailable'));return}const q=indexedDB.open(PHOTO_DB,1);q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(PHOTO_STORE))db.createObjectStore(PHOTO_STORE,{keyPath:'event_id'})};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error||new Error('indexeddb_error'))})}
async function dbAll(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(PHOTO_STORE,'readonly'),q=tx.objectStore(PHOTO_STORE).getAll();q.onsuccess=()=>{const x=q.result||[];db.close();resolve(x)};q.onerror=()=>{db.close();reject(q.error)}})}
async function dbDelete(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(PHOTO_STORE,'readwrite');tx.objectStore(PHOTO_STORE).delete(id);tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function dbPut(row){row={...row,queued_at:row.queued_at||Date.now()};const all=await dbAll().catch(()=>[]),exists=all.some(x=>x&&x.event_id===row.event_id);if(!exists&&all.length>=MAX_PENDING_PHOTOS)throw new Error('وصل الجهاز إلى الحد الآمن للصور المعلقة. يلزم الاتصال بالإنترنت قبل حفظ صور إضافية.');const db=await openDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction(PHOTO_STORE,'readwrite');tx.objectStore(PHOTO_STORE).put(row);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}finally{db.close()}return true}

async function uploadRow(row){
  const fd=new FormData();fd.append('action','upload');fd.append('event_id',row.event_id);fd.append('checkpoint_token',row.checkpoint_token);fd.append('captured_client_ts',row.captured_client_ts||new Date().toISOString());fd.append('width_px',String(row.width_px||0));fd.append('height_px',String(row.height_px||0));fd.append('photo',row.blob,'field-evidence.jpg');
  let r;try{r=await timeoutFetch(PHOTO_API,{method:'POST',body:fd,cache:'no-store'},45000)}catch(e){if(e&&e.name==='AbortError'){const x=new Error('انتهت مهلة رفع صورة الإثبات.');x.transient=true;throw x}e.transient=true;throw e}
  const z=await r.json().catch(()=>({}));if(!r.ok||!z.ok){const e=new Error(z.message||'تعذر رفع صورة الإثبات.');e.status=r.status;e.permanent=r.status>=400&&r.status<500&&r.status!==408&&r.status!==409&&r.status!==429;throw e}return z
}
async function flushPhotoQueue(){if(!navigator.onLine||!('indexedDB'in window))return;let rows=[];try{rows=(await dbAll()).sort((a,b)=>Number(a.queued_at||0)-Number(b.queued_at||0))}catch(_){return}for(const row of rows.slice(0,5)){try{await uploadRow(row);await dbDelete(row.event_id)}catch(e){if(e&&e.permanent){try{await dbDelete(row.event_id)}catch(_){};continue}break}}}

async function loadImage(file){if('createImageBitmap'in window){try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch(_){}}return loadImageFallback(file)}
function loadImageFallback(file){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('تعذر قراءة الصورة على هذا الجهاز.'))};im.src=u})}
function canvasBlob(canvas,q){return new Promise((resolve,reject)=>{if(!canvas.toBlob){reject(new Error('المتصفح لا يدعم تجهيز الصورة.'));return}canvas.toBlob(b=>b?resolve(b):reject(new Error('تعذر تجهيز الصورة.')),'image/jpeg',q)})}
function drawOverlay(ctx,w,hgt,meta,capturedTs){const pad=Math.round(Math.max(22,w*.025)),fs=Math.round(Math.max(24,Math.min(38,w*.028))),line=Math.round(fs*1.45),lines=['أركانات للحراسات الأمنية','النقطة: '+String(meta.checkpoint_code||''),'وقت المسحة: '+fmtTime(meta.server_time),'وقت الصورة: '+fmtTime(capturedTs)];if(meta.lat!=null&&meta.lng!=null){lines.push('الموقع: '+Number(meta.lat).toFixed(6)+' ، '+Number(meta.lng).toFixed(6));if(meta.accuracy_m!=null)lines.push('دقة الموقع: '+Math.round(Number(meta.accuracy_m))+' م')}else lines.push('الموقع: غير متاح في المسحة');const boxH=pad*2+line*lines.length;ctx.save();ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,hgt-boxH,w,boxH);try{ctx.direction='rtl'}catch(_){}ctx.textAlign='right';ctx.textBaseline='top';ctx.font='700 '+fs+'px -apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif';ctx.fillStyle='#fff';let y=hgt-boxH+pad;for(const t of lines){ctx.fillText(t,w-pad,y,w-pad*2);y+=line}ctx.restore()}
async function compose(file,meta,capturedTs){if(!file||file.size<1000)throw new Error('لم تصل صورة صالحة.');if(file.size>MAX_INPUT_BYTES)throw new Error('الصورة الأصلية كبيرة جداً على هذا الجهاز. التقط صورة جديدة بالكاميرا بدلاً من اختيار ملف كبير.');const im=await loadImage(file),iw=im.width||im.naturalWidth,ih=im.height||im.naturalHeight;if(!iw||!ih)throw new Error('تعذر تحديد أبعاد الصورة.');let max=1600,scale=Math.min(1,max/Math.max(iw,ih)),w=Math.max(1,Math.round(iw*scale)),hgt=Math.max(1,Math.round(ih*scale)),canvas=document.createElement('canvas');canvas.width=w;canvas.height=hgt;let ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('تعذر تشغيل معالج الصور على هذا الجهاز.');ctx.drawImage(im,0,0,w,hgt);drawOverlay(ctx,w,hgt,meta,capturedTs);let blob=await canvasBlob(canvas,.82);for(const q of [.72,.64,.56]){if(blob.size<=TARGET_BYTES)break;blob=await canvasBlob(canvas,q)}if(blob.size>HARD_BYTES){max=1280;scale=Math.min(1,max/Math.max(iw,ih));w=Math.max(1,Math.round(iw*scale));hgt=Math.max(1,Math.round(ih*scale));canvas=document.createElement('canvas');canvas.width=w;canvas.height=hgt;ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('تعذر تشغيل معالج الصور على هذا الجهاز.');ctx.drawImage(im,0,0,w,hgt);drawOverlay(ctx,w,hgt,meta,capturedTs);blob=await canvasBlob(canvas,.68);for(const q of [.58,.50,.44]){if(blob.size<=HARD_BYTES)break;blob=await canvasBlob(canvas,q)}}try{if(im.close)im.close()}catch(_){}canvas.width=1;canvas.height=1;if(blob.size>HARD_BYTES)throw new Error('تعذر ضغط الصورة للحجم المناسب. أعد التصوير.');return{blob,width:w,height:hgt}}

function makePhotoShell(state,eventId){
  const old=document.getElementById('photoEvidenceBox');if(old&&old.dataset.eventId===String(eventId))return old;if(old&&!pickerOrProcessing())old.remove();
  const box=document.createElement('div');box.id='photoEvidenceBox';box.dataset.eventId=String(eventId);box.className='note';box.style.cssText='margin-top:16px;border:2px solid #1d6b4a;background:#eef7f2;scroll-margin-top:18px';
  box.innerHTML='<b class="warn" style="font-size:19px">صورة الإثبات إلزامية</b><p style="margin:8px 0 6px;font-weight:900">لن يظهر اكتمال تسجيل التواجد قبل التقاط الصورة وحفظها.</p><p class="sub" style="margin:0 0 10px">التقط صورة حديثة للموقع الآن. بيانات المسحة الأساسية لن تتغير.</p><input id="fieldPhotoInput" type="file" accept="image/*" capture="environment" class="hidden"><div class="actions"><button id="fieldPhotoTake" type="button">التقاط صورة للموقع</button></div><div id="fieldPhotoState"><span class="sub">جارٍ تجهيز بيانات الصورة…</span></div>';
  const anchor=document.getElementById('photoEvidenceAnchor');if(anchor)anchor.replaceWith(box);else state.appendChild(box);
  setTimeout(()=>{try{box.scrollIntoView({behavior:'smooth',block:'center'})}catch(_){try{box.scrollIntoView()}catch(__){}}},40);return box
}

function openPhotoPicker(input,take,out,eventId){
  if(!input||pickerActive||photoProcessing)return;
  clearPickerTimer();
  try{input.value=''}catch(_){}
  pickerActive=true;pickerInput=input;pickerEventId=String(eventId||'');
  if(take)take.disabled=true;
  if(out)out.innerHTML='<span class="sub">الكاميرا مفتوحة. التقط الصورة ثم اختر «استخدام الصورة» للعودة وإكمال التسجيل.</span>';
  try{input.click()}catch(e){resetPickerState();if(take)take.disabled=false;if(out)out.innerHTML='<p class="bad">تعذر فتح الكاميرا على هذا المتصفح. حاول مرة أخرى أو افتح الرابط في المتصفح الافتراضي للجهاز.</p>'}
}
function markPickerCancelled(input,take,out){
  if(input!==pickerInput&&pickerInput)return;
  resetPickerState();
  if(take)take.disabled=false;
  if(out&&document.body.contains(out))out.innerHTML='<span class="warn">لم يتم اختيار صورة. اضغط «التقاط صورة للموقع» وحاول مرة أخرى.</span>';
}
function schedulePickerCancelFallback(){
  clearPickerTimer();
  pickerCancelTimer=setTimeout(()=>{
    if(!pickerActive||photoProcessing)return;
    const input=pickerInput;if(input&&input.files&&input.files.length)return;
    const box=livePhotoBox(pickerEventId)?document.getElementById('photoEvidenceBox'):null;
    const take=box&&box.querySelector('#fieldPhotoTake'),out=box&&box.querySelector('#fieldPhotoState');
    markPickerCancelled(input,take,out);
  },PICKER_CANCEL_GRACE_MS)
}

function renderPhotoStep(eventId,force=false){
  if(!hasToken()||!eventId)return;
  const existing=document.getElementById('photoEvidenceBox');
  if(existing&&existing.dataset.eventId===String(eventId)&&existing.dataset.arkBound==='1')return;
  if((pickerOrProcessing())&&existing)return;
  if(!force&&eventId===lastPromptedEvent)return;
  lastPromptedEvent=eventId;let tries=0;
  const mount=()=>{
    const state=stateEl();if(!state&&tries++<30){setTimeout(mount,80);return}if(!state)return;
    if(requiredEventId!==eventId)armRequired(eventId,lastScanResult);
    const box=makePhotoShell(state,eventId),input=box.querySelector('#fieldPhotoInput'),take=box.querySelector('#fieldPhotoTake'),out=box.querySelector('#fieldPhotoState');if(!input||!take||!out)return;
    box.dataset.arkBound='1';
    let meta=null,metaPromise=null,processing=false;
    const loadMeta=(forceMeta=false)=>{if(meta&&!forceMeta)return Promise.resolve(meta);if(metaPromise&&!forceMeta)return metaPromise;metaPromise=apiJson({action:'meta',event_id:eventId,checkpoint_token:getToken()}).then(z=>{meta=z;metaPromise=null;if(z.already_uploaded){completeRegistration('صورة الإثبات محفوظة ومربوطة بالمسحة.');return z}if(!processing&&!pickerActive&&out&&document.body.contains(out))out.innerHTML='<span class="ok">الكاميرا جاهزة. التقط صورة الموقع لإكمال التسجيل.</span>';return z}).catch(e=>{metaPromise=null;if(!processing&&!pickerActive&&out&&document.body.contains(out))out.innerHTML='<span class="warn">سيعاد ربط بيانات المسحة تلقائياً عند التقاط الصورة.</span>';throw e});return metaPromise};
    loadMeta().catch(()=>{});
    take.onclick=()=>openPhotoPicker(input,take,out,eventId);
    const processFile=async(file)=>{
      if(processing||!file)return;
      resetPickerState();
      if(!freshEnough(file)){out.innerHTML='<p class="bad">الصورة المختارة تبدو قديمة. التقط صورة جديدة للموقع الآن.</p>';try{input.value=''}catch(_){};take.disabled=false;return}
      const captured=new Date().toISOString();processing=true;photoProcessing=true;take.disabled=true;out.innerHTML='<div class="spin"></div><div class="center">جارٍ تجهيز صورة الإثبات وربطها بالمسحة…</div>';
      let currentMeta;try{currentMeta=meta||await loadMeta(true)}catch(e){processing=false;photoProcessing=false;take.disabled=false;out.innerHTML='<p class="warn">تعذر ربط بيانات المسحة مؤقتاً. لا تغلق الصفحة قبل إكمال الصورة.</p><div class="actions"><button id="fieldPhotoMetaRetry" type="button">إعادة المحاولة دون إعادة التصوير</button><button id="fieldPhotoNewCapture" type="button" class="soft">إعادة التصوير</button></div>';const retry=out.querySelector('#fieldPhotoMetaRetry'),again=out.querySelector('#fieldPhotoNewCapture');retry.onclick=()=>processFile(file);again.onclick=()=>openPhotoPicker(input,take,out,eventId);return}
      if(currentMeta.already_uploaded){processing=false;photoProcessing=false;completeRegistration('صورة الإثبات محفوظة ومربوطة بالمسحة.');return}
      try{
        const made=await compose(file,currentMeta,captured),u=URL.createObjectURL(made.blob);processing=false;photoProcessing=false;out.innerHTML='<img id="fieldPhotoPreview" alt="معاينة صورة الإثبات" style="width:100%;max-height:420px;object-fit:contain;border-radius:12px;margin-top:12px;background:#111"><div class="sub" style="margin-top:8px">الحجم بعد الضغط: '+Math.max(1,Math.round(made.blob.size/1024))+' كيلوبايت</div><div class="actions"><button id="fieldPhotoApprove" type="button">اعتماد وحفظ الصورة وإكمال التسجيل</button><button id="fieldPhotoRetake" type="button" class="soft">إعادة التصوير</button></div>';out.querySelector('#fieldPhotoPreview').src=u;
        out.querySelector('#fieldPhotoRetake').onclick=()=>{URL.revokeObjectURL(u);openPhotoPicker(input,take,out,eventId)};
        out.querySelector('#fieldPhotoApprove').onclick=async()=>{const approve=out.querySelector('#fieldPhotoApprove'),retake=out.querySelector('#fieldPhotoRetake');approve.disabled=true;retake.disabled=true;photoProcessing=true;out.insertAdjacentHTML('beforeend','<div id="fieldPhotoUploading"><div class="spin"></div><div class="center">جارٍ حفظ الصورة وإكمال التسجيل…</div></div>');const row={event_id:eventId,checkpoint_token:getToken(),blob:made.blob,width_px:made.width,height_px:made.height,captured_client_ts:captured,queued_at:Date.now()};try{await uploadRow(row);URL.revokeObjectURL(u);photoProcessing=false;completeRegistration('تم حفظ صورة الإثبات وربطها بالمسحة.')}catch(e){photoProcessing=false;if(e&&e.permanent){URL.revokeObjectURL(u);out.innerHTML='<p class="bad">'+h(e.message||'تعذر قبول الصورة.')+'</p><p class="warn">التسجيل ما زال غير مكتمل حتى حفظ صورة صالحة.</p><div class="actions"><button id="fieldPhotoRetryCapture" type="button">إعادة التصوير</button></div>';const rb=out.querySelector('#fieldPhotoRetryCapture');rb.onclick=()=>openPhotoPicker(input,take,out,eventId);return}let queued=false;try{await dbPut(row);queued=true}catch(_){}URL.revokeObjectURL(u);if(queued)completeRegistration('تم التقاط صورة الإثبات وحفظها على الجهاز، وستُرفع تلقائياً عند توفر الاتصال.',true);else out.innerHTML='<p class="bad">تعذر حفظ الصورة حالياً.</p><p class="warn">التسجيل غير مكتمل؛ أعد المحاولة قبل إغلاق الصفحة.</p>'}};
      }catch(e){processing=false;photoProcessing=false;out.innerHTML='<p class="bad">'+h(e.message||'تعذر تجهيز الصورة.')+'</p><p class="warn">التسجيل غير مكتمل حتى حفظ الصورة.</p>';take.disabled=false}
    };
    input.onchange=()=>{clearPickerTimer();const file=input.files&&input.files[0];if(file){const stableFile=file;resetPickerState();processFile(stableFile)}else markPickerCancelled(input,take,out)};
    input.oncancel=()=>markPickerCancelled(input,take,out);
  };mount();
}

const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  let body=null,isScan=false;try{const url=typeof input==='string'?input:(input&&input.url)||'';if(url.includes('/functions/v1/guard-control-uat-helper')&&init&&String(init.method||'GET').toUpperCase()==='POST'&&typeof init.body==='string'){body=JSON.parse(init.body);isScan=body&&body.action==='scan'}}catch(_){}
  if(isScan){awaitingScan=true;ensureStateObserver()}
  try{
    const r=await nativeFetch(input,init);
    if(isScan){try{const c=r.clone();c.json().then(z=>{if(z&&z.ok&&z.event_id){armRequired(String(z.event_id),z);renderPhotoStep(String(z.event_id),true)}else awaitingScan=false}).catch(()=>{awaitingScan=false})}catch(_){awaitingScan=false}}
    return r;
  }catch(e){if(isScan)awaitingScan=false;throw e}
};

function restorePhotoUiIfNeeded(){
  if(!requiredEventId||pickerOrProcessing())return;
  if(livePhotoBox(requiredEventId))return;
  showMandatoryReceipt();setTimeout(()=>renderPhotoStep(requiredEventId,true),30)
}
ensureStateObserver();
setTimeout(()=>{
  const pendingEvent=loadRequired();
  if(pendingEvent&&hasToken()){requiredEventId=pendingEvent;window.addEventListener('beforeunload',beforeUnloadGuard);hideScanForm();showMandatoryReceipt();renderPhotoStep(pendingEvent,true)}
},350);
setTimeout(flushPhotoQueue,1800);
window.addEventListener('online',()=>setTimeout(flushPhotoQueue,800));
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible')return;
  setTimeout(flushPhotoQueue,700);
  if(pickerActive){schedulePickerCancelFallback();return}
  if(photoProcessing)return;
  restorePhotoUiIfNeeded();
});
window.addEventListener('pageshow',()=>{if(pickerActive){schedulePickerCancelFallback();return}restorePhotoUiIfNeeded()});
})();