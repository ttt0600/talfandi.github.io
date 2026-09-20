
const API='https://dbxvfrkkocfwjumvoaha.supabase.co/functions/v1/arkanat-prep-fast';
const $=id=>document.getElementById(id);
let S={token:localStorage.getItem('arkPrepToken')||'',region:localStorage.getItem('arkPrepRegion')||'',ctx:null,day:null,tab:'today',site:null,siteData:null,roster:[],employee:null,issues:null,seq:0};
const STATUS={P:'حاضر',OFF:'راحة',A:'غياب',T:'استئذان / غياب بإذن',AL:'إجازة سنوية',SK:'إجازة مرضية',S:'موقوف',W:'انسحاب',R:'استقالة',O:'إجازة رسمية',SUB:'بديل / تغطية',CASH:'تغطية كاش',OTHER:'أخرى'};
const SHIFTS=[['D8','صباحي 8 ساعات'],['E8','مسائي 8 ساعات'],['N8','ليلي 8 ساعات'],['D12','نهاري 12 ساعة'],['N12','ليلي 12 ساعة'],['OTHER','وردية أخرى']];
const EX=new Set(['A','T','AL','SK','S','W','R','O','SUB','CASH','OTHER']);
function friendlyError(msg){
 const s=String(msg||'');
 if(/permission denied/i.test(s))return 'تعذر الوصول إلى خدمة التحضير. أعيدي المحاولة بعد تحديث الصفحة.';
 if(/failed to fetch|networkerror|load failed/i.test(s))return 'تعذر الاتصال بخدمة التحضير. تحققي من الاتصال ثم أعيدي المحاولة.';
 if(/timeout|تأخر الاتصال/i.test(s))return 'تأخر الاتصال بخدمة التحضير. أعيدي المحاولة.';
 if(/session_expired/i.test(s))return 'انتهت الجلسة. سجلي الدخول مرة أخرى.';
 if(/DATE_OUTSIDE_CYCLE/i.test(s))return 'التاريخ المحدد خارج دورة التحضير. تم ضبطه تلقائياً داخل الفترة.';
 return s.length>160?'حدث خطأ أثناء تنفيذ العملية. أعيدي المحاولة.':s;
}
function cacheKey(){return 'arkPrepCache:v4:'+(S.region||'unknown')+':'+period()+':'+work()}
function readCache(){
 try{const x=JSON.parse(sessionStorage.getItem(cacheKey())||'null');if(!x||!x.t||Date.now()-x.t>10*60*1000)return null;return x}catch{return null}
}
function writeCache(){
 try{if(S.ctx&&S.day)sessionStorage.setItem(cacheKey(),JSON.stringify({t:Date.now(),ctx:S.ctx,day:S.day,date:work()}))}catch{}
}


function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toast(t,b=false){const x=$('toast');x.textContent=t;x.className='toast'+(b?' bad':'');x.classList.remove('hidden');clearTimeout(x._t);x._t=setTimeout(()=>x.classList.add('hidden'),3000)}
function ry(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),x=Object.fromEntries(p.map(i=>[i.type,i.value]));return x.year+'-'+x.month+'-'+x.day}
function monthLabel(p){const z=String(p).split('-').map(Number);return new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{month:'long',year:'numeric'}).format(new Date(z[0],z[1]-1,1))}
function initPeriodOptions(selected){
 const el=$('period');if(!el)return;
 const [y,m]=selected.split('-').map(Number),vals=[];
 for(let k=-12;k<=1;k++){const d=new Date(y,m-1+k,1),v=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');vals.push(v)}
 const next=new Date(y,m,1),nextVal=next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0');
 el.innerHTML=vals.reverse().map(v=>{
   const tag=v===selected?' — الحالية':v===nextVal?' — القادمة / للتجهيز':'';
   return '<option value="'+v+'">دورة '+monthLabel(v)+tag+'</option>';
 }).join('');
 el.value=selected;
}
function period(){return $('period').value||ry().slice(0,7)}
function work(){return $('workDate').value||ry()}
function dates(a,b){const o=[];let d=new Date(a+'T12:00:00'),z=new Date(b+'T12:00:00');while(d<=z){o.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1)}return o}
function showLogin(){$('loginView').classList.remove('hidden');$('appView').classList.add('hidden')}
function showApp(){$('loginView').classList.add('hidden');$('appView').classList.remove('hidden')}
function modal(h){$('modalRoot').innerHTML='<div class="modal-bg" id="mbg"><div class="modal">'+h+'</div></div>';$('mbg').onclick=e=>{if(e.target.id==='mbg')$('modalRoot').innerHTML=''}}
function closeModal(){$('modalRoot').innerHTML=''}
function confirmUI(t,b,o='متابعة'){return new Promise(r=>{modal('<h3>'+esc(t)+'</h3><div class="sub" style="font-size:13px;line-height:1.8">'+b+'</div><div class="modal-actions"><button id="cOk" class="btn primary">'+esc(o)+'</button><button id="cNo" class="btn ghost">إلغاء</button></div>');$('cOk').onclick=()=>{closeModal();r(true)};$('cNo').onclick=()=>{closeModal();r(false)}})}

async function req(url,action,payload={},timeout=12000){
 const ctrl=new AbortController(),tm=setTimeout(()=>ctrl.abort(),timeout);
 try{
  const body={action,...payload};if(S.token)body.token=S.token;
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:ctrl.signal});
  let d;try{d=await r.json()}catch{d={ok:false,message:'تعذر قراءة رد الخادم'}}
  if(!r.ok||d?.ok===false){
   if(d?.code==='SESSION_EXPIRED'){localStorage.removeItem('arkPrepToken');S.token='';S.ctx=null;S.day=null;showLogin()}
   const tech=d?.message||d?.code||'تعذر تنفيذ العملية';console.error('[Arkanat Prep]',action,tech);throw new Error(friendlyError(tech))
  }
  return d;
 }catch(e){
  if(e?.name==='AbortError')throw new Error(friendlyError('تأخر الاتصال'));
  if(e instanceof Error)throw new Error(friendlyError(e.message));
  throw new Error('حدث خطأ أثناء الاتصال بخدمة التحضير.');
 }finally{clearTimeout(tm)}
}
const fast=(a,p={},t=12000)=>req(API,a,p,t);
const login=(p)=>req(API,'start',p,10000);

function syncContextUi(){
 const future=S.ctx?.cycle_state==='future';
 if(future&&S.tab!=='month')S.tab='month';
 const monthly=S.tab==='month';
 const df=$('dayField');if(df)df.classList.toggle('hidden',monthly||future);
 const mt=$('metrics');if(mt)mt.classList.toggle('hidden',monthly||future);
 document.querySelectorAll('.tab').forEach(t=>{
   const blocked=future&&t.dataset.tab!=='month';
   t.disabled=blocked;
   t.title=blocked?'الدورة القادمة متاحة للتجهيز المسبق فقط؛ يبدأ التحضير اليومي عند بدء الدورة.':'';
 });
 const pb=$('printBtn');if(pb)pb.textContent='طباعة التحضير الشهري';
 const sb=$('submitBtn');if(sb){sb.disabled=future;sb.title=future?'لا يمكن إقفال دورة مستقبلية قبل بدءها.':''}
}
function tabUI(){document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===S.tab));syncContextUi()}
function loading(msg='جاري تحميل بيانات المنطقة...'){tabUI();$('metrics').innerHTML='';$('sourceBanner').classList.add('hidden');$('mainView').innerHTML='<div class="card empty" style="min-height:180px"><div><span class="loading"></span><div style="margin-top:10px;font-weight:900">'+esc(msg)+'</div><div class="sub" style="margin-top:6px">يتم تحميل البيانات المطلوبة فقط.</div></div></div>'}
function sourceBanner(){
 const m=S.ctx?.metrics||{},b=$('sourceBanner'),future=S.ctx?.cycle_state==='future';
 b.classList.remove('hidden');
 b.innerHTML='<div><b>'+(future?'الدورة القادمة جاهزة للتجهيز المسبق':'بيانات المنطقة جاهزة')+'</b><div><span>'+Number(m.employees||0)+' تكليفاً نشطاً · '+esc(S.ctx?.roster_note||'')+'</span></div></div><div class="pill '+(future?'warn':'ok')+'">'+(future?'تجهيز مسبق':'تحميل خفيف')+'</div>';
}
function metrics(){
 const m=S.day?.metrics||{};
 const action=Number(m.action_now??m.pending??0),review=Number(m.needs_review??0),complete=Number(m.complete??Math.max(0,Number(m.employees||0)-action-review));
 $('metrics').innerHTML=
  '<div class="card metric '+(action?'bad':'ok')+'"><b>'+action+'</b><span>يحتاج إجراء الآن</span></div>'+
  '<div class="card metric '+(review?'warn':'ok')+'"><b>'+review+'</b><span>يحتاج مراجعة</span></div>'+
  '<div class="card metric ok"><b>'+complete+'</b><span>مكتمل / طبيعي</span></div>'+
  '<div class="card metric"><b>'+Number(m.employees||0)+'</b><span>إجمالي اليوم</span></div>';
}
function applyCtx(){
 if(!S.ctx)return false;
 const a=S.ctx.cycle_start,b=S.ctx.cycle_end,w=$('workDate');w.min=a;w.max=b;
 let changed=false,v=w.value;
 if(!v||v<a||v>b){w.value=(ry()>=a&&ry()<=b)?ry():b;changed=true}
 $('regionLabel').textContent=S.ctx.region_name+' · '+monthLabel(period())+' · '+a+' ← '+b;
 syncContextUi();
 return changed;
}
function normalizeWorkDate(){
 if(!S.ctx)return false;
 const w=$('workDate'),a=S.ctx.cycle_start,b=S.ctx.cycle_end,v=w.value;
 if(!v||v<a||v>b){w.value=(ry()>=a&&ry()<=b)?ry():b;return true}
 return false;
}
async function bootstrap(){
 if(!S.token)return showLogin();const q=++S.seq;S.site=null;S.siteData=null;S.roster=[];S.employee=null;S.issues=null;
 const cached=readCache();
 if(cached){S.ctx=cached.ctx;S.day=cached.day;$('workDate').value=cached.date||work();applyCtx();render();$('saveState').textContent='عرض سريع · جاري التحقق من آخر البيانات...'}
 else{S.ctx=null;S.day=null;loading();$('saveState').textContent='جاري تحميل البيانات...'}
 try{
  const d=await fast('bootstrap',{period:period(),date:work()},10000);if(q!==S.seq)return;
  S.ctx=d.context;S.day=d.day;$('workDate').value=d.date;S.region=S.ctx?.region_code||S.region;if(S.region)localStorage.setItem('arkPrepRegion',S.region);
  if(S.ctx?.cycle_state==='future')S.tab='month';
  applyCtx();writeCache();$('saveState').textContent=(S.ctx?.cycle_state==='future'?'الدورة القادمة · تجهيز مسبق':'جاهز · '+new Date().toLocaleTimeString('ar-SA'));$('saveState').onclick=null;render()
 }catch(e){
  if(q!==S.seq)return;
  if(cached){$('saveState').textContent='آخر نسخة محفوظة · تعذر التحديث — اضغطي لإعادة المحاولة';$('saveState').onclick=bootstrap;toast(e.message,true);return}
  $('saveState').textContent='تعذر التحميل — اضغطي لإعادة المحاولة';$('saveState').onclick=bootstrap;
  $('mainView').innerHTML='<div class="card empty"><div><b>تعذر تحميل البيانات</b><div class="sub">'+esc(e.message)+'</div><button id="retry" class="btn primary" style="margin-top:10px">إعادة المحاولة</button></div></div>';
  $('retry').onclick=bootstrap;toast(e.message,true)
 }
}
async function refreshDay(draw=true){try{S.day=await fast('day',{period:period(),date:work()},9000);writeCache();metrics();if(draw&&(S.tab==='today'||S.tab==='sites'))render()}catch(e){toast(e.message,true)}}
function render(){tabUI();if(!S.ctx||!S.day)return loading();sourceBanner();metrics();if(S.tab==='today')today();else if(S.tab==='sites')sites();else if(S.tab==='month')month();else gaps()}

