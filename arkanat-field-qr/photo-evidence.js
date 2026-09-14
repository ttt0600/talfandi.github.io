(()=>{
'use strict';
if(window.__ARK_FIELD_PHOTO_EVIDENCE_V1)return;
window.__ARK_FIELD_PHOTO_EVIDENCE_V1=true;

const PHOTO_API='https://dbxvfrkkocfwjumvoaha.supabase.co/functions/v1/field-photo-evidence';
const PHOTO_DB='arkanat-field-photo-v1';
const PHOTO_STORE='pending';
const TARGET_BYTES=450000;
const HARD_BYTES=850000;
const MAX_INPUT_BYTES=30*1024*1024;
const MAX_PENDING_PHOTOS=30;
const MAX_GALLERY_AGE_MS=30*60*1000;
let lastPromptedEvent='';

function h(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmtTime(v){try{return new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',dateStyle:'medium',timeStyle:'medium'}).format(new Date(v))}catch(_){return String(v||'')}}
function hasToken(){try{return typeof TOKEN!=='undefined'&&!!TOKEN}catch(_){return false}}
function getToken(){try{return typeof TOKEN!=='undefined'?TOKEN:''}catch(_){return''}}
function freshEnough(file){
  const lm=Number(file&&file.lastModified||0),now=Date.now();
  if(!lm)return true;
  if(lm>now+5*60*1000)return false;
  return now-lm<=MAX_GALLERY_AGE_MS;
}
function timeoutFetch(url,init,ms){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  return fetch(url,{...init,signal:c.signal}).finally(()=>clearTimeout(t));
}

async function apiJson(body){
  let r;
  try{r=await timeoutFetch(PHOTO_API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'},25000)}
  catch(e){if(e&&e.name==='AbortError')throw new Error('انتهت مهلة تجهيز صورة الإثبات.');throw e}
  const z=await r.json().catch(()=>({}));
  if(!r.ok||!z.ok){const e=new Error(z.message||'تعذر تجهيز صورة الإثبات.');e.status=r.status;e.permanent=r.status>=400&&r.status<500&&r.status!==408&&r.status!==429;throw e}
  return z;
}

function openDb(){
  return new Promise((resolve,reject)=>{
    if(!('indexedDB'in window)){reject(new Error('indexeddb_unavailable'));return}
    const q=indexedDB.open(PHOTO_DB,1);
    q.onupgradeneeded=()=>{const db=q.result;if(!db.objectStoreNames.contains(PHOTO_STORE))db.createObjectStore(PHOTO_STORE,{keyPath:'event_id'})};
    q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error||new Error('indexeddb_error'));
  })
}
async function dbAll(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(PHOTO_STORE,'readonly'),q=tx.objectStore(PHOTO_STORE).getAll();q.onsuccess=()=>{const x=q.result||[];db.close();resolve(x)};q.onerror=()=>{db.close();reject(q.error)}})}
async function dbDelete(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(PHOTO_STORE,'readwrite');tx.objectStore(PHOTO_STORE).delete(id);tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function dbPut(row){
  row={...row,queued_at:row.queued_at||Date.now()};
  const all=await dbAll().catch(()=>[]);
  const exists=all.some(x=>x&&x.event_id===row.event_id);
  if(!exists&&all.length>=MAX_PENDING_PHOTOS)throw new Error('وصل الجهاز إلى الحد الآمن للصور المعلقة. يلزم الاتصال بالإنترنت قبل حفظ صور إضافية.');
  const db=await openDb();
  try{
    await new Promise((resolve,reject)=>{const tx=db.transaction(PHOTO_STORE,'readwrite');tx.objectStore(PHOTO_STORE).put(row);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  }finally{db.close()}
  return true;
}

async function uploadRow(row){
  const fd=new FormData();
  fd.append('action','upload');fd.append('event_id',row.event_id);fd.append('checkpoint_token',row.checkpoint_token);
  fd.append('captured_client_ts',row.captured_client_ts||new Date().toISOString());fd.append('width_px',String(row.width_px||0));fd.append('height_px',String(row.height_px||0));
  fd.append('photo',row.blob,'field-evidence.jpg');
  let r;
  try{r=await timeoutFetch(PHOTO_API,{method:'POST',body:fd,cache:'no-store'},45000)}
  catch(e){if(e&&e.name==='AbortError'){const x=new Error('انتهت مهلة رفع صورة الإثبات.');x.transient=true;throw x}e.transient=true;throw e}
  const z=await r.json().catch(()=>({}));
  if(!r.ok||!z.ok){const e=new Error(z.message||'تعذر رفع صورة الإثبات.');e.status=r.status;e.permanent=r.status>=400&&r.status<500&&r.status!==408&&r.status!==429;throw e}
  return z;
}

async function flushPhotoQueue(){
  if(!navigator.onLine||!('indexedDB'in window))return;
  let rows=[];try{rows=(await dbAll()).sort((a,b)=>Number(a.queued_at||0)-Number(b.queued_at||0))}catch(_){return}
  for(const row of rows.slice(0,5)){
    try{await uploadRow(row);await dbDelete(row.event_id)}
    catch(e){if(e&&e.permanent){try{await dbDelete(row.event_id)}catch(_){};continue}break}
  }
}

async function loadImage(file){
  if('createImageBitmap'in window){
    try{return await createImageBitmap(file,{imageOrientation:'from-image'})}catch(_){}
  }
  return loadImageFallback(file);
}
function loadImageFallback(file){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('تعذر قراءة الصورة على هذا الجهاز.'))};im.src=u})}
function canvasBlob(canvas,q){return new Promise((resolve,reject)=>{if(!canvas.toBlob){reject(new Error('المتصفح لا يدعم تجهيز الصورة.'));return}canvas.toBlob(b=>b?resolve(b):reject(new Error('تعذر تجهيز الصورة.')),'image/jpeg',q)})}

function drawOverlay(ctx,w,h,meta,capturedTs){
  const pad=Math.round(Math.max(22,w*0.025));
  const fs=Math.round(Math.max(24,Math.min(38,w*0.028)));
  const line=Math.round(fs*1.45);
  const lines=[];
  lines.push('أركانات للحراسات الأمنية');
  lines.push('النقطة: '+String(meta.checkpoint_code||''));
  lines.push('وقت المسحة: '+fmtTime(meta.server_time));
  lines.push('وقت الصورة: '+fmtTime(capturedTs));
  if(meta.lat!=null&&meta.lng!=null){
    lines.push('الموقع: '+Number(meta.lat).toFixed(6)+' ، '+Number(meta.lng).toFixed(6));
    if(meta.accuracy_m!=null)lines.push('دقة الموقع: '+Math.round(Number(meta.accuracy_m))+' م');
  }else lines.push('الموقع: غير متاح في المسحة');
  const boxH=pad*2+line*lines.length;
  ctx.save();ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,h-boxH,w,boxH);
  try{ctx.direction='rtl'}catch(_){}ctx.textAlign='right';ctx.textBaseline='top';ctx.font='700 '+fs+'px -apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif';ctx.fillStyle='#fff';
  let y=h-boxH+pad;for(const t of lines){ctx.fillText(t,w-pad,y,w-pad*2);y+=line}
  ctx.restore();
}

async function compose(file,meta,capturedTs){
  if(!file||file.size<1000)throw new Error('لم تصل صورة صالحة.');
  if(file.size>MAX_INPUT_BYTES)throw new Error('الصورة الأصلية كبيرة جداً على هذا الجهاز. التقط صورة جديدة بالكاميرا بدلاً من اختيار ملف كبير.');
  const im=await loadImage(file);const iw=im.width||im.naturalWidth,ih=im.height||im.naturalHeight;
  if(!iw||!ih)throw new Error('تعذر تحديد أبعاد الصورة.');
  let max=1600,scale=Math.min(1,max/Math.max(iw,ih)),w=Math.max(1,Math.round(iw*scale)),hgt=Math.max(1,Math.round(ih*scale));
  let canvas=document.createElement('canvas');canvas.width=w;canvas.height=hgt;let ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('تعذر تشغيل معالج الصور على هذا الجهاز.');
  ctx.drawImage(im,0,0,w,hgt);drawOverlay(ctx,w,hgt,meta,capturedTs);
  let blob=await canvasBlob(canvas,.82);
  for(const q of [.72,.64,.56]){if(blob.size<=TARGET_BYTES)break;blob=await canvasBlob(canvas,q)}
  if(blob.size>HARD_BYTES){
    max=1280;scale=Math.min(1,max/Math.max(iw,ih));w=Math.max(1,Math.round(iw*scale));hgt=Math.max(1,Math.round(ih*scale));
    canvas=document.createElement('canvas');canvas.width=w;canvas.height=hgt;ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('تعذر تشغيل معالج الصور على هذا الجهاز.');
    ctx.drawImage(im,0,0,w,hgt);drawOverlay(ctx,w,hgt,meta,capturedTs);blob=await canvasBlob(canvas,.68);
    for(const q of [.58,.50,.44]){if(blob.size<=HARD_BYTES)break;blob=await canvasBlob(canvas,q)}
  }
  try{if(im.close)im.close()}catch(_){}
  canvas.width=1;canvas.height=1;
  if(blob.size>HARD_BYTES)throw new Error('تعذر ضغط الصورة للحجم المناسب. أعد التصوير.');
  return{blob,width:w,height:hgt};
}

function renderPhotoStep(eventId){
  if(!hasToken()||!eventId||eventId===lastPromptedEvent)return;
  lastPromptedEvent=eventId;
  let tries=0;
  const mount=async()=>{
    const state=document.getElementById('state');
    if(!state&&tries++<20){setTimeout(mount,150);return}
    if(!state)return;
    let meta;try{meta=await apiJson({action:'meta',event_id:eventId,checkpoint_token:getToken()})}catch(_){return}
    if(meta.already_uploaded)return;
    const box=document.createElement('div');box.id='photoEvidenceBox';box.className='note';box.style.marginTop='16px';
    box.innerHTML='<b>صورة إثبات ميداني</b><p class="sub">تم حفظ المسحة الأساسية. أضف صورة حديثة للموقع لرفع دقة الإثبات؛ الصورة لا تغيّر بيانات المسحة أو الرمز.</p><input id="fieldPhotoInput" type="file" accept="image/*" capture="environment" class="hidden"><div class="actions"><button id="fieldPhotoTake" type="button">التقاط صورة للموقع</button></div><div id="fieldPhotoState"></div>';
    state.appendChild(box);
    const input=box.querySelector('#fieldPhotoInput'),take=box.querySelector('#fieldPhotoTake'),out=box.querySelector('#fieldPhotoState');
    take.onclick=()=>input.click();
    input.onchange=async()=>{
      const file=input.files&&input.files[0];if(!file)return;
      if(!freshEnough(file)){out.innerHTML='<p class="bad">الصورة المختارة تبدو قديمة. التقط صورة جديدة للموقع الآن.</p>';input.value='';take.disabled=false;return}
      const captured=new Date().toISOString();
      take.disabled=true;out.innerHTML='<div class="spin"></div><div class="center">جارٍ تجهيز صورة الإثبات…</div>';
      try{
        const made=await compose(file,meta,captured),u=URL.createObjectURL(made.blob);
        out.innerHTML='<img id="fieldPhotoPreview" alt="معاينة صورة الإثبات" style="width:100%;max-height:420px;object-fit:contain;border-radius:12px;margin-top:12px;background:#111"><div class="sub" style="margin-top:8px">الحجم بعد الضغط: '+Math.max(1,Math.round(made.blob.size/1024))+' كيلوبايت</div><div class="actions"><button id="fieldPhotoApprove" type="button">اعتماد وحفظ الصورة</button><button id="fieldPhotoRetake" type="button" class="soft">إعادة التصوير</button></div>';
        out.querySelector('#fieldPhotoPreview').src=u;
        out.querySelector('#fieldPhotoRetake').onclick=()=>{URL.revokeObjectURL(u);input.value='';take.disabled=false;out.innerHTML='';input.click()};
        out.querySelector('#fieldPhotoApprove').onclick=async()=>{
          const approve=out.querySelector('#fieldPhotoApprove'),retake=out.querySelector('#fieldPhotoRetake');approve.disabled=true;retake.disabled=true;out.insertAdjacentHTML('beforeend','<div id="fieldPhotoUploading"><div class="spin"></div><div class="center">جارٍ حفظ الصورة…</div></div>');
          const row={event_id:eventId,checkpoint_token:getToken(),blob:made.blob,width_px:made.width,height_px:made.height,captured_client_ts:captured,queued_at:Date.now()};
          try{
            await uploadRow(row);URL.revokeObjectURL(u);box.innerHTML='<b class="ok">✓ تم حفظ صورة الإثبات وربطها بالمسحة.</b><p class="sub">المسحة الأصلية وبياناتها لم تتغير.</p>';
          }catch(e){
            if(e&&e.permanent){URL.revokeObjectURL(u);out.innerHTML='<p class="bad">'+h(e.message||'تعذر قبول الصورة.')+'</p><div class="actions"><button id="fieldPhotoRetryCapture" type="button">إعادة التصوير</button></div>';const rb=out.querySelector('#fieldPhotoRetryCapture');rb.onclick=()=>{input.value='';take.disabled=false;out.innerHTML='';input.click()};return}
            let queued=false;try{await dbPut(row);queued=true}catch(_){}
            URL.revokeObjectURL(u);
            box.innerHTML=queued?'<b class="warn">تم حفظ الصورة على الجهاز بانتظار الرفع التلقائي.</b><p class="sub">المسحة الأصلية محفوظة ولن تحتاج إعادة المسح.</p>':'<b class="warn">تعذر حفظ الصورة حالياً.</b><p class="sub">المسحة الأصلية محفوظة ولم تتأثر.</p>';
          }
        };
      }catch(e){out.innerHTML='<p class="bad">'+h(e.message||'تعذر تجهيز الصورة.')+'</p>';take.disabled=false}
    };
  };
  mount();
}

const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
  let body=null,isScan=false;
  try{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.includes('/functions/v1/guard-control-uat-helper')&&init&&String(init.method||'GET').toUpperCase()==='POST'&&typeof init.body==='string'){
      body=JSON.parse(init.body);isScan=body&&body.action==='scan';
    }
  }catch(_){}
  const r=await nativeFetch(input,init);
  if(isScan){
    try{const c=r.clone();c.json().then(z=>{if(z&&z.ok&&z.event_id)setTimeout(()=>renderPhotoStep(String(z.event_id)),120)}).catch(()=>{})}catch(_){}
  }
  return r;
};

setTimeout(flushPhotoQueue,1800);
window.addEventListener('online',()=>setTimeout(flushPhotoQueue,800));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')setTimeout(flushPhotoQueue,700)});
})();