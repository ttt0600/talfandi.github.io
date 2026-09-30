const API='https://dbxvfrkkocfwjumvoaha.supabase.co/functions/v1/field-monitoring-dashboard';
const app=document.getElementById('app');
let hours=24;
let geoRegion='';
let geoCity='';
let lastDashboard=null;

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
function shadowCounts(kind,cp,m){
  const s=m[cp]||{};
  if(kind==='location')return {
    legacy:+s.location_legacy_total||0,current:+s.location_current_review||0,
    overlap:+s.location_overlap||0,newOnly:+s.location_new_only||0,
    suppressed:+s.location_suppressed||0,
    notComparable:(+s.location_no_reference||0)+(+s.location_other_unclassified||0),
    lastSeen:s.last_seen_at
  };
  return {
    legacy:+s.movement_legacy_total||0,current:+s.movement_current_review||0,
    overlap:+s.movement_overlap||0,newOnly:+s.movement_new_only||0,
    suppressed:+s.movement_suppressed||0,
    outside:+s.movement_outside_window||0,noPrior:+s.movement_no_prior||0,
    noRef:+s.movement_no_reference||0,
    notComparable:(+s.movement_outside_window||0)+(+s.movement_no_prior||0)+(+s.movement_no_reference||0),
    lastSeen:s.last_seen_at
  };
}
function rawIssue(x){
  let note='';
  if(x.flag==='SHARED_DEVICE_MULTIPLE_IDENTITIES')note='تجميع إحصائي على مستوى QR؛ لا يعني أن جهازاً واحداً استخدمه جميع الأشخاص الظاهرين. افتح التفاصيل لرؤية كل بصمة جهاز والهويات المرتبطة بها.';
  return '<article class="issue clickable" data-cp="'+esc(x.checkpoint_code||'')+'"><div><span class="tag '+esc(x.severity)+'">'+(x.severity==='high'?'أولوية مراجعة':'مراجعة')+'</span><h4>'+esc(names[x.flag]||x.flag)+'</h4><p>QR: '+esc(x.checkpoint_code||'—')+' · أشخاص '+n(x.guards)+' · بصمات أجهزة '+n(x.devices)+' · آخر ظهور '+esc(dt(x.last_seen_at))+'</p>'+(note?'<div class="issue-note">'+esc(note)+'</div>':'')+'<button class="detail-btn" type="button">عرض التفاصيل</button></div><div class="num"><strong>'+n(x.events)+'</strong><small>إشارة خام</small></div></article>'
}
function shadowIssue(kind,cp,s){
  const title=kind==='location'?'مراجعة موقع — المحرك الجديد':'مراجعة حركة — المحرك الجديد';
  const note='الإجمالي الحالي '+n(s.current)+' · متداخل مع القديم '+n(s.overlap)+' · اكتشافات جديدة '+n(s.newOnly)+' · مستبعد من القديم '+n(s.suppressed)+' · غير قابل للمقارنة '+n(s.notComparable);
  return '<article class="issue clickable shadow-current" data-cp="'+esc(cp)+'"><div><span class="tag shadow">Shadow Review</span><h4>'+esc(title)+'</h4><p>QR: '+esc(cp)+' · آخر نشاط '+esc(dt(s.lastSeen))+'</p><div class="issue-note">'+esc(note)+'</div><button class="detail-btn" type="button">عرض التفاصيل</button></div><div class="num"><strong>'+n(s.current)+'</strong><small>للمراجعة الآن</small></div></article>';
}
function suppressedCard(kind,cp,s){
  const title=kind==='location'?'إشارات موقع قديمة استبعدها التحليل':'إشارات حركة قديمة استبعدها التحليل';
  return '<article class="issue suppressed clickable" data-cp="'+esc(cp)+'"><div><span class="tag ok">مستبعد بالتحليل الجديد</span><h4>'+esc(title)+'</h4><p>QR: '+esc(cp)+' · القديم '+n(s.legacy)+' · المستبعد '+n(s.suppressed)+' · غير قابل للمقارنة '+n(s.notComparable)+'</p><button class="detail-btn" type="button">عرض التفاصيل</button></div><div class="num"><strong>'+n(s.suppressed)+'</strong><small>مستبعد</small></div></article>'
}
function bars(a){a=(a||[]).slice(0,8);const m=Math.max(1,...a.map(x=>+x.events||0));return a.map(x=>'<div class="bar-row"><label>'+esc(names[x.flag]||x.flag)+'</label><div class="bar"><i style="width:'+Math.max(2,Math.round(100*(+x.events||0)/m))+'%"></i></div><b>'+n(x.events)+'</b></div>').join('')||'<div class="sub">لا توجد إشارات.</div>'}
function trend(a){a=a||[];const m=Math.max(1,...a.map(x=>+x.scans||0));return '<div class="trend">'+a.map(x=>'<i title="'+esc(dt(x.bucket))+' · '+n(x.scans)+'" style="height:'+Math.max(3,Math.round(100*(+x.scans||0)/m))+'%"></i>').join('')+'</div>'}
function semanticGroup(title,x,type){
  const extra=type==='movement'
    ? '<div class="semantic-foot">غير قابل للمقارنة = خارج نافذة الزمن '+n(x.outside_window)+' + بلا مرجع سابق '+n(x.no_prior_reference)+' + بلا مرجع نقطة '+n(x.no_reference)+'</div>'
    : '<div class="semantic-foot">غير قابل للمقارنة = لا يتوفر مرجع Virtual Point صالح أو حالة لا تسمح بالمقارنة.</div>';
  return '<div class="semantic-group"><h4>'+esc(title)+'</h4><div class="shadow-grid semantic-grid">'+
    kpi('الإشارات القديمة',n(x.legacy_total),'مرجع تاريخي')+
    kpi('المحرك الجديد — للمراجعة',n(x.current_review),'النتيجة الحالية','focus')+
    kpi('متداخلة مع القديم',n(x.overlap_with_legacy),'اتفق عليها المحركان')+
    kpi('اكتشفها المحرك الجديد',n(x.new_only),'لم تكن مرفوعة سابقاً','new-signal')+
    kpi('استبعدها المحرك الجديد',n(x.suppressed_legacy),'مرشحة False Positive','suppressed-kpi')+
    kpi('غير قابلة للمقارنة',n(x.not_comparable),'لا يصدر عليها حكم','neutral-kpi')+
  '</div>'+extra+'</div>';
}
function shadowPanel(sh){
  const l=sh.location||{},m=sh.movement||{};
  return '<section class="panel shadow-panel"><div class="panel-head"><div><h3>معايرة الاستثناءات — Shadow Mode</h3><div class="sub">الأرقام القديمة والجديدة ليست سلسلة طرح حسابية. المحرك الجديد قد يستبعد إشارات قديمة ويكتشف إشارات جديدة. لا تؤثر النتائج على التشغيل.</div></div><span class="tag ok">تحليل فقط</span></div>'+
    semanticGroup('الموقع',l,'location')+semanticGroup('الحركة',m,'movement')+
  '</section>';
}