function siteCard(s){
 const a=Number(s.action_now??s.pending??0),r=Number(s.needs_review??0),e=Number(s.expected||0),c=Number(s.confirmed||0),pct=e?Math.round(c*100/e):100;
 const cls=a?'attention critical':r?'attention':'complete';
 const badge=a?a+' يحتاج إجراء':r?r+' يحتاج مراجعة':'مكتمل';
 return '<article class="card siteCard '+cls+'" data-site="'+esc(s.site_code||'__MISSING__')+'">'+
  '<div class="siteTop"><div><div class="siteName">'+esc(s.site_name||'بدون موقع')+'</div><div class="siteMeta">'+esc(s.client_name||'')+(s.project_name?' · '+esc(s.project_name):'')+'</div></div>'+
  '<div class="guardStatus '+(a?'bad':r?'warn':'ok')+'">'+badge+'</div></div>'+
  '<div class="siteCounts"><span class="pill">'+e+' حارس</span><span class="pill ok">'+c+' محضر</span>'+
  (a?'<span class="pill bad">'+a+' إجراء</span>':'')+(r?'<span class="pill warn">'+r+' مراجعة</span>':'')+'</div>'+
  '<div class="progress '+(!a&&!r?'done':'')+'"><span style="width:'+pct+'%"></span></div>'+
  '<div class="siteActions"><button class="btn secondary openSite" data-site="'+esc(s.site_code||'__MISSING__')+'">فتح الموقع</button></div></article>';
}
function wireSites(){document.querySelectorAll('.siteCard,.openSite').forEach(el=>el.onclick=e=>{e.stopPropagation();openSite(el.dataset.site||el.closest('.siteCard')?.dataset.site)})}
function today(){
 const all=S.day?.sites||[];
 const action=all.filter(x=>Number(x.action_now??x.pending??0)>0);
 const review=all.filter(x=>Number(x.action_now??x.pending??0)===0&&Number(x.needs_review??0)>0);
 const done=all.filter(x=>Number(x.action_now??x.pending??0)===0&&Number(x.needs_review??0)===0&&Number(x.expected||0)>0);
 $('mainView').innerHTML=
  '<div class="sectionHead"><div><h2>يحتاج إجراء الآن</h2><div class="sub">هذه هي الحالات التي تتطلب تدخل موظف العمليات حالياً.</div></div><div class="pill '+(action.length?'bad':'ok')+'">'+action.length+' موقع</div></div>'+
  '<div class="siteGrid">'+(action.length?action.map(siteCard).join(''):'<div class="card empty"><div><b>لا توجد حالات تحتاج إجراء الآن</b><div class="sub">انتقلي إلى حالات المراجعة عند الحاجة.</div></div></div>')+'</div>'+
  '<div class="sectionHead"><div><h2>يحتاج مراجعة</h2><div class="sub">حالات مسجلة تحتاج تدقيقاً أو متابعة داخلية، لكنها ليست حالة طارئة.</div></div><div class="pill '+(review.length?'warn':'ok')+'">'+review.length+' موقع</div></div>'+
  '<div class="siteGrid">'+(review.length?review.map(siteCard).join(''):'<div class="card empty"><b>لا توجد حالات تحتاج مراجعة</b></div>')+'</div>'+
  '<div class="sectionHead"><div><h2>المكتمل / الطبيعي</h2><div class="sub">الحالات الطبيعية مطوية حتى لا تشتت المستخدم.</div></div><button id="toggleDone" class="btn ghost">عرض '+done.length+'</button></div>'+
  '<div id="doneSites" class="siteGrid hidden"></div>';
 wireSites();
 $('toggleDone').onclick=()=>{
   const b=$('doneSites'),show=b.classList.contains('hidden');
   if(show&&!b.dataset.loaded){b.innerHTML=done.map(siteCard).join('');b.dataset.loaded='1';wireSites()}
   b.classList.toggle('hidden');
   $('toggleDone').textContent=b.classList.contains('hidden')?'عرض '+done.length:'إخفاء';
 };
}
function sites(){const all=S.day?.sites||[];$('mainView').innerHTML='<div class="sectionHead"><div><h2>المواقع</h2><div class="sub">بحث سريع في اليوم المحدد.</div></div></div><div class="card viewCard"><input id="siteSearch" class="search" placeholder="بحث بالعميل أو المشروع أو الموقع"></div><div id="allSites" class="siteGrid" style="margin-top:10px"></div>';const draw=()=>{const q=$('siteSearch').value.trim().toLowerCase(),a=all.filter(s=>!q||[s.site_name,s.project_name,s.client_name].some(v=>String(v||'').toLowerCase().includes(q)));$('allSites').innerHTML=a.map(siteCard).join('')||'<div class="card empty">لا توجد نتائج</div>';wireSites()};$('siteSearch').oninput=draw;draw()}
async function openSite(k){if(k==='__MISSING__'){S.tab='gaps';return gaps()}S.site=k;$('mainView').innerHTML='<div class="card empty" style="min-height:160px"><div><span class="loading"></span><div style="margin-top:8px">جاري تحميل الموقع فقط...</div></div></div>';try{S.siteData=await fast('site',{period:period(),date:work(),site_code:k},10000);if(S.site===k)siteDetail()}catch(e){toast(e.message,true);render()}}
function siteDetail(){
 const g=S.siteData;if(!g)return render();
 const rows=g.employees||[];
 const action=rows.filter(x=>x.exception_level==='action'||(!x.exception_level&&!x.status));
 const review=rows.filter(x=>x.exception_level==='review');
 const done=rows.filter(x=>!action.includes(x)&&!review.includes(x));
 $('mainView').innerHTML=
  '<div class="sectionHead"><button id="backSites" class="btn ghost">← رجوع</button><div style="flex:1"><h2>'+esc(g.site_name||'')+'</h2><div class="sub">'+esc(g.client_name||'')+(g.project_name?' · '+esc(g.project_name):'')+' · '+work()+'</div></div>'+
  '<div class="guardStatus '+(action.length?'bad':review.length?'warn':'ok')+'">'+(action.length?action.length+' إجراء':review.length?review.length+' مراجعة':'مكتمل')+'</div></div>'+
  '<div class="sectionHead"><div><h3>الحالات التي تحتاج إجراء أو مراجعة</h3><div class="sub">مرتبة تلقائياً حسب الأولوية.</div></div></div>'+
  '<div class="card viewCard"><div class="guardRows">'+
    (action.length||review.length?[...action,...review].map(guardRow).join(''):'<div class="empty"><b>لا توجد استثناءات في هذا الموقع اليوم</b></div>')+
  '</div></div>'+
  '<div class="sectionHead"><div><h3>الحالات المكتملة</h3><div class="sub">لا تظهر إلا عند الطلب.</div></div><button id="toggleGuardDone" class="btn ghost">عرض '+done.length+'</button></div>'+
  '<div id="guardDone" class="card viewCard hidden"><div class="guardRows">'+done.map(guardRow).join('')+'</div></div>'+
  '<div class="stickyAction"><div class="sub"><b>'+action.filter(x=>!x.status).length+'</b> بدون تحضير حتى الآن.</div><button id="bulkPresent" class="btn primary" '+(action.some(x=>!x.status)?'':'disabled')+'>تأكيد المحددين حاضر</button></div>';
 $('backSites').onclick=()=>{S.site=null;S.siteData=null;render()};
 $('toggleGuardDone').onclick=()=>{const b=$('guardDone');b.classList.toggle('hidden');$('toggleGuardDone').textContent=b.classList.contains('hidden')?'عرض '+done.length:'إخفاء'};
 wireGuards();
 $('bulkPresent').onclick=bulkPresent;
}
function guardRow(e){
 const p=!e.status,level=e.exception_level||(p?'action':EX.has(e.status)?'review':'complete');
 const c=level==='action'?'pending':level==='review'?'exception':'';
 const reason=e.exception_reason?'<div class="guardMeta"><b>'+(level==='action'?'يحتاج إجراء: ':'يحتاج مراجعة: ')+'</b>'+esc(e.exception_reason)+'</div>':'';
 return '<div class="guardRow '+c+'">'+
  '<div class="guardMain"><div style="display:flex;gap:8px;align-items:flex-start">'+
   (p?'<input class="check guardCheck" type="checkbox" value="'+e.assignment_id+'">':'')+
   '<div><div class="guardName">'+esc(e.full_name)+'</div><div class="guardMeta">'+esc(e.employee_ref||'بدون رقم وظيفي')+' · '+esc(e.shift_code||'وردية غير محددة')+'</div>'+reason+'</div></div>'+
   '<button class="guardStatus '+(level==='action'?'bad':level==='review'?'warn':'ok')+' editDay" data-a="'+e.assignment_id+'">'+(p?'لم يُحضّر':esc(STATUS[e.status]||e.status))+'</button></div>'+
  (p?'<div class="quickActions"><button class="quickBtn present qStatus" data-a="'+e.assignment_id+'" data-s="P">حاضر</button><button class="quickBtn off qStatus" data-a="'+e.assignment_id+'" data-s="OFF">راحة</button><button class="quickBtn absent qStatus" data-a="'+e.assignment_id+'" data-s="A">غياب</button><button class="quickBtn qMore" data-a="'+e.assignment_id+'">المزيد…</button></div>':'')+
  '</div>';
}
function wireGuards(){document.querySelectorAll('.editDay,.qMore').forEach(b=>b.onclick=()=>dayModal((S.siteData?.employees||[]).find(x=>x.assignment_id===b.dataset.a),work(),()=>siteDetail()));document.querySelectorAll('.qStatus').forEach(b=>b.onclick=async()=>{const e=(S.siteData?.employees||[]).find(x=>x.assignment_id===b.dataset.a);b.disabled=true;try{await fast('saveDay',{payload:{assignment_id:e.assignment_id,date:work(),status:b.dataset.s,shift_code:e.shift_code||null}},10000);e.status=b.dataset.s;siteDetail();refreshDay(false);toast('تم الحفظ')}catch(x){toast(x.message,true);b.disabled=false}})}
async function bulkPresent(){const ids=[...document.querySelectorAll('.guardCheck:checked')].map(x=>x.value);if(!ids.length)return toast('حددي الحراس أولاً',true);if(!await confirmUI('تأكيد الحضور','سيتم تسجيل '+ids.length+' حارساً كحاضر.','تأكيد'))return;try{await fast('bulkPresent',{date:work(),assignment_ids:ids},12000);(S.siteData?.employees||[]).forEach(e=>{if(ids.includes(e.assignment_id))e.status='P'});siteDetail();refreshDay(false);toast('تم التأكيد')}catch(e){toast(e.message,true)}}

async function month(){$('mainView').innerHTML='<div class="monthLayout"><section class="card roster"><input id="rosterSearch" class="search" placeholder="بحث بالاسم أو الرقم أو الموقع"><div id="rosterList" class="roster-list"><div class="empty" style="min-height:120px"><span class="loading"></span></div></div></section><section id="attendancePanel" class="card attendance"><div class="empty"><b>اختاري موظفاً</b></div></section></div>';let tm;$('rosterSearch').oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>loadRoster($('rosterSearch').value.trim()),250)};await loadRoster('')}
async function loadRoster(q){try{const d=await fast('roster',{period:period(),q},10000);S.roster=d.rows||[];drawRoster()}catch(e){toast(e.message,true)}}
function drawRoster(){const l=$('rosterList');if(!l)return;l.innerHTML='';if(!S.roster.length){l.innerHTML='<div class="empty">لا توجد نتائج</div>';return}S.roster.forEach(a=>{const d=document.createElement('div');d.className='person'+(S.employee?.id===a.id?' active':'');d.innerHTML='<div class="name">'+esc(a.full_name)+'</div><div class="meta">'+esc(a.employee_ref||'بدون رقم وظيفي')+' · '+esc(a.site_name||'بدون موقع')+'</div>';d.onclick=()=>loadEmployee(a.id);l.appendChild(d)})}
async function loadEmployee(id){$('attendancePanel').innerHTML='<div class="empty"><span class="loading"></span></div>';try{const d=await fast('employee',{assignment_id:id},10000);S.employee=d.assignment;drawRoster();attendance()}catch(e){toast(e.message,true)}}
function dayClass(s){return s==='OFF'||s==='O'?'off':['A','W','R','S'].includes(s)?'abs':s==='CASH'?'cash':s?'filled':''}
function attendance(){const a=S.employee,p=$('attendancePanel');if(!a||!p)return;const ds=dates(S.ctx.cycle_start,S.ctx.cycle_end),m=Object.fromEntries((a.days||[]).map(x=>[String(x.date).slice(0,10),x]));let h='<div class="person-head"><div><h2>'+esc(a.full_name)+'</h2><div class="sub">'+esc(a.project_name||'')+' · '+esc(a.site_name||'')+'</div></div><button id="editAssignment" class="btn ghost">تعديل</button></div><div class="quick"><div class="field"><label>من</label><input id="qFrom" type="date" min="'+S.ctx.cycle_start+'" max="'+S.ctx.cycle_end+'" value="'+S.ctx.cycle_start+'"></div><div class="field"><label>إلى</label><input id="qTo" type="date" min="'+S.ctx.cycle_start+'" max="'+S.ctx.cycle_end+'" value="'+S.ctx.cycle_end+'"></div><div class="field"><label>الحالة</label><select id="qStatus">';['P','OFF','A','T','AL','SK','O'].forEach(c=>h+='<option value="'+c+'">'+STATUS[c]+'</option>');h+='</select></div><button id="qFill" class="btn secondary">تعبئة</button></div><div class="calendar" id="cal"></div>';p.innerHTML=h;ds.forEach(d=>{const e=m[d],b=document.createElement('button');b.className='day '+dayClass(e?.status);b.innerHTML='<div class="n">'+d.slice(8,10)+'/'+d.slice(5,7)+'</div><div class="st">'+(e?esc(STATUS[e.status]||e.status):'—')+'</div>';b.onclick=()=>dayModal({assignment_id:a.id,employee_ref:a.employee_ref,full_name:a.full_name,shift_code:a.shift_code,...e},d,()=>loadEmployee(a.id));$('cal').appendChild(b)});$('editAssignment').onclick=()=>assignmentModal(a);$('qFill').onclick=async()=>{const f=$('qFrom').value,t=$('qTo').value;if(!f||!t||f>t)return toast('تحققي من النطاق',true);const ds=dates(f,t),st=$('qStatus').value;if(!await confirmUI('تعبئة النطاق','سيتم تطبيق '+STATUS[st]+' على '+ds.length+' يوماً.','تطبيق'))return;try{await fast('bulkFill',{assignment_id:a.id,dates:ds,status:st,shift_code:a.shift_code||null},12000);await loadEmployee(a.id);if(ds.includes(work()))refreshDay(false);toast('تمت التعبئة')}catch(e){toast(e.message,true)}}}
async function gaps(){
 $('mainView').innerHTML='<div class="card empty" style="min-height:150px"><span class="loading"></span><div style="margin-top:8px">جاري تحميل الاستثناءات...</div></div>';
 try{S.issues=await fast('issues',{period:period(),date:work()},10000);drawGaps()}
 catch(e){$('mainView').innerHTML='<div class="card empty">'+esc(e.message)+'</div>';toast(e.message,true)}
}
function drawGaps(){
 const x=S.issues||{},c=x.counts||{};
 const action=x.action_rows||[],review=x.review_rows||[],data=x.data_rows||[];
 const row=r=>'<div class="gapItem"><b>'+esc(r.full_name||r.employee_key||'')+'</b><div class="sub">'+esc(r.site_name||r.project_name||'')+(r.exception_label?' · '+esc(r.exception_label):r.label?' · '+esc(r.label):'')+'</div></div>';
 const sec=(title,sub,count,rows,cls)=>'<div class="card gapCard '+(cls||'')+'"><div class="sectionHead"><div><h3>'+esc(title)+'</h3><div class="sub">'+esc(sub)+'</div></div><div class="pill '+(cls||'')+'">'+Number(count||0)+'</div></div><div class="gapItems">'+(rows.length?rows.slice(0,40).map(row).join(''):'<div class="gapItem">لا توجد حالات</div>')+(rows.length>40?'<div class="gapItem">+ '+(rows.length-40)+' حالات أخرى</div>':'')+'</div></div>';
 $('mainView').innerHTML=
  '<div class="sectionHead"><div><h2>الاستثناءات</h2><div class="sub">Management by Exception — يعرض ما يحتاج تدخل المستخدم بدلاً من تصفح جميع الحراس.</div></div></div>'+
  '<div class="gapList">'+
    sec('يحتاج إجراء الآن','غياب، انسحاب، استقالة، إيقاف، تحضير ناقص أو تغطية غير مكتملة.',c.action_now,action,'bad')+
    sec('يحتاج مراجعة','إجازات واستئذانات وتغطيات مسجلة وحالات أخرى تحتاج تدقيقاً داخلياً.',c.needs_review,review,'warn')+
    sec('استثناءات البيانات','ربط موظف/موقع ناقص أو تداخلات تحتاج معالجة في البيانات.',c.data_issues,data,'')+
  '</div>';
}


function dayModal(e,d,done){
 if(!e)return;
 let st='';
 Object.entries(STATUS).forEach(x=>st+='<option value="'+x[0]+'" '+(e.status===x[0]?'selected':'')+'>'+x[1]+'</option>');
 modal('<h3>'+esc(e.full_name)+' — '+d+'</h3><div class="grid2"><div class="field"><label>الحالة *</label><select id="dStatus">'+st+'</select></div><div class="field"><label>الوردية</label><input id="dShift" value="'+esc(e.shift_code||'')+'"></div></div><div id="coverageFields" class="hidden"><div class="section-title">تفاصيل التغطية</div><div class="grid2"><div class="field"><label>اسم منفذ التغطية</label><input id="replName" value="'+esc(e.replacement_name||'')+'"></div><div class="field"><label>رقم منفذ التغطية</label><input id="replRef" value="'+esc(e.replacement_employee_ref||'')+'"></div><div class="field" id="cashBox"><label>مبلغ الكاش</label><input id="cash" type="number" min="0" value="'+(e.cash_amount??'')+'"></div></div></div><div class="field" style="margin-top:10px"><label>ملاحظة</label><textarea id="dNote" rows="2">'+esc(e.note||'')+'</textarea></div><div class="modal-actions"><button id="saveD" class="btn primary">حفظ</button><button id="cancelD" class="btn ghost">إلغاء</button></div>');
 const cov=()=>{const s=$('dStatus').value,on=s==='SUB'||s==='CASH';$('coverageFields').classList.toggle('hidden',!on);$('cashBox').classList.toggle('hidden',s!=='CASH')};
 $('dStatus').onchange=cov;cov();$('cancelD').onclick=closeModal;
 $('saveD').onclick=async()=>{
  const p={
   assignment_id:e.assignment_id,date:d,status:$('dStatus').value,shift_code:$('dShift').value||null,
   note:$('dNote').value.trim()||null,replacement_name:$('replName')?.value.trim()||null,
   replacement_employee_ref:$('replRef')?.value.trim()||null,
   covered_employee_name:e.full_name||null,covered_employee_ref:e.employee_ref||null,
   cash_amount:$('cash')?.value||null
  };
  $('saveD').disabled=true;
  try{await fast('saveDay',{payload:p},10000);closeModal();done&&done();if(d===work())refreshDay(false);toast('تم الحفظ')}
  catch(x){toast(x.message,true);$('saveD').disabled=false}
 };
}

function assignmentModal(a=null){if(!S.ctx)return toast('انتظري اكتمال التحميل',true);let opts='<option value="">اختاري الموقع</option>';(S.ctx.sites||[]).forEach(s=>opts+='<option value="'+esc(s.site_code)+'" '+(a?.site_code===s.site_code?'selected':'')+'>'+esc((s.client_name||'')+' — '+(s.project_name||'')+' — '+s.site_name)+'</option>');let sh='';SHIFTS.forEach(x=>sh+='<option value="'+x[0]+'" '+(a?.shift_code===x[0]?'selected':'')+'>'+x[1]+'</option>');modal('<h3>'+(a?'تعديل التكليف':'إضافة موظف / تكليف')+'</h3><div class="field"><label>بحث في قاعدة الموظفين</label><input id="empSearch" placeholder="الاسم أو الرقم الوظيفي"><div id="empSug" class="suggestions hidden"></div></div><div class="grid2" style="margin-top:10px"><div class="field"><label>الرقم الوظيفي</label><input id="empRef" value="'+esc(a?.employee_ref||'')+'"></div><div class="field"><label>الاسم *</label><input id="empName" value="'+esc(a?.full_name||'')+'"></div></div><div class="field" style="margin-top:10px"><label>الموقع</label><select id="siteSel">'+opts+'</select></div><div class="grid2" style="margin-top:10px"><div class="field"><label>الوردية</label><select id="shift">'+sh+'</select></div><div class="field"><label>نوع التكليف</label><select id="atype"><option value="PRIMARY">أساسي</option><option value="RELIEF_FIXED">بديل راحة ثابت</option><option value="TEMP_COVERAGE">تغطية مؤقتة</option><option value="NEW_HIRE">موظف جديد</option><option value="OTHER">أخرى</option></select></div><div class="field"><label>البداية</label><input id="startDate" type="date" value="'+String(a?.start_date||S.ctx.cycle_start).slice(0,10)+'"></div><div class="field"><label>النهاية</label><input id="endDate" type="date" value="'+String(a?.end_date||S.ctx.cycle_end).slice(0,10)+'"></div></div><div class="modal-actions"><button id="saveA" class="btn primary">حفظ التكليف</button><button id="cancelA" class="btn ghost">إلغاء</button></div>');if(a)$('atype').value=a.assignment_type||'PRIMARY';let tm;$('empSearch').oninput=()=>{clearTimeout(tm);tm=setTimeout(async()=>{const q=$('empSearch').value.trim();if(q.length<2)return $('empSug').classList.add('hidden');try{const d=await fast('searchEmployee',{q},8000),b=$('empSug');b.innerHTML='';(d.rows||[]).forEach(e=>{const x=document.createElement('div');x.className='suggestion';x.innerHTML='<b>'+esc(e.full_name)+'</b><div class="sub">'+esc(e.employee_id)+'</div>';x.onclick=()=>{$('empRef').value=e.employee_id;$('empName').value=e.full_name;b.classList.add('hidden')};b.appendChild(x)});b.classList.toggle('hidden',!(d.rows||[]).length)}catch{}},250)};$('cancelA').onclick=closeModal;$('saveA').onclick=async()=>{const p={id:a?.id||null,period:period(),employee_ref:$('empRef').value.trim()||null,full_name:$('empName').value.trim(),job_title:a?.job_title||'حارس أمن',site_code:$('siteSel').value||null,shift_code:$('shift').value,assignment_type:$('atype').value,start_date:$('startDate').value,end_date:$('endDate').value};if(!p.full_name)return toast('اسم الموظف مطلوب',true);try{await fast('saveAssignment',{payload:p},10000);closeModal();await bootstrap();toast('تم الحفظ')}catch(e){toast(e.message,true)}}}

async function exportCsv(){if(!S.ctx)return toast('انتظري اكتمال التحميل',true);const b=$('exportBtn'),o=b.textContent;b.disabled=true;b.textContent='...';try{const d=await fast('export',{period:period()},20000),u=URL.createObjectURL(new Blob(['\ufeff'+(d.csv||'')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download=d.filename||'arkanat-prep.csv';a.click();URL.revokeObjectURL(u);toast('تم تجهيز CSV')}catch(e){toast(e.message,true)}finally{b.disabled=false;b.textContent=o}}

$('loginBtn').onclick=async()=>{const national_id=$('opId').value.trim(),mobile=$('opMobile').value.trim(),region=$('opRegion').value;if(!/^\d{10}$/.test(national_id)||!/^05\d{8}$/.test(mobile)||!region)return toast('تحققي من الهوية والجوال والمنطقة',true);$('loginBtn').disabled=true;try{const d=await login({national_id,mobile,region});S.token=d.token;S.region=d.region_code||region;localStorage.setItem('arkPrepToken',S.token);localStorage.setItem('arkPrepRegion',S.region);showApp();await bootstrap()}catch(e){toast(e.message,true)}finally{$('loginBtn').disabled=false}};
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{S.tab=t.dataset.tab;S.site=null;S.siteData=null;render()});
$('addBtn').onclick=()=>assignmentModal();
$('period').onchange=async()=>{$('workDate').value=period()+'-01';S.employee=null;await bootstrap()};
$('workDate').onchange=async()=>{normalizeWorkDate();S.site=null;S.siteData=null;S.issues=null;await refreshDay(true)};
$('logoutBtn').onclick=()=>{localStorage.removeItem('arkPrepToken');localStorage.removeItem('arkPrepRegion');for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k&&k.startsWith('arkPrepCache:'))sessionStorage.removeItem(k)}S.token='';S.region='';S.ctx=null;S.day=null;showLogin()};
$('printBtn').onclick=()=>{if(!S.ctx)return toast('انتظري اكتمال التحميل',true);if(window.openClientPrint)return window.openClientPrint();toast('خدمة الطباعة ما زالت قيد التهيئة',true)};
$('submitBtn').onclick=async()=>{if(!S.ctx)return toast('انتظري اكتمال التحميل',true);if(!await confirmUI('إقفال التحضير مبدئياً','سيتم فحص الأيام والحقول الأساسية قبل الإقفال.','ابدأ الفحص'))return;try{const d=await fast('submit',{period:period()},12000);toast(d.message||'تم الإقفال');await refreshDay(true)}catch(e){toast(e.message,true)}};
$('exportBtn').onclick=exportCsv;

const d=ry();initPeriodOptions(d.slice(0,7));$('workDate').value=d;syncContextUi();
if(S.token){showApp();bootstrap()}else showLogin();
