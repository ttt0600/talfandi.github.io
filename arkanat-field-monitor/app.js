const API='https://dbxvfrkkocfwjumvoaha.supabase.co/functions/v1/field-monitoring-dashboard';
const app=document.getElementById('app');
let hours=24;

const names={
  LOCATION_MISMATCH:'عدم تطابق الموقع — إشارة قديمة',
  SHARED_DEVICE_MULTIPLE_IDENTITIES:'نمط أجهزة مستخدمة مع هويات متعددة',
  CHECKPOINT_IMPOSSIBLE_MOVE:'انتقال يحتاج مراجعة زمنية',
  FAST_REPEAT:'تكرار سريع',
  LOW_ACCURACY:'دقة موقع منخفضة',
  IDENTITY_MULTIPLE_DEVICES:'هوية تظهر من عدة أجهزة',
  RAPID_MULTI_QR_SAME_DEVICE:'مسح عدة رموز سريعاً',
  NO_LOCATION:'لا يوجد موقع صالح'
};
const actionNames={start_shift:'بدء الوردية',field_check:'إثبات التحضير',end_shift:'انتهاء الوردية'};
const assignmentNames={primary_guard:'حارس أساسي',rest_relief_guard:'بديل راحة',coverage_guard:'حارس تغطية',supervisor:'مشرف'};

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function n(v){return Number(v||0).toLocaleString('ar-SA')}
function pct(v){return v==null?'—':Number(v).toFixed(1)+'%'}
function dt(v){if(!v)return'—';try{return new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch(_){return String(v)}}
function accessKey(){let k='';try{k=sessionStorage.getItem('ark_field_monitor_key')||''}catch(_){}const h=new URLSearchParams((location.hash||'').replace(/^#/,'')),x=h.get('k')||'';if(x){k=x;try{sessionStorage.setItem('ark_field_monitor_key',k)}catch(_){}history.replaceState(null,'',location.pathname)}return k}
function kpi(t,v,d,cls){return '<div class="kpi '+(cls||'')+'"><small>'+esc(t)+'</small><strong>'+esc(v)+'</strong><span>'+esc(d||'')+'</span></div>'}
function scanFlags(a){return (a||[]).map(x=>names[x]||x).join('، ')||'—'}
function shadowIndex(x){const m={};(x.shadow_by_checkpoint||[]).forEach(z=>{m[z.checkpoint_code]=z});return m}
function shadowCounts(flag,cp,m){
  const s=m[cp]||{};
  if(flag==='LOCATION_MISMATCH')return {legacy:+s.legacy_location||0,review:+s.shadow_location||0,suppressed:+s.location_suppressed||0,noRef:+s.location_no_reference||0};
  if(flag==='CHECKPOINT_IMPOSSIBLE_MOVE')return {legacy:+s.legacy_movement||0,review:+s.shadow_movement||0,suppressed:+s.movement_suppressed||0,outside:+s.movement_outside_window||0,noPrior:+s.movement_no_prior||0};
  return null;
}
function issue(x,m){
  const sh=shadowCounts(x.flag,x.checkpoint_code,m);
  let title=names[x.flag]||x.flag;
  let eventCount=+x.events||0;
  let note='';
  let tag='<span class="tag '+esc(x.severity)+'">'+(x.severity==='high'?'أولوية مراجعة':'مراجعة')+'</span>';
  if(sh){
    eventCount=sh.review;
    title=x.flag==='LOCATION_MISMATCH'?'مراجعة موقع بعد احتساب النقاط الفعلية':'انتقال يحتاج مراجعة بعد احتساب النقاط الفعلية';
    note='المحرك القديم '+n(sh.legacy)+' · بقي للمراجعة '+n(sh.review)+' · مستبعد '+n(sh.suppressed);
    if(x.flag==='CHECKPOINT_IMPOSSIBLE_MOVE'&&sh.outside)note+=' · خارج نافذة المقارنة '+n(sh.outside);
    if(x.flag==='LOCATION_MISMATCH'&&sh.noRef)note+=' · بلا مرجع مثبت '+n(sh.noRef);
  }else if(x.flag==='SHARED_DEVICE_MULTIPLE_IDENTITIES'){
    note='تجميع إحصائي على مستوى QR؛ لا يعني أن جهازاً واحداً استخدمه جميع الأشخاص الظاهرين.';
  }
  return '<article class="issue clickable" data-cp="'+esc(x.checkpoint_code||'')+'"><div>'+tag+'<h4>'+esc(title)+'</h4><p>QR: '+esc(x.checkpoint_code||'—')+' · أشخاص '+n(x.guards)+' · بصمات أجهزة '+n(x.devices)+' · آخر ظهور '+esc(dt(x.last_seen_at))+'</p>'+(note?'<div class="issue-note">'+esc(note)+'</div>':'')+'<button class="detail-btn" type="button">عرض التفاصيل</button></div><div class="num"><strong>'+n(eventCount)+'</strong><small>'+(sh?'بعد المعايرة':'إشارة خام')+'</small></div></article>'
}
function suppressedCard(x,m){
  const sh=shadowCounts(x.flag,x.checkpoint_code,m)||{};
  return '<article class="issue suppressed"><div><span class="tag ok">مستبعد بالتحليل الجديد</span><h4>'+esc(names[x.flag]||x.flag)+'</h4><p>QR: '+esc(x.checkpoint_code||'—')+' · القديم '+n(sh.legacy)+' · المستبعد '+n(sh.suppressed)+'</p><button class="detail-btn" type="button">عرض التفاصيل</button></div><div class="num"><strong>0</strong><small>للمراجعة</small></div></article>'
}
function bars(a){a=(a||[]).slice(0,8);const m=Math.max(1,...a.map(x=>+x.events||0));return a.map(x=>'<div class="bar-row"><label>'+esc(names[x.flag]||x.flag)+'</label><div class="bar"><i style="width:'+Math.max(2,Math.round(100*(+x.events||0)/m))+'%"></i></div><b>'+n(x.events)+'</b></div>').join('')||'<div class="sub">لا توجد إشارات.</div>'}
function trend(a){a=a||[];const m=Math.max(1,...a.map(x=>+x.scans||0));return '<div class="trend">'+a.map(x=>'<i title="'+esc(dt(x.bucket))+' · '+n(x.scans)+'" style="height:'+Math.max(3,Math.round(100*(+x.scans||0)/m))+'%"></i>').join('')+'</div>'}
function shadowPanel(sh){
  const l=sh.location||{},m=sh.movement||{};
  return '<section class="panel shadow-panel"><div class="panel-head"><div><h3>معايرة الاستثناءات — Shadow Mode</h3><div class="sub">مقارنة المحرك القديم بالتحليل المبني على Virtual Points. لا تؤثر على التشغيل.</div></div><span class="tag ok">تحليل فقط</span></div><div class="shadow-grid">'+
    kpi('عدم تطابق الموقع — قديم',n(l.legacy),'إشارات خام')+
    kpi('عدم تطابق الموقع — بقي',n(l.review),'بعد النقاط الفعلية','focus')+
    kpi('مستبعدة من الموقع',n(l.suppressed),'مرشحة False Positive')+
    kpi('حركة غير ممكنة — قديم',n(m.legacy),'إشارات خام')+
    kpi('الحركة — بقي',n(m.review),'بعد المقارنة الفعلية','focus')+
    kpi('مستبعدة من الحركة',n(m.suppressed),'ضمن المقارنة الصالحة')+
  '</div></section>'
}
function render(x){
  const s=x.summary||{},v=x.virtual_points||{},st=x.storage||{},w=x.workflow||{},raw=x.review_queue||[],id=x.identity_review||[],ph=x.photo_device_review||[],gap=x.identity_gap||{},m=shadowIndex(x);
  const shadowable=z=>z.flag==='LOCATION_MISMATCH'||z.flag==='CHECKPOINT_IMPOSSIBLE_MOVE';
  const suppressed=raw.filter(z=>{const sh=shadowable(z)?shadowCounts(z.flag,z.checkpoint_code,m):null;return sh&&sh.legacy>0&&sh.review===0});
  const queue=raw.filter(z=>!suppressed.includes(z));
  const high=queue.filter(z=>z.severity==='high').length;

  app.innerHTML='<section class="kpis">'+
    kpi('المسحات',n(s.total_scans),'خلال '+x.window_hours+' ساعة')+
    kpi('الحراس المطابقون',n(s.unique_guards),'EMP_ID فريد')+
    kpi('هويات غير مطابقة',n(gap.unmatched_people),n(gap.unmatched_scans)+' مسحة')+
    kpi('نقاط QR النشطة',n(s.unique_checkpoints),'ظهرت خلال الفترة')+
    kpi('الأدلة المكتملة',pct(s.complete_evidence_rate),'هوية + موقع جيد + صورة')+
    kpi('اكتمال الصور',pct(s.photo_rate),n(s.photo_ok)+' صورة مرتبطة')+
    kpi('جودة الموقع',pct(s.good_location_rate),'GPS بدقة 100م أو أفضل')+
    kpi('مطابقة الهوية',pct(s.identity_rate),n(s.identity_ok)+' مسحة مطابقة')+
  '</section>'+
  shadowPanel(x.shadow_engine||{})+
  '<div class="grid2"><section class="panel"><div class="panel-head"><div><h3>قائمة المراجعة بالأولوية</h3><div class="sub">تعرض النتائج بعد معايرة الموقع والحركة بالـVirtual Points حيثما تتوفر.</div></div><span class="tag">'+n(queue.length)+' مجموعة</span></div><div class="queue">'+(queue.length?queue.slice(0,14).map(z=>issue(z,m)).join(''):'<div class="sub">لا توجد حالات تحتاج مراجعة ضمن القواعد الحالية.</div>')+'</div></section><section class="panel"><h3>الإشارات الخام</h3><div class="sub">للمراقبة فقط؛ لا تُقرأ كمخالفات مؤكدة.</div>'+bars(x.anomalies)+'</section></div>'+
  (suppressed.length?'<section class="panel suppressed-panel"><div class="panel-head"><div><h3>إشارات قديمة استبعدها التحليل الجديد</h3><div class="sub">تبقى محفوظة للأثر التدقيقي، لكنها لا تظهر كأولوية تشغيلية.</div></div><span class="tag ok">'+n(suppressed.length)+' مجموعة</span></div><div class="queue">'+suppressed.slice(0,8).map(z=>suppressedCard(z,m)).join('')+'</div></section>':'')+
  '<div class="grid2"><section class="panel"><h3>حركة الرصد</h3><div class="sub">بتوقيت السعودية.</div>'+trend(x.trend)+'</section><section class="panel"><h3>نضج نقاط الرصد</h3><div class="kpis small-grid">'+kpi('مثبتة',n(v.established),'Established')+kpi('مؤقتة',n(v.provisional),'Provisional')+kpi('الإجمالي',n(v.total),'نقاط افتراضية')+'</div><div class="sub panel-foot">تخزين أدلة الرصد: '+Number(st.gb||0).toFixed(3)+' GB · '+n(st.objects)+' ملف.</div></section></div>'+
  '<div class="grid2"><section class="panel"><h3>مطابقة الهوية</h3><div class="identity-gap">'+kpi('غير مطابقين',n(gap.unmatched_people),'هويات/جوالات فريدة')+kpi('متكررون',n(gap.repeated_people),'مسحتان أو أكثر')+kpi('10+ مسحات',n(gap.repeated_10plus),'أولوية مطابقة')+'</div><table class="table"><thead><tr><th>الحالة</th><th>المسحات</th><th>النقاط</th></tr></thead><tbody>'+(id.length?id.map(z=>'<tr><td>'+esc(z.match_status)+'</td><td class="num">'+n(z.events)+'</td><td class="num">'+n(z.checkpoints)+'</td></tr>').join(''):'<tr><td colspan="3">لا توجد حالات.</td></tr>')+'</tbody></table></section><section class="panel"><h3>أجهزة تحتاج مراجعة دليل الصورة</h3><table class="table"><thead><tr><th>الموظف / الجهاز</th><th>مفقود</th><th>النسبة</th></tr></thead><tbody>'+(ph.length?ph.slice(0,10).map(z=>'<tr><td>'+esc(z.full_name||z.device_ref||'غير مطابق')+'</td><td class="num">'+n(z.missing_photos)+'</td><td class="num">'+pct(z.photo_rate)+'</td></tr>').join(''):'<tr><td colspan="3">لا توجد حالات.</td></tr>')+'</tbody></table></section></div>'+
  '<section class="panel operation-panel"><h3>توزيع نوع العملية</h3><div class="kpis small-grid">'+kpi('بدء الوردية',n(w.start_shift),'Start Shift')+kpi('إثبات التحضير',n(w.field_check),'Field Check')+kpi('انتهاء الوردية',n(w.end_shift),'End Shift')+'</div></section>'+
  '<div class="stamp">آخر تحديث: '+esc(dt(x.generated_at))+' · الأولويات العالية الحالية: '+n(high)+'</div>';
}

async function load(){
  const k=accessKey();
  if(!k){app.innerHTML='<div class="state bad">رابط لوحة الرصد غير مكتمل أو انتهت جلسة الوصول.</div>';return}
  app.innerHTML='<div class="state"><div class="spin"></div>جارٍ تحديث مؤشرات الرصد…</div>';
  try{
    const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k,hours}),cache:'no-store'}),x=await r.json();
    if(!r.ok||!x.ok)throw new Error(x.message||'تعذر تحميل البيانات');
    render(x);
  }catch(e){app.innerHTML='<div class="state bad">'+esc(e.message||'تعذر تحميل لوحة الرصد.')+'</div>'}
}
document.getElementById('controls').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.h){hours=+b.dataset.h;document.querySelectorAll('[data-h]').forEach(x=>x.classList.toggle('active',x===b));load()}
  else if(b.id==='refresh')load()
});

function closeDetail(){const m=document.getElementById('detailModal');if(m)m.remove()}
function detailTable(rows){
  return '<div class="detail-scroll"><table class="table"><thead><tr><th>الوقت</th><th>الموظف</th><th>العملية</th><th>التكليف</th><th>GPS</th><th>صورة</th><th>الإشارات</th></tr></thead><tbody>'+
  rows.map(r=>'<tr class="'+(r.unmatched?'unmatched-row':'')+'"><td>'+esc(dt(r.server_ts))+'</td><td>'+esc(r.person_label||r.employee_id||'غير مطابق')+'</td><td>'+esc(actionNames[r.attendance_action]||r.attendance_action||'—')+'</td><td>'+esc(assignmentNames[r.assignment_class]||r.assignment_class||'—')+'</td><td>'+esc(r.accuracy_m==null?'—':Math.round(Number(r.accuracy_m))+'م')+(r.maps_url?' <a href="'+esc(r.maps_url)+'" target="_blank" rel="noopener">خريطة</a>':'')+'</td><td>'+esc(r.photo_present?'موجودة':'مفقودة')+'</td><td>'+esc(scanFlags(r.review_flags))+'</td></tr>').join('')+
  '</tbody></table></div>';
}
function detailShadow(sh){
  const l=(sh&&sh.location)||{},m=(sh&&sh.movement)||{};
  return '<div class="detail-shadow"><h4 class="detail-title">مقارنة الاستثناءات لهذه النقطة</h4><div class="shadow-grid">'+
    kpi('موقع — قديم',n(l.legacy),'إشارة خام')+kpi('موقع — بقي',n(l.review),'بعد Virtual Points','focus')+kpi('موقع — مستبعد',n(l.suppressed),'')+
    kpi('حركة — قديم',n(m.legacy),'إشارة خام')+kpi('حركة — بقي',n(m.review),'بعد Virtual Points','focus')+kpi('حركة — مستبعد',n(m.suppressed),'')+
  '</div></div>';
}
async function openDetail(cp){
  const k=accessKey();if(!cp||!k)return;
  closeDetail();
  document.body.insertAdjacentHTML('beforeend','<div class="modal-backdrop" id="detailModal"><section class="modal"><div class="modal-head"><div><h3>تفاصيل '+esc(cp)+'</h3><div class="sub">المسحات والأشخاص والأدلة ضمن الفترة المحددة.</div></div><button type="button" id="closeDetail">إغلاق</button></div><div id="detailBody" class="state"><div class="spin"></div>جارٍ تحميل التفاصيل…</div></section></div>');
  document.getElementById('closeDetail').onclick=closeDetail;
  document.getElementById('detailModal').addEventListener('click',e=>{if(e.target.id==='detailModal')closeDetail()});
  try{
    const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:k,hours,action:'checkpoint_detail',checkpoint_code:cp}),cache:'no-store'}),x=await r.json();
    if(!r.ok||!x.ok)throw new Error(x.message||'تعذر تحميل التفاصيل');
    const s=x.summary||{},people=x.people||[],rows=x.scans||[];
    document.getElementById('detailBody').className='';
    document.getElementById('detailBody').innerHTML=
      '<div class="detail-kpis">'+
        kpi('المسحات',n(s.total_scans),'')+
        kpi('أشخاص فريدون',n(s.people_total),'مطابق + غير مطابق')+
        kpi('حراس مطابقون',n(s.matched_guards),'EMP_ID')+
        kpi('غير مطابقين',n(s.unmatched_people),'هويات منفصلة')+
        kpi('اكتمال الصور',pct(s.photo_rate),'')+
        kpi('جودة الموقع',pct(s.good_location_rate),'')+
      '</div>'+
      detailShadow(x.shadow)+
      '<h4 class="detail-title">أكثر الأشخاص ظهوراً</h4><div class="people-grid">'+
        people.slice(0,24).map(p=>'<div class="person-card '+(p.unmatched?'unmatched':'')+'"><b>'+esc(p.person_label||p.employee_id||'غير مطابق')+'</b><span>'+n(p.scans)+' مسحات · '+pct(p.photo_rate)+' صور · '+n(p.devices)+' بصمة جهاز</span>'+(p.unmatched?'<em>لا يوجد EMP_ID مطابق</em>':'')+'</div>').join('')+
      '</div><h4 class="detail-title">آخر المسحات</h4>'+detailTable(rows.slice(0,100));
  }catch(e){document.getElementById('detailBody').innerHTML='<div class="state bad">'+esc(e.message||'تعذر تحميل التفاصيل.')+'</div>'}
}
document.addEventListener('click',e=>{const b=e.target.closest('.detail-btn');if(!b)return;const card=b.closest('[data-cp]');if(card)openDetail(card.getAttribute('data-cp'))});

load();