function geoStatusName(v){return v==='ESTABLISHED'?'مثبت':v==='PROVISIONAL'?'مؤقت':v==='EMERGING'?'ناشئ':v||'—'}
function geoOptions(items,key,selected){
  return '<option value="">الكل</option>'+[...new Set((items||[]).map(x=>x[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar')).map(v=>'<option value="'+esc(v)+'"'+(v===selected?' selected':'')+'>'+esc(v)+'</option>').join('');
}
function geoPointCards(points){
  if(!points.length)return '<div class="sub geo-empty">لا توجد مواقع مطابقة للفلاتر الحالية.</div>';
  return '<div class="geo-points">'+points.slice(0,60).map(p=>
    '<article class="geo-card">'+
      '<div class="geo-card-head"><div><span class="tag '+(p.virtual_point_status==='ESTABLISHED'?'ok':'')+'">'+esc(geoStatusName(p.virtual_point_status))+'</span><h4>'+esc(p.city_name||'غير محدد')+' — '+esc(p.region_name||'')+'</h4></div><b>'+esc(p.virtual_point_id)+'</b></div>'+
      '<div class="geo-line"><span>QR: '+esc(p.checkpoint_code||'—')+'</span><span>'+n(p.scan_count)+' مسحة</span><span>'+n(p.active_days)+' يوم نشاط</span></div>'+
      '<div class="geo-line"><span>'+esc(p.governorate_name||p.locality_name||'')+'</span><span>P95 '+esc(p.p95_radius_m==null?'—':Math.round(Number(p.p95_radius_m))+'م')+'</span><span>Geofence '+esc(p.recommended_geofence_m==null?'—':Math.round(Number(p.recommended_geofence_m))+'م')+'</span></div>'+
      (p.maps_url?'<a class="geo-map-link" href="'+esc(p.maps_url)+'" target="_blank" rel="noopener">فتح الموقع على الخريطة</a>':'')+
    '</article>'
  ).join('')+(points.length>60?'<div class="sub geo-more">يظهر أول 60 موقعاً من '+n(points.length)+' موقعاً مطابقاً.</div>':'')+'</div>';
}
function geoDistribution(items){
  const a=(items||[]).slice(0,12),max=Math.max(1,...a.map(x=>+x.points||0));
  return a.map(x=>'<div class="bar-row geo-bar"><label>'+esc((x.city_name?x.city_name+' — ':'')+(x.region_name||''))+'</label><div class="bar"><i style="width:'+Math.max(2,Math.round(100*(+x.points||0)/max))+'%"></i></div><b>'+n(x.points)+'</b></div>').join('')||'<div class="sub">لا توجد بيانات جغرافية.</div>';
}
function geographyPanel(x){
  const g=x.geography||{},s=g.summary||{},regions=g.regions||[],cities=g.cities||[],points=g.points||[];
  const regionCities=geoRegion?cities.filter(c=>c.region_name===geoRegion):cities;
  if(geoCity && !regionCities.some(c=>c.city_name===geoCity))geoCity='';
  const filtered=points.filter(p=>(!geoRegion||p.region_name===geoRegion)&&(!geoCity||p.city_name===geoCity));
  const cityOpts=geoOptions(regionCities,'city_name',geoCity);
  return '<section class="panel geo-panel"><div class="panel-head"><div><h3>الخريطة التشغيلية للمواقع الفعلية</h3><div class="sub">إثراء جغرافي للـVirtual Points المتعلمة من المسحات. الفلاتر أدناه تغيّر عرض المواقع فقط ولا تغيّر مؤشرات الأداء أو الرصد.</div></div><span class="tag ok">'+n(s.verified_city_region)+' / '+n(s.total_points)+' محدد جغرافياً</span></div>'+
    '<div class="geo-summary">'+
      kpi('المواقع الفعلية',n(s.total_points),'Virtual Points')+
      kpi('المواقع المثبتة',n(s.established),'ESTABLISHED')+
      kpi('المناطق الإدارية',n(s.regions),'')+
      kpi('المدن',n(s.cities),'')+
    '</div>'+
    '<div class="geo-controls"><label>المنطقة<select id="geoRegion">'+geoOptions(regions,'region_name',geoRegion)+'</select></label><label>المدينة<select id="geoCity">'+cityOpts+'</select></label><button type="button" id="geoReset">مسح الفلاتر</button><span>'+n(filtered.length)+' موقع معروض</span></div>'+
    '<div class="grid2 geo-grid"><div><h4 class="detail-title">التوزيع حسب المدن</h4>'+geoDistribution(regionCities)+'</div><div><h4 class="detail-title">المواقع المطابقة</h4><div id="geoPoints">'+geoPointCards(filtered)+'</div></div></div>'+
  '</section>';
}
function bindGeography(x){
  const r=document.getElementById('geoRegion'),c=document.getElementById('geoCity'),reset=document.getElementById('geoReset');
  if(r)r.onchange=()=>{geoRegion=r.value;geoCity='';render(x)};
  if(c)c.onchange=()=>{geoCity=c.value;render(x)};
  if(reset)reset.onclick=()=>{geoRegion='';geoCity='';render(x)};
}
function detailGeography(points){
  if(!points||!points.length)return '<div class="sub">لا توجد Virtual Points متعلمة لهذا QR حتى الآن.</div>';
  return '<div class="detail-geo-points">'+points.map(p=>
    '<article class="geo-card detail-geo-card"><div class="geo-card-head"><div><span class="tag '+(p.virtual_point_status==='ESTABLISHED'?'ok':'')+'">'+esc(geoStatusName(p.virtual_point_status))+'</span><h4>'+esc(p.city_name||'غير محدد')+' — '+esc(p.region_name||'')+'</h4></div><b>'+esc(p.virtual_point_id)+'</b></div>'+
    '<div class="geo-line"><span>'+esc(p.governorate_name||p.locality_name||'')+'</span><span>'+n(p.scan_count)+' مسحة</span><span>'+n(p.active_days)+' يوم نشاط</span></div>'+
    (p.maps_url?'<a class="geo-map-link" href="'+esc(p.maps_url)+'" target="_blank" rel="noopener">فتح الموقع على الخريطة</a>':'')+
    '</article>'
  ).join('')+'</div>';
}

function render(x){
  lastDashboard=x;
  const s=x.summary||{},v=x.virtual_points||{},st=x.storage||{},w=x.workflow||{},raw=x.review_queue||[],id=x.identity_review||[],ph=x.photo_device_review||[],gap=x.identity_gap||{},m=shadowIndex(x);
  const shadowCards=[];
  const suppressed=[];
  (x.shadow_by_checkpoint||[]).forEach(z=>{
    const cp=z.checkpoint_code;
    const l=shadowCounts('location',cp,m),mv=shadowCounts('movement',cp,m);
    if(l.current>0)shadowCards.push({kind:'location',cp,s:l,score:l.current});
    if(mv.current>0)shadowCards.push({kind:'movement',cp,s:mv,score:mv.current});
    if(l.suppressed>0)suppressed.push({kind:'location',cp,s:l,score:l.suppressed});
    if(mv.suppressed>0)suppressed.push({kind:'movement',cp,s:mv,score:mv.suppressed});
  });
  shadowCards.sort((a,b)=>b.score-a.score);
  suppressed.sort((a,b)=>b.score-a.score);
  const rawNonShadow=raw.filter(z=>z.flag!=='LOCATION_MISMATCH'&&z.flag!=='CHECKPOINT_IMPOSSIBLE_MOVE');
  const queueHtml=[
    ...shadowCards.slice(0,8).map(z=>shadowIssue(z.kind,z.cp,z.s)),
    ...rawNonShadow.slice(0,8).map(rawIssue)
  ].join('');

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
  '<div class="grid2"><section class="panel"><div class="panel-head"><div><h3>قائمة المراجعة بالأولوية</h3><div class="sub">إشارات الموقع والحركة تأتي من Shadow Engine مباشرة؛ بقية الأنماط تبقى إشارات خام تحتاج تحققاً بشرياً.</div></div><span class="tag">'+n(shadowCards.length+rawNonShadow.length)+' مجموعة</span></div><div class="queue">'+(queueHtml||'<div class="sub">لا توجد حالات تحتاج مراجعة ضمن القواعد الحالية.</div>')+'</div></section><section class="panel"><h3>الإشارات الخام — للمرجع</h3><div class="sub">تبقى للأثر التدقيقي ولا تُقرأ كمخالفات مؤكدة.</div>'+bars(x.anomalies)+'</section></div>'+
  (suppressed.length?'<section class="panel suppressed-panel"><div class="panel-head"><div><h3>إشارات قديمة استبعدها التحليل الجديد</h3><div class="sub">لا تظهر ضمن الأولويات الحالية، وتبقى محفوظة للمقارنة والتدقيق.</div></div><span class="tag ok">'+n(suppressed.length)+' مجموعة</span></div><div class="queue">'+suppressed.slice(0,10).map(z=>suppressedCard(z.kind,z.cp,z.s)).join('')+'</div></section>':'')+
  '<div class="grid2"><section class="panel"><h3>حركة الرصد</h3><div class="sub">بتوقيت السعودية.</div>'+trend(x.trend)+'</section><section class="panel"><h3>نضج نقاط الرصد</h3><div class="kpis small-grid">'+kpi('مثبتة',n(v.established),'Established')+kpi('مؤقتة',n(v.provisional),'Provisional')+kpi('الإجمالي',n(v.total),'نقاط افتراضية')+'</div><div class="sub panel-foot">تخزين أدلة الرصد: '+Number(st.gb||0).toFixed(3)+' GB · '+n(st.objects)+' ملف.</div></section></div>'+
  '<div class="grid2"><section class="panel"><h3>مطابقة الهوية</h3><div class="identity-gap">'+kpi('غير مطابقين',n(gap.unmatched_people),'هويات/جوالات فريدة')+kpi('متكررون',n(gap.repeated_people),'مسحتان أو أكثر')+kpi('10+ مسحات',n(gap.repeated_10plus),'أولوية مطابقة')+'</div><table class="table"><thead><tr><th>الحالة</th><th>المسحات</th><th>النقاط</th></tr></thead><tbody>'+(id.length?id.map(z=>'<tr><td>'+esc(z.match_status)+'</td><td class="num">'+n(z.events)+'</td><td class="num">'+n(z.checkpoints)+'</td></tr>').join(''):'<tr><td colspan="3">لا توجد حالات.</td></tr>')+'</tbody></table></section><section class="panel"><h3>أجهزة تحتاج مراجعة دليل الصورة</h3><table class="table"><thead><tr><th>الموظف / الجهاز</th><th>مفقود</th><th>النسبة</th></tr></thead><tbody>'+(ph.length?ph.slice(0,10).map(z=>'<tr><td>'+esc(z.full_name||z.device_ref||'غير مطابق')+'</td><td class="num">'+n(z.missing_photos)+'</td><td class="num">'+pct(z.photo_rate)+'</td></tr>').join(''):'<tr><td colspan="3">لا توجد حالات.</td></tr>')+'</tbody></table></section></div>'+
  '<section class="panel operation-panel"><h3>توزيع نوع العملية</h3><div class="kpis small-grid">'+kpi('بدء الوردية',n(w.start_shift),'Start Shift')+kpi('إثبات التحضير',n(w.field_check),'Field Check')+kpi('انتهاء الوردية',n(w.end_shift),'End Shift')+'</div></section>'+
  '<div class="stamp">آخر تحديث: '+esc(dt(x.generated_at))+' · Dashboard '+esc(x.dashboard_version||'')+'</div>';
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
  return '<div class="detail-scroll"><table class="table"><thead><tr><th>الوقت</th><th>الموظف</th><th>العملية</th><th>التكليف</th><th>GPS</th><th>صورة</th><th>الإشارات الخام</th></tr></thead><tbody>'+
  rows.map(r=>'<tr class="'+(r.unmatched?'unmatched-row':'')+'"><td>'+esc(dt(r.server_ts))+'</td><td>'+esc(r.person_label||r.employee_id||'غير مطابق')+'</td><td>'+esc(actionNames[r.attendance_action]||r.attendance_action||'—')+'</td><td>'+esc(assignmentNames[r.assignment_class]||r.assignment_class||'—')+'</td><td>'+esc(r.accuracy_m==null?'—':Math.round(Number(r.accuracy_m))+'م')+(r.maps_url?' <a href="'+esc(r.maps_url)+'" target="_blank" rel="noopener">خريطة</a>':'')+'</td><td>'+esc(r.photo_present?'موجودة':'مفقودة')+'</td><td>'+esc(scanFlags(r.review_flags))+'</td></tr>').join('')+
  '</tbody></table></div>';
}
function detailShadow(sh){
  const l=(sh&&sh.location)||{},m=(sh&&sh.movement)||{};
  return '<div class="detail-shadow"><h4 class="detail-title">مقارنة الاستثناءات لهذه النقطة</h4><div class="sub">«المحرك الجديد — للمراجعة» قد يحتوي حالات متداخلة مع القديم وحالات جديدة اكتشفها Shadow Engine.</div>'+
    semanticGroup('الموقع',l,'location')+semanticGroup('الحركة',m,'movement')+
  '</div>';
}
function devicePatterns(items){
  if(!items||!items.length)return '<div class="sub">لم تظهر بصمة جهاز مرتبطة بأكثر من هوية ضمن الفترة المحددة.</div>';
  return '<div class="device-patterns">'+items.map(d=>{
    const people=(d.people||[]).map(p=>'<li class="'+(p.unmatched?'unmatched-person':'')+'"><span>'+esc(p.person_label)+'</span><b>'+n(p.scans)+' مسحات</b></li>').join('');
    return '<article class="device-card"><div class="device-head"><div><b>بصمة '+esc(d.device_ref)+'</b><span>آخر ظهور '+esc(dt(d.last_seen_at))+'</span></div><div class="device-metrics"><strong>'+n(d.identities)+'</strong><small>هويات</small></div></div><div class="device-meta">'+n(d.scans)+' مسحات · '+n(d.matched_identities)+' مطابق · '+n(d.unmatched_identities)+' غير مطابق</div><ul>'+people+'</ul></article>';
  }).join('')+'</div>';
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
    const s=x.summary||{},people=x.people||[],rows=x.scans||[],devices=x.device_identity_patterns||[],geoPoints=x.geography_points||[];
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
      '<h4 class="detail-title">المواقع الفعلية المستخرجة من هذا QR</h4><div class="sub">قد يمثل QR الواحد أكثر من موقع حراسة فعلي، لذلك تُعرض جميع Virtual Points المتعلمة منه.</div>'+detailGeography(geoPoints)+
      detailShadow(x.shadow)+
      '<h4 class="detail-title">بصمات أجهزة مرتبطة بأكثر من هوية</h4><div class="sub">هذا القسم يوضح البصمة الواحدة فعلياً ومن استخدمها؛ وهو أدق من التجميع الخام على مستوى QR.</div>'+devicePatterns(devices)+
      '<h4 class="detail-title">أكثر الأشخاص ظهوراً</h4><div class="people-grid">'+
        people.slice(0,24).map(p=>'<div class="person-card '+(p.unmatched?'unmatched':'')+'"><b>'+esc(p.person_label||p.employee_id||'غير مطابق')+'</b><span>'+n(p.scans)+' مسحات · '+pct(p.photo_rate)+' صور · '+n(p.devices)+' بصمة جهاز</span>'+(p.unmatched?'<em>لا يوجد EMP_ID مطابق</em>':'')+'</div>').join('')+
      '</div><h4 class="detail-title">آخر المسحات</h4>'+detailTable(rows.slice(0,100));
  }catch(e){document.getElementById('detailBody').innerHTML='<div class="state bad">'+esc(e.message||'تعذر تحميل التفاصيل.')+'</div>'}
}
document.addEventListener('click',e=>{const b=e.target.closest('.detail-btn');if(!b)return;const card=b.closest('[data-cp]');if(card)openDetail(card.getAttribute('data-cp'))});
load();