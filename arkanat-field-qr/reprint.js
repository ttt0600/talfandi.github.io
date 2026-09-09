(()=>{
'use strict';
const REPRINT_API='https://dbxvfrkkocfwjumvoaha.supabase.co/functions/v1/field-qr-reprint';
const MAX_SELECT=5;
const doc=document;
function h(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function rpPost(body,ms=30000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{
    const r=await fetch(REPRINT_API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:c.signal,cache:'no-store'});
    const txt=await r.text();let z={};try{z=txt?JSON.parse(txt):{}}catch(_){throw new Error('استجابة خدمة إعادة الطباعة غير صالحة.')}
    if(!r.ok||!z.ok)throw new Error(z.message||'تعذر تنفيذ الطلب.');
    return z;
  }catch(e){if(e&&e.name==='AbortError')throw new Error('انتهت مهلة الاتصال بخدمة إعادة الطباعة.');throw e}finally{clearTimeout(t)}
}
function addStyles(){
  if(doc.getElementById('reprintStyles'))return;
  const s=doc.createElement('style');s.id='reprintStyles';s.textContent=`
  .ops-guide{margin:14px 0 18px;padding:14px 16px;background:#f5faf7;border:1px solid #d8e8df;border-radius:14px}
  .ops-guide b{color:#173f31}
  .ops-guide ul{margin:9px 0 0;padding-right:22px;line-height:1.9}
  .ops-guide li{margin:2px 0}
  .rp-panel{margin-top:18px;border-top:1px solid #e3ebe6;padding-top:16px}
  .rp-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .rp-row input[type=search]{flex:1;min-width:220px}
  .rp-results{display:grid;gap:9px;margin-top:12px;max-height:360px;overflow:auto}
  .rp-item{border:1px solid #dbe5df;border-radius:13px;padding:11px;background:#fafcfb;display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:start}
  .rp-item input{width:22px;height:22px;margin-top:4px}
  .rp-code{font-weight:900;color:#173f31;direction:ltr;display:inline-block}
  .rp-meta{font-size:13px;color:#6a7770;line-height:1.7}
  .rp-sharebox{margin-top:12px;padding:12px;border-radius:13px;background:#eef5f1;overflow-wrap:anywhere}
  .rp-sharebox input{direction:ltr;font-size:13px}
  .rp-counter{font-size:13px;color:#68756e;margin-top:8px}
  .perm-help{margin-top:10px;padding:11px 13px;border:1px solid #d8e8df;border-radius:12px;background:#fff}
  .perm-help ol{margin:7px 0 0;padding-right:22px;line-height:1.9}
  .perm-device{font-size:13px;color:#69776f;margin-top:4px}
  .perm-small{font-size:13px;color:#5f6e66;line-height:1.7;margin-top:6px}
  @media print{.ops-guide,.rp-panel,.rp-sharebox,.perm-help{display:none!important}}
  `;doc.head.appendChild(s);
}
function getSelected(root){return [...root.querySelectorAll('input[data-batch]:checked')].map(x=>x.dataset.batch).slice(0,MAX_SELECT)}
function renderResults(root,rows){
  if(!rows.length){root.innerHTML='<p class="sub">لا توجد دفعات مطابقة.</p>';return}
  root.innerHTML=rows.map(r=>`<label class="rp-item"><input type="checkbox" data-batch="${h(r.batch_code)}"><span><span class="rp-code">${h(r.batch_code)}</span><br><b>${h(r.supervisor_name||'')}</b><div class="rp-meta">${h(r.supervisor_employee_id||'بدون رقم وظيفي')} · QR ${h(r.qr_assigned??r.qr_requested??0)} · مستخدم ${h(r.qr_scanned??0)} · مثبت ${h(r.qr_established??0)}${r.created_at?' · '+h(new Date(r.created_at).toLocaleDateString('ar-SA')):''}</div></span></label>`).join('');
}
async function putTokensInPrint(tokens,messageTarget){
  if(!Array.isArray(tokens)||!tokens.length)throw new Error('لا توجد أكواد نشطة قابلة لإعادة الطباعة.');
  if(typeof renderQrs!=='function')throw new Error('محرك الطباعة غير جاهز. حدّث الصفحة ثم حاول مرة أخرى.');
  let area=doc.getElementById('printArea'),grid=doc.getElementById('qrGrid');
  if(!area||!grid){
    area=doc.createElement('div');area.id='printArea';
    area.innerHTML='<div class="actions screen-only"><button type="button" id="rpPrintBtn">طباعة / حفظ PDF</button></div><div id="qrGrid" class="print-grid"></div>';
    app.appendChild(area);grid=area.querySelector('#qrGrid');area.querySelector('#rpPrintBtn').onclick=()=>window.print();
  }
  grid.innerHTML='';
  await renderQrs(tokens,grid);
  area.classList.remove('hidden');
  if(messageTarget)messageTarget.innerHTML='<p class="ok">تم تجهيز '+h(tokens.length)+' QR لإعادة الطباعة دون إنشاء أكواد جديدة.</p>';
  area.scrollIntoView({behavior:'smooth',block:'start'});
}
function enhanceOps(){
  if(typeof OPS==='undefined'||!OPS||doc.getElementById('reprintCenter'))return;
  addStyles();
  if(!doc.getElementById('opsGuide')){
    const guide=doc.createElement('div');guide.id='opsGuide';guide.className='ops-guide screen-only';
    guide.innerHTML=`<b>إرشادات سريعة لموظف العمليات</b><ul>
      <li>هذا الرابط مخصص لموظفي العمليات فقط، ولا يُرسل للحراس أو المشرفين.</li>
      <li>تأكد من اسم المشرف ورقم الهوية والجوال قبل إنشاء الأكواد.</li>
      <li>حدد عدد الأكواد المطلوبة؛ جميع أكواد الدفعة ترتبط بالمشرف نفسه.</li>
      <li>بعد الإنشاء استخدم «طباعة / حفظ PDF» ثم وزّع الأكواد على المواقع المطلوبة.</li>
      <li>إذا احتجت نسخة أخرى من أكواد سابقة، استخدم «إعادة طباعة وإرسال دفعات QR سابقة» بدلاً من إنشاء دفعة جديدة.</li>
      <li>إعادة طباعة نفس QR آمنة ولا تغيّر البيانات ولا تنشئ سجلات جديدة.</li>
      <li>استخدم «استبدال QR» فقط عند فقد أو تلف الرمز إذا كان المطلوب إيقاف القديم وإصدار بديل.</li>
    </ul>`;
    const form=doc.getElementById('f');if(form)app.insertBefore(guide,form);else app.prepend(guide);
  }
  const wrap=doc.createElement('details');wrap.id='reprintCenter';wrap.className='screen-only rp-panel';
  wrap.innerHTML=`<summary>إعادة طباعة وإرسال دفعات QR سابقة</summary>
  <p class="sub">ابحث باسم المشرف أو هويته أو جواله أو EMP_ID أو رقم الدفعة. لا يتم إنشاء QR جديدة.</p>
  <div class="rp-row"><input id="rpSearch" type="search" placeholder="اسم المشرف / الهوية / الجوال / EMP-... / SB-..."><button id="rpSearchBtn" type="button">بحث</button></div>
  <div id="rpCounter" class="rp-counter"></div><div id="rpResults" class="rp-results"></div>
  <div class="actions"><button id="rpReprint" type="button" disabled>إعادة طباعة المحدد</button><button id="rpShare" type="button" class="soft" disabled>إنشاء رابط للمشرف</button></div>
  <div id="rpState"></div>`;
  const oldDetails=app.querySelector('details');
  if(oldDetails)app.insertBefore(wrap,oldDetails);else app.appendChild(wrap);
  const search=wrap.querySelector('#rpSearch'),btn=wrap.querySelector('#rpSearchBtn'),results=wrap.querySelector('#rpResults'),counter=wrap.querySelector('#rpCounter'),reprint=wrap.querySelector('#rpReprint'),share=wrap.querySelector('#rpShare'),state=wrap.querySelector('#rpState');
  function syncButtons(){const n=getSelected(wrap).length;reprint.disabled=!n;share.disabled=!n;counter.textContent=n?'تم اختيار '+n+' من حد أقصى '+MAX_SELECT+' دفعات.':'يمكن اختيار حتى '+MAX_SELECT+' دفعات لنفس المشرف.'}
  results.addEventListener('change',e=>{if(e.target&&e.target.matches('input[data-batch]')){const selected=getSelected(wrap);if(selected.length>=MAX_SELECT){[...results.querySelectorAll('input[data-batch]:not(:checked)')].forEach(x=>x.disabled=true)}else{[...results.querySelectorAll('input[data-batch]')].forEach(x=>x.disabled=false)}syncButtons()}});
  async function doSearch(){btn.disabled=true;state.innerHTML='<div class="spin"></div>';try{const z=await rpPost({action:'search_batches',ops_key:OPS,query:search.value.trim()});renderResults(results,z.results||[]);state.innerHTML='';syncButtons()}catch(e){state.innerHTML='<p class="bad">'+h(e.message)+'</p>'}finally{btn.disabled=false}}
  btn.onclick=doSearch;search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doSearch()}});
  wrap.addEventListener('toggle',()=>{if(wrap.open&&!results.dataset.loaded){results.dataset.loaded='1';doSearch()}});
  reprint.onclick=async()=>{const codes=getSelected(wrap);if(!codes.length)return;reprint.disabled=true;state.innerHTML='<div class="spin"></div>';try{const z=await rpPost({action:'reprint_batches',ops_key:OPS,batch_codes:codes},45000);await putTokensInPrint(z.qr_tokens||[],state)}catch(e){state.innerHTML='<p class="bad">'+h(e.message)+'</p>'}finally{syncButtons()}};
  share.onclick=async()=>{const codes=getSelected(wrap);if(!codes.length)return;share.disabled=true;state.innerHTML='<div class="spin"></div>';try{const z=await rpPost({action:'create_share',ops_key:OPS,batch_codes:codes,days:7});const url=BASE+'#share='+encodeURIComponent(z.share_token);state.innerHTML=`<div class="rp-sharebox"><b class="ok">رابط جاهز للإرسال للمشرف</b><p class="sub">صالح 7 أيام، ويعرض QR فقط للطباعة دون بيانات الموظفين.</p><input id="rpShareUrl" readonly value="${h(url)}"><div class="actions"><button id="rpCopy" type="button">نسخ الرابط</button><button id="rpOpen" type="button" class="soft">فتح للتجربة</button><button id="rpRevoke" type="button" class="danger">إلغاء الرابط</button></div></div>`;state.querySelector('#rpCopy').onclick=async()=>{try{await navigator.clipboard.writeText(url);state.querySelector('#rpCopy').textContent='تم النسخ ✓'}catch(_){state.querySelector('#rpShareUrl').select();doc.execCommand('copy')}};state.querySelector('#rpOpen').onclick=()=>window.open(url,'_blank','noopener,noreferrer');state.querySelector('#rpRevoke').onclick=async()=>{const rb=state.querySelector('#rpRevoke');rb.disabled=true;try{await rpPost({action:'revoke_share',ops_key:OPS,share_token:z.share_token});state.innerHTML='<p class="ok">تم إلغاء رابط المشرف. أكواد QR الأصلية لم تتأثر.</p>'}catch(e){rb.disabled=false;state.insertAdjacentHTML('beforeend','<p class="bad">'+h(e.message)+'</p>')}}}catch(e){state.innerHTML='<p class="bad">'+h(e.message)+'</p>'}finally{syncButtons()}};
}
async function shareView(rawShare){
  addStyles();
  try{sessionStorage.setItem('arkanat_field_share_v1',rawShare)}catch(_){}
  try{history.replaceState(null,'',BASE)}catch(_){}
  doc.getElementById('subtitle').textContent='إعادة طباعة أكواد QR للمشرف';
  app.innerHTML='<h2>أكواد QR المعتمدة</h2><p class="sub">يمكن طباعتها أو حفظها PDF. كل QR يطبع في صفحة A4 مستقلة.</p><div id="shareState"><div class="spin"></div></div><div id="printArea" class="hidden"><div class="actions screen-only"><button id="sharePrint" type="button">طباعة / حفظ PDF</button></div><div id="qrGrid" class="print-grid"></div></div>';
  const st=doc.getElementById('shareState');
  try{const z=await rpPost({action:'resolve_share',share_token:rawShare},45000);await putTokensInPrint(z.qr_tokens||[],null);st.innerHTML='<p class="ok">تم تحميل '+h(z.qr_count||0)+' QR معتمدة. لا يتم إنشاء أكواد جديدة عند الطباعة.</p>';doc.getElementById('sharePrint').onclick=()=>window.print()}catch(e){st.innerHTML='<p class="bad">'+h(e.message)+'</p>'}
}
function deviceProfile(){
  const ua=navigator.userAgent||'',platform=navigator.platform||'';
  const ios=/iPad|iPhone|iPod/i.test(ua)||(platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const android=/Android/i.test(ua);
  let browser='other',label='المتصفح الحالي';
  if(ios){if(/CriOS/i.test(ua)){browser='ios_chrome';label='iPhone / iPad + Chrome'}else if(/FxiOS/i.test(ua)){browser='ios_firefox';label='iPhone / iPad + Firefox'}else if(/EdgiOS/i.test(ua)){browser='ios_edge';label='iPhone / iPad + Edge'}else{browser='ios_safari';label='iPhone / iPad + Safari'}}
  else if(android){if(/SamsungBrowser/i.test(ua)){browser='android_samsung';label='Android + Samsung Internet'}else if(/EdgA/i.test(ua)){browser='android_edge';label='Android + Edge'}else{browser='android_chrome';label='Android + Chrome'}}
  return{ios,android,browser,label};
}
async function permissionState(){
  try{if(navigator.permissions&&navigator.permissions.query){const p=await navigator.permissions.query({name:'geolocation'});return p&&p.state||'unknown'}}catch(_){}
  return'unknown';
}
function permissionSteps(profile){
  if(profile.browser==='ios_chrome')return['افتح «الإعدادات» في iPhone.','اختر Chrome ثم «الموقع».','اختر «أثناء استخدام التطبيق» وشغّل «الموقع الدقيق».','ارجع لهذه الصفحة واضغط «إعادة طلب الموقع».'];
  if(profile.browser==='ios_safari')return['في Safari افتح قائمة الصفحة ثم «إعدادات موقع الويب».','اختر «الموقع» ثم «سماح».','إذا كانت خدمات الموقع مقفلة بالكامل: الإعدادات ← الخصوصية والأمان ← خدمات الموقع.','ارجع لهذه الصفحة واضغط «إعادة طلب الموقع».'];
  if(profile.ios)return['افتح «الإعدادات» في iPhone.','افتح إعدادات المتصفح المستخدم ثم «الموقع».','اختر السماح أثناء الاستخدام وشغّل الموقع الدقيق إن ظهر.','ارجع لهذه الصفحة واضغط «إعادة طلب الموقع».'];
  if(profile.browser==='android_samsung')return['تأكد من تشغيل «الموقع» في الجهاز.','Samsung Internet ← القائمة ← الإعدادات ← أذونات المواقع / الموقع.','اسمح للموقع الحالي باستخدام الموقع.','ارجع واضغط «إعادة طلب الموقع».'];
  if(profile.android)return['تأكد من تشغيل «الموقع» في الجهاز.','Chrome ← ⋮ ← الإعدادات ← إعدادات المواقع ← الموقع.','اسمح للموقع الحالي باستخدام الموقع.','ارجع واضغط «إعادة طلب الموقع».'];
  return['تأكد من تشغيل خدمة الموقع في الجهاز.','افتح إعدادات المتصفح أو أذونات الموقع واسمح لهذا الموقع باستخدام موقعك.','ارجع لهذه الصفحة واضغط «إعادة طلب الموقع».'];
}
function stepsHtml(profile){return '<div class="perm-help"><b>طريقة السماح بالموقع</b><div class="perm-device">الجهاز المكتشف: '+h(profile.label)+'</div><ol>'+permissionSteps(profile).map(x=>'<li>'+h(x)+'</li>').join('')+'</ol></div>'}
async function enhanceScanPermissionAssistant(){
  if(typeof TOKEN==='undefined'||!TOKEN)return;
  addStyles();
  const gps=doc.getElementById('gps'),form=doc.getElementById('f');if(!gps||!form)return;
  const profile=deviceProfile();
  let patching=false;
  async function patchFailure(){
    if(patching||gps.querySelector('#permFailureText'))return;
    const retry=gps.querySelector('#retryGps'),noGps=gps.querySelector('#noGps'),actions=gps.querySelector('.actions');
    if(!retry||!noGps||!actions)return;
    patching=true;
    const ps=await permissionState();
    const block=doc.createElement('div');block.id='permFailureText';
    const msg=profile.ios?'لم يسمح iPhone/iPad للموقع باستخدام موقعك، أو أن خدمة الموقع متوقفة.':'لم يسمح الجهاز للموقع باستخدام موقعك، أو أن خدمة الموقع متوقفة.';
    block.innerHTML='<b class="warn">الموقع غير متاح حالياً.</b><div class="perm-device">الجهاز المكتشف: '+h(profile.label)+'</div><div class="perm-small">'+h(msg)+(ps==='denied'?' الصلاحية تظهر كمرفوضة في المتصفح.':'')+'</div>'+stepsHtml(profile);
    [...gps.childNodes].forEach(n=>{if(n!==actions)n.remove()});
    gps.insertBefore(block,actions);
    retry.textContent='إعادة طلب الموقع';
    noGps.textContent='متابعة وتسجيل التواجد';
    noGps.classList.add('soft');
    if(!actions.querySelector('#permToggle')){
      const toggle=doc.createElement('button');toggle.id='permToggle';toggle.type='button';toggle.className='soft';toggle.textContent='إخفاء الخطوات';
      toggle.onclick=()=>{const box=gps.querySelector('.perm-help');if(!box)return;box.classList.toggle('hidden');toggle.textContent=box.classList.contains('hidden')?'طريقة السماح بالموقع':'إخفاء الخطوات'};
      actions.insertBefore(toggle,noGps);
    }
    patching=false;
  }
  const obs=new MutationObserver(()=>{if(gps.querySelector('#retryGps')&&gps.querySelector('#noGps'))patchFailure()});
  obs.observe(gps,{childList:true,subtree:true,characterData:true});
  async function preflight(){
    if(gps.querySelector('#retryGps')){patchFailure();return}
    const ps=await permissionState();
    if(ps==='granted'){gps.innerHTML='<b class="ok">صلاحية الموقع مفعلة.</b><div class="perm-small">سيتم التقاط موقع فعلي ومحدث عند الضغط على «إرسال وإثبات التواجد».</div>';return}
    if(ps==='denied'){
      gps.innerHTML='<b class="warn">صلاحية الموقع غير مفعلة.</b><div class="perm-device">الجهاز المكتشف: '+h(profile.label)+'</div><div class="perm-small">يمكنك تعديل الصلاحية بالخطوات التالية، أو الاستمرار وسيتم حفظ المسحة بدون موقع للمراجعة بعد محاولة الإرسال.</div>'+stepsHtml(profile);return
    }
    gps.innerHTML='<b>الموقع لم يُطلب بعد.</b><div class="perm-small">عند الضغط على إرسال سيظهر طلب السماح من النظام.</div><div class="actions"><button id="permAllowNow" type="button" class="soft">السماح بالموقع الآن</button></div>';
    const warm=gps.querySelector('#permAllowNow');
    warm.onclick=()=>{
      if(!navigator.geolocation){gps.innerHTML='<b class="warn">خدمة الموقع غير مدعومة في هذا المتصفح.</b>'+stepsHtml(profile);return}
      warm.disabled=true;warm.textContent='جارٍ طلب الموقع…';
      navigator.geolocation.getCurrentPosition(
        p=>{gps.innerHTML='<b class="ok">تم السماح بالموقع.</b><div class="perm-small">الدقة الحالية تقريباً '+Math.round(p.coords.accuracy||0)+' م. أكمل البيانات ثم اضغط إرسال.</div>'},
        ()=>{gps.innerHTML='<b class="warn">لم يتم السماح بالموقع.</b>'+stepsHtml(profile)+'<div class="perm-small">بعد تعديل الإعدادات ارجع للصفحة واضغط «إرسال وإثبات التواجد».</div>'},
        {enableHighAccuracy:true,timeout:15000,maximumAge:0}
      );
    };
  }
  preflight();
  doc.addEventListener('visibilitychange',()=>{if(doc.visibilityState==='visible'&&form&&!form.classList.contains('hidden'))preflight()});
}
function boot(){
  let explicitShare='',storedShare='';
  try{explicitShare=new URLSearchParams(location.hash.replace(/^#/,'' )).get('share')||'';storedShare=sessionStorage.getItem('arkanat_field_share_v1')||''}catch(_){}
  if(explicitShare){shareView(explicitShare);return}
  if((typeof TOKEN!=='undefined')&&TOKEN&&(typeof OPS!=='undefined')&&OPS){
    try{sessionStorage.removeItem('arkanat_field_ops_v5');sessionStorage.setItem('arkanat_field_token_v5',TOKEN)}catch(_){}
    location.reload();return;
  }
  if((typeof TOKEN!=='undefined')&&TOKEN){
    try{sessionStorage.removeItem('arkanat_field_share_v1')}catch(_){}
    enhanceScanPermissionAssistant();return;
  }
  if((typeof OPS!=='undefined')&&OPS){enhanceOps();return}
  const share=((typeof SHARE!=='undefined'&&SHARE)||storedShare||'');
  if(share)shareView(share);
}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();