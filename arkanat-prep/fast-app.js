
const API='https://dbxvfrkkocfwjumvoaha.supabase.co/functions/v1/arkanat-prep-fast';
const $=id=>document.getElementById(id);
let S={token:localStorage.getItem('arkPrepToken')||'',region:localStorage.getItem('arkPrepRegion')||'',ctx:null,day:null,tab:'today',site:null,siteData:null,roster:[],employee:null,issues:null,recon:null,multiRecon:null,timeConflicts:null,readiness:null,opsReadiness:null,identityTriage:null,triageCategory:'OPS_ACTION',seq:0};
const STATUS={P:'حضور',OFF:'راحة أسبوعية',A:'غياب',T:'استئذان',AL:'إجازة سنوية',SK:'إجازة مرضية',S:'إيقاف',W:'انسحاب',R:'استقالة',O:'إجازة رسمية',SUB:'تغطية',CASH:'تغطية كاش',OTHER:'حالة أخرى'};
const SHIFTS=[['D8','وردية صباحية — 8 ساعات'],['E8','وردية مسائية — 8 ساعات'],['N8','وردية ليلية — 8 ساعات'],['D12','وردية نهارية — 12 ساعة'],['N12','وردية ليلية — 12 ساعة'],['OTHER','وردية أخرى']];
const EX=new Set(['A','T','AL','SK','S','W','R','O','SUB','CASH','OTHER']);
function friendlyError(msg){
 const s=String(msg||'');
 if(/permission denied/i.test(s))return 'تعذر الوصول إلى خدمة الحضور. أعيدي المحاولة بعد تحديث الصفحة.';
 if(/failed to fetch|networkerror|load failed/i.test(s))return 'تعذر الاتصال بخدمة الحضور. تحققي من الاتصال ثم أعيدي المحاولة.';
 if(/timeout|تأخر الاتصال/i.test(s))return 'تأخر الاتصال بخدمة الحضور. أعيدي المحاولة.';
 if(/session_expired/i.test(s))return 'انتهت الجلسة. سجلي الدخول مرة أخرى.';
 if(/DATE_OUTSIDE_CYCLE/i.test(s))return 'التاريخ المحدد خارج دورة التايم شيت الداخلية. تم ضبطه تلقائياً داخل الفترة.';
 return s.length>160?'حدث خطأ أثناء تنفيذ العملية. أعيدي المحاولة.':s;
}
function cacheKey(){return 'arkPrepCache:v8:'+(S.region||'unknown')+':'+period()+':'+work()}
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
 const [y,m]=selected.split('-').map(Number);
 const current='<option value="'+selected+'">دورة '+monthLabel(selected)+' — الحالية</option>';
 let future='<optgroup label="التخطيط المستقبلي — 12 شهراً">';
 for(let k=1;k<=12;k++){
   const d=new Date(y,m-1+k,1),v=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
   future+='<option value="'+v+'">دورة '+monthLabel(v)+(k===1?' — القادمة':' — تخطيط مسبق')+'</option>';
 }
 future+='</optgroup>';
 let past='<optgroup label="الدورات السابقة">';
 for(let k=1;k<=12;k++){
   const d=new Date(y,m-1-k,1),v=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
   past+='<option value="'+v+'">دورة '+monthLabel(v)+'</option>';
 }
 past+='</optgroup>';
 el.innerHTML=current+future+past;
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
  throw new Error('حدث خطأ أثناء الاتصال بخدمة الحضور.');
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
 const monthTab=document.querySelector('.tab[data-tab="month"]');
 if(monthTab)monthTab.textContent=future?'جدول الدوام':'التايم شيت';
 document.querySelectorAll('.tab').forEach(t=>{
   const blocked=future&&t.dataset.tab!=='month';
   t.disabled=blocked;
   t.title=blocked?'هذه دورة مستقبلية؛ استخدمي جدول الدوام لتوزيع الحراس والورديات. يبدأ تسجيل الحضور عند بدء الدورة.':'';
 });
 const pb=$('printBtn');
 if(pb){
   pb.textContent='طباعة التايم شيت';
   pb.disabled=future;
   pb.title=future?'طباعة التايم شيت التشغيلي تتاح عند بدء الفترة الفعلية.':'';
 }
 const sb=$('submitBtn');if(sb){sb.textContent='اعتماد / إقفال الدورة';sb.disabled=future;sb.title=future?'لا يمكن اعتماد دورة مستقبلية قبل بدءها.':''}
}

function tabUI(){document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===S.tab));syncContextUi()}
function loading(msg='جاري تحميل بيانات المنطقة...'){tabUI();$('metrics').innerHTML='';$('sourceBanner').classList.add('hidden');$('mainView').innerHTML='<div class="card empty" style="min-height:180px"><div><span class="loading"></span><div style="margin-top:10px;font-weight:900">'+esc(msg)+'</div><div class="sub" style="margin-top:6px">يتم تحميل البيانات المطلوبة فقط.</div></div></div>'}
function sourceBanner(){
 const m=S.ctx?.metrics||{},b=$('sourceBanner'),future=S.ctx?.cycle_state==='future';
 b.classList.remove('hidden');
 b.innerHTML='<div><b>'+(future?'جدول الدوام المستقبلي جاهز':'بيانات التشغيل جاهزة')+'</b><div><span>'+Number(m.employees||0)+' حارساً موزعاً · '+(future?'يمكن تعديل المواقع والورديات قبل بدء الدورة.':'تعرض الشاشة الحضور المعتاد والاستثناءات التشغيلية فقط.')+'</span></div></div><div class="pill '+(future?'warn':'ok')+'">'+(future?'جداول 12 شهراً':'جاهز')+'</div>';
}

function metrics(){
 const m=S.day?.metrics||{};
 const action=Number(m.action_now||0),review=Number(m.needs_review||0),present=Number(m.present||0),total=Number(m.employees||0),overrides=Math.max(0,total-present);
 $('metrics').innerHTML=
  '<div class="card metric '+(action?'bad':'ok')+'"><b>'+action+'</b><span>تحتاج إجراء</span></div>'+
  '<div class="card metric '+(review?'warn':'ok')+'"><b>'+review+'</b><span>بانتظار المراجعة</span></div>'+
  '<div class="card metric ok"><b>'+present+'</b><span>حضور</span></div>'+
  '<div class="card metric"><b>'+overrides+'</b><span>حالات استثنائية</span></div>'+
  '<div class="card metric"><b>'+total+'</b><span>إجمالي الحراس</span></div>';
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
 if(!S.token)return showLogin();const q=++S.seq;S.site=null;S.siteData=null;S.roster=[];S.employee=null;S.issues=null;S.recon=null;S.multiRecon=null;S.timeConflicts=null;S.readiness=null;S.opsReadiness=null;S.identityTriage=null;
 const cached=readCache();
 if(cached){S.ctx=cached.ctx;S.day=cached.day;$('workDate').value=cached.date||work();applyCtx();render();$('saveState').textContent='عرض سريع · جاري التحقق من آخر البيانات...'}
 else{S.ctx=null;S.day=null;loading();$('saveState').textContent='جاري تحميل البيانات...'}
 try{
  const d=await fast('bootstrap',{period:period(),date:work()},10000);if(q!==S.seq)return;
  S.ctx=d.context;S.day=d.day;$('workDate').value=d.date;S.region=S.ctx?.region_code||S.region;if(S.region)localStorage.setItem('arkPrepRegion',S.region);
  if(S.ctx?.cycle_state==='future')S.tab='month';
  applyCtx();writeCache();$('saveState').textContent=(S.ctx?.cycle_state==='future'?'خطة مستقبلية · '+monthLabel(period()):'جاهز · '+new Date().toLocaleTimeString('ar-SA'));$('saveState').onclick=null;render()
 }catch(e){
  if(q!==S.seq)return;
  if(cached){$('saveState').textContent='آخر نسخة محفوظة · تعذر التحديث — اضغطي لإعادة المحاولة';$('saveState').onclick=bootstrap;toast(e.message,true);return}
  $('saveState').textContent='تعذر التحميل — اضغطي لإعادة المحاولة';$('saveState').onclick=bootstrap;
  $('mainView').innerHTML='<div class="card empty"><div><b>تعذر تحميل البيانات</b><div class="sub">'+esc(e.message)+'</div><button id="retry" class="btn primary" style="margin-top:10px">إعادة المحاولة</button></div></div>';
  $('retry').onclick=bootstrap;toast(e.message,true)
 }
}
async function refreshDay(draw=true){try{S.day=await fast('day',{period:period(),date:work()},9000);writeCache();metrics();if(draw&&(S.tab==='today'||S.tab==='sites'))render()}catch(e){toast(e.message,true)}}
function render(){
 tabUI();if(!S.ctx||!S.day)return loading();
 sourceBanner();metrics();
 if(S.ctx?.cycle_state==='future')return month();
 if(S.tab==='today')today();else if(S.tab==='sites')sites();else if(S.tab==='month')month();else gaps()
}

function siteCard(s){
 const a=Number(s.action_now||0),r=Number(s.needs_review||0),e=Number(s.expected||0),p=Number(s.present||0),o=Math.max(0,e-p);
 const cls=a?'attention critical':r?'attention':'complete';
 const badge=a?a+' يحتاج إجراء':r?r+' يحتاج مراجعة':'طبيعي';
 const bcls=a?'bad':r?'warn':'ok';
 return '<article class="card siteCard '+cls+'" data-site="'+esc(s.site_code||'__MISSING__')+'">'+
  '<div class="siteTop"><div><div class="siteName">'+esc(s.site_name||'بدون موقع')+'</div><div class="siteMeta">'+esc(s.client_name||'')+(s.project_name?' · '+esc(s.project_name):'')+'</div></div>'+
  '<div class="guardStatus '+bcls+'">'+badge+'</div></div>'+
  '<div class="siteCounts"><span class="pill">'+e+' حارس</span><span class="pill ok">'+p+' P</span>'+
  (o?'<span class="pill">'+o+' حالة غير P</span>':'')+(a?'<span class="pill bad">'+a+' استثناء</span>':'')+(r?'<span class="pill warn">'+r+' مراجعة</span>':'')+'</div>'+
  '<div class="progress '+(!a&&!r?'done':'')+'"><span style="width:100%"></span></div>'+
  '<div class="siteActions"><button class="btn secondary openSite" data-site="'+esc(s.site_code||'__MISSING__')+'">فتح الموقع</button></div></article>';
}

function wireSites(){document.querySelectorAll('.siteCard,.openSite').forEach(el=>el.onclick=e=>{e.stopPropagation();openSite(el.dataset.site||el.closest('.siteCard')?.dataset.site)})}
function today(){
 const all=S.day?.sites||[];
 const action=all.filter(x=>Number(x.action_now||0)>0);
 const review=all.filter(x=>Number(x.action_now||0)===0&&Number(x.needs_review||0)>0);
 const normal=all.filter(x=>Number(x.action_now||0)===0&&Number(x.needs_review||0)===0&&Number(x.expected||0)>0);
 $('mainView').innerHTML=
  '<div class="card viewCard" style="margin-bottom:12px"><div class="sectionHead"><div><h2>تسجيل حالة استثنائية</h2><div class="sub">الحالة الافتراضية في كشف الحضور هي <b>حضور (P)</b>. سجلي فقط الغياب، الإجازة، الاستئذان، الانسحاب، الاستقالة، الإيقاف أو التغطية.</div></div><div class="pill ok">الافتراضي: حضور</div></div>'+
  '<input id="exceptionSearch" class="search" placeholder="ابحثي باسم الحارس أو الرقم الوظيفي">'+
  '<div id="exceptionSearchResults" class="roster-list" style="margin-top:8px"><div class="empty" style="min-height:70px">ابدئي بكتابة اسم الموظف أو رقمه لتغيير حالته.</div></div></div>'+
  '<div class="sectionHead"><div><h2>حالات تحتاج إجراء</h2><div class="sub">تظهر فقط الحالات التي تحتاج تدخلاً من العمليات.</div></div><div class="pill '+(action.length?'bad':'ok')+'">'+action.length+' موقع</div></div>'+
  '<div class="siteGrid">'+(action.length?action.map(siteCard).join(''):'<div class="card empty"><div><b>لا توجد حالات تحتاج إجراء</b><div class="sub">الحضور المعتاد لا يحتاج تسجيله حارساً بحارس.</div></div></div>')+'</div>'+
  '<div class="sectionHead"><div><h2>بانتظار المراجعة</h2><div class="sub">حالات استثنائية مسجلة وتنتظر تدقيقاً أو اعتماداً داخلياً.</div></div><div class="pill '+(review.length?'warn':'ok')+'">'+review.length+' موقع</div></div>'+
  '<div class="siteGrid">'+(review.length?review.map(siteCard).join(''):'<div class="card empty"><b>لا توجد حالات بانتظار المراجعة</b></div>')+'</div>'+
  '<div class="sectionHead"><div><h2>المواقع بدون استثناءات</h2><div class="sub">مطوية افتراضياً لأنها لا تحتاج متابعة.</div></div><button id="toggleDone" class="btn ghost">عرض '+normal.length+'</button></div>'+
  '<div id="doneSites" class="siteGrid hidden"></div>';
 wireSites();
 let tm;
 $('exceptionSearch').oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>exceptionLookup($('exceptionSearch').value.trim()),220)};
 $('toggleDone').onclick=()=>{
   const b=$('doneSites'),show=b.classList.contains('hidden');
   if(show&&!b.dataset.loaded){b.innerHTML=normal.map(siteCard).join('');b.dataset.loaded='1';wireSites()}
   b.classList.toggle('hidden');
   $('toggleDone').textContent=b.classList.contains('hidden')?'عرض '+normal.length:'إخفاء';
 };
}
async function exceptionLookup(q){
 const box=$('exceptionSearchResults');if(!box)return;
 if(q.length<2){box.innerHTML='<div class="empty" style="min-height:70px">ابدئي بكتابة اسم الموظف أو رقمه لتغيير حالته.</div>';return}
 box.innerHTML='<div class="empty" style="min-height:70px"><span class="loading"></span></div>';
 try{
   const d=await fast('roster',{period:period(),q},8000),rows=(d.rows||[]).slice(0,20);
   if(!rows.length){box.innerHTML='<div class="empty" style="min-height:70px">لا توجد نتيجة مطابقة.</div>';return}
   box.innerHTML=rows.map(a=>'<div class="person exceptionPick" data-id="'+esc(a.id)+'"><div><div class="name">'+esc(a.full_name)+'</div><div class="meta">'+esc(a.assignment_type==='CASH_COVERAGE'?'حارس تغطية كاش':(a.employee_ref||'بدون رقم وظيفي'))+' · '+esc(a.site_name||'بدون موقع')+'</div></div><div style="display:flex;gap:6px;align-items:center"><span class="pill ok">P</span><button class="btn secondary exceptionEdit" data-id="'+esc(a.id)+'">تغيير الحالة</button></div></div>').join('');
   document.querySelectorAll('.exceptionEdit').forEach(b=>b.onclick=()=>{
     const a=rows.find(x=>String(x.id)===String(b.dataset.id));if(!a)return;
     dayModal({...a,assignment_id:a.id,status:'P'},work(),async()=>{await refreshDay(true);const s=$('exceptionSearch');if(s){s.value='';exceptionLookup('')}})
   });
 }catch(e){box.innerHTML='<div class="empty" style="min-height:70px">تعذر البحث</div>';toast(e.message,true)}
}

function sites(){const all=S.day?.sites||[];$('mainView').innerHTML='<div class="sectionHead"><div><h2>المواقع</h2><div class="sub">بحث سريع في اليوم المحدد.</div></div></div><div class="card viewCard"><input id="siteSearch" class="search" placeholder="بحث بالعميل أو المشروع أو الموقع"></div><div id="allSites" class="siteGrid" style="margin-top:10px"></div>';const draw=()=>{const q=$('siteSearch').value.trim().toLowerCase(),a=all.filter(s=>!q||[s.site_name,s.project_name,s.client_name].some(v=>String(v||'').toLowerCase().includes(q)));$('allSites').innerHTML=a.map(siteCard).join('')||'<div class="card empty">لا توجد نتائج</div>';wireSites()};$('siteSearch').oninput=draw;draw()}
async function openSite(k){if(k==='__MISSING__'){S.tab='gaps';return gaps()}S.site=k;$('mainView').innerHTML='<div class="card empty" style="min-height:160px"><div><span class="loading"></span><div style="margin-top:8px">جاري تحميل الموقع فقط...</div></div></div>';try{S.siteData=await fast('site',{period:period(),date:work(),site_code:k},10000);if(S.site===k)siteDetail()}catch(e){toast(e.message,true);render()}}
function classifyLocalException(e){
 const st=e.status||'P',cashGuard=e.assignment_type==='CASH_COVERAGE';
 if(['A','W','R','S'].includes(st)){e.exception_level='action';e.exception_reason=STATUS[st]||st;return e}
 if(!cashGuard&&['SUB','CASH'].includes(st)&&!String(e.replacement_employee_ref||'').trim()&&!String(e.replacement_name||'').trim()){e.exception_level='action';e.exception_reason='تغطية بدون تحديد المنفذ';return e}
 if(st==='CASH'&&(e.cash_amount===null||e.cash_amount===undefined||e.cash_amount==='')){e.exception_level='action';e.exception_reason='تغطية كاش بدون مبلغ';return e}
 if(['T','AL','SK','O','OTHER','SUB','CASH'].includes(st)){e.exception_level='review';e.exception_reason=st==='CASH'?'تغطية كاش تحتاج مراجعة مالية':st==='SUB'?'تغطية مسجلة تحتاج مراجعة داخلية':STATUS[st]||st;return e}
 e.status='P';e.exception_level='complete';e.exception_reason=null;return e
}

function caseStateLabel(s){return {OPEN:'مفتوح',IN_PROGRESS:'قيد المعالجة',PENDING_REVIEW:'بانتظار المراجعة',CLOSED:'مغلق'}[s]||''}
function laneLabel(s){return {OPERATIONS:'العمليات',HR:'الموارد البشرية',FINANCE:'المالية'}[s]||s||''}
function caseMetaMarkup(e){
 if(!e.case_id)return '';
 const s=e.workflow_status||'OPEN',cls=s==='OPEN'?'open':s==='IN_PROGRESS'?'progress':s==='PENDING_REVIEW'?'review':'closed';
 return '<div class="caseMeta"><span class="caseTag '+cls+'">'+esc(caseStateLabel(s))+'</span><span class="caseTag">المراجعة: '+esc(laneLabel(e.review_lane))+'</span>'+(e.priority?'<span class="caseTag">أولوية '+esc(e.priority)+'</span>':'')+'</div>';
}
function caseActionsMarkup(e){
 if(!e.case_id)return '';
 const s=e.workflow_status||'OPEN',id=esc(e.case_id);
 if(s==='OPEN')return '<div class="caseActions"><button class="caseBtn caseAction" data-case="'+id+'" data-transition="START">بدء المعالجة</button><button class="caseBtn primary caseAction" data-case="'+id+'" data-transition="SUBMIT_REVIEW">تم الإجراء ← للمراجعة</button></div>';
 if(s==='IN_PROGRESS')return '<div class="caseActions"><button class="caseBtn primary caseAction" data-case="'+id+'" data-transition="SUBMIT_REVIEW">تم الإجراء ← للمراجعة</button></div>';
 if(s==='PENDING_REVIEW')return '<div class="caseActions"><button class="caseBtn ok caseAction" data-case="'+id+'" data-transition="CLOSE">اعتماد وإغلاق</button><button class="caseBtn gold caseAction" data-case="'+id+'" data-transition="RETURN">إعادة للتعديل</button></div>';
 if(s==='CLOSED')return '<div class="caseActions"><button class="caseBtn caseAction" data-case="'+id+'" data-transition="REOPEN">إعادة فتح</button></div>';
 return '';
}
function caseTransitionTitle(a){return {START:'بدء معالجة الاستثناء',SUBMIT_REVIEW:'تأكيد الإجراء وإرساله للمراجعة',RETURN:'إعادة الحالة للتعديل',CLOSE:'اعتماد وإغلاق الاستثناء',REOPEN:'إعادة فتح الاستثناء'}[a]||'تحديث الاستثناء'}
function caseTransitionButton(a){return {START:'بدء المعالجة',SUBMIT_REVIEW:'إرسال للمراجعة',RETURN:'إعادة للتعديل',CLOSE:'إغلاق الاستثناء',REOPEN:'إعادة فتح'}[a]||'حفظ'}
function normalizeExceptionForEdit(row){
 if(!row?.assignment_id)return null;
 return Object.assign({},row,{
   status:row.status||row.status_code||'',
   shift_code:row.shift_code||'',
   employee_ref:row.employee_ref||'',
   replacement_name:row.replacement_name||'',
   replacement_employee_ref:row.replacement_employee_ref||'',
   cash_amount:row.cash_amount??null,
   note:row.note||''
 });
}
function caseTransitionModal(caseId,action){
 const row=[...(S.issues?.action_rows||[]),...(S.issues?.review_rows||[]),...(S.issues?.closed_rows||[]),...(S.siteData?.employees||[])].find(x=>x.case_id===caseId)||{};
 const lane=laneLabel(row.review_lane);
 const canEdit=!!row.assignment_id&&(action==='SUBMIT_REVIEW'||(action==='CLOSE'&&row.review_lane==='FINANCE'&&row.status_code==='CASH'));
 const noteRequired=action==='RETURN';
 const helper=action==='SUBMIT_REVIEW'
   ?'<div class="notice" style="margin-top:10px"><b>قبل الإرسال:</b> يمكنك تعديل الحالة أو التفاصيل أولاً، أو الرجوع بدون إرسال. لن تنتقل الحالة للمراجعة إلا بعد الضغط على «إرسال للمراجعة».</div>'
   :action==='CLOSE'&&row.review_lane==='FINANCE'&&row.status_code==='CASH'
   ?'<div class="notice" style="margin-top:10px"><b>المراجعة المالية:</b> تأكدي من مبلغ تغطية الكاش قبل الاعتماد. يمكنك تعديل المبلغ من زر «تعديل الحالة» ثم اعتماد الإغلاق.</div>'
   :action==='RETURN'
   ?'<div class="notice" style="margin-top:10px"><b>إعادة للتعديل:</b> ستعود الحالة إلى «قيد المعالجة» ولن تعتبر معتمدة حتى يعاد إرسالها للمراجعة.</div>'
   :'';
 const buttons='<button id="caseSave" class="btn primary">'+esc(caseTransitionButton(action))+'</button>'+
   (canEdit?'<button id="caseEdit" class="btn secondary">تعديل الحالة</button>':'')+
   '<button id="caseCancel" class="btn ghost">رجوع بدون إرسال</button>';
 modal('<h3>'+esc(caseTransitionTitle(action))+'</h3><div class="sub" style="line-height:1.8">'+
   (row.full_name?'<b>'+esc(row.full_name)+'</b><br>':'')+
   (row.exception_reason||row.exception_label?esc(row.exception_reason||row.exception_label)+'<br>':'')+
   (action==='SUBMIT_REVIEW'&&lane?'مسار المراجعة بعد الإرسال: <b>'+esc(lane)+'</b>.':'')+
   (action==='RETURN'&&lane?'ستعود من مراجعة <b>'+esc(lane)+'</b> إلى موظف العمليات للتعديل.':'')+
  '</div>'+helper+
  '<div class="field" style="margin-top:12px"><label>ملاحظة الإجراء / المراجعة'+(noteRequired?' *':'')+'</label><textarea id="caseNote" rows="3" placeholder="'+(noteRequired?'اكتب سبب الإعادة للتعديل':'اختياري، ويفضل تسجيل ما تم عند وجود أثر على الموارد أو المالية')+'"></textarea></div>'+
  '<div class="modal-actions">'+buttons+'</div>');
 $('caseCancel').onclick=closeModal;
 if(canEdit)$('caseEdit').onclick=()=>{
   const editable=normalizeExceptionForEdit(row);
   closeModal();
   dayModal(editable,work(),async()=>{
     if(S.site){await openSite(S.site);refreshDay(false)}
     else if(S.tab==='gaps'){await gaps()}
     else{await refreshDay(true)}
   });
 };
 $('caseSave').onclick=async()=>{
   const note=$('caseNote').value.trim();
   if(noteRequired&&!note)return toast('اكتب سبب إعادة الحالة للتعديل',true);
   const b=$('caseSave');b.disabled=true;
   try{
     await fast('exceptionTransition',{case_id:caseId,transition:action,note:note||null},10000);
     closeModal();toast(action==='RETURN'?'تمت إعادة الحالة للتعديل':'تم تحديث الاستثناء');
     if(S.site){await openSite(S.site);refreshDay(false)}
     else if(S.tab==='gaps'){await gaps()}
     else{await refreshDay(true)}
   }catch(e){toast(e.message,true);b.disabled=false}
 };
}
function wireCaseActions(){
 document.querySelectorAll('.caseAction').forEach(b=>b.onclick=e=>{e.stopPropagation();caseTransitionModal(b.dataset.case,b.dataset.transition)});
 document.querySelectorAll('.openExceptionSite').forEach(b=>b.onclick=()=>openSite(b.dataset.site));
}

function siteDetail(){
 const g=S.siteData;if(!g)return render();
 const rows=g.employees||[];
 const action=rows.filter(x=>x.exception_level==='action');
 const review=rows.filter(x=>x.exception_level==='review');
 const normal=rows.filter(x=>!action.includes(x)&&!review.includes(x));
 const top=action.length?{c:'bad',t:action.length+' تحتاج إجراء'}:review.length?{c:'warn',t:review.length+' بانتظار المراجعة'}:{c:'ok',t:'بدون استثناءات'};
 $('mainView').innerHTML=
  '<div class="sectionHead"><button id="backSites" class="btn ghost">← رجوع</button><div style="flex:1"><h2>'+esc(g.site_name||'')+'</h2><div class="sub">'+esc(g.client_name||'')+(g.project_name?' · '+esc(g.project_name):'')+' · '+work()+'</div></div>'+
  '<div class="guardStatus '+top.c+'">'+top.t+'</div></div>'+
  '<div class="sectionHead"><div><h3>الحالات الاستثنائية</h3><div class="sub">يعرض هذا القسم الغياب والإجازات والتغطيات والحالات التي تحتاج متابعة فقط.</div></div></div>'+
  '<div class="card viewCard"><div class="guardRows">'+
    (action.length||review.length?[...action,...review].map(guardRow).join(''):'<div class="empty"><b>لا توجد حالات استثنائية في هذا الموقع</b><div class="sub">الحالة الافتراضية للحراس: حضور.</div></div>')+
  '</div></div>'+
  '<div class="sectionHead"><div><h3>الحضور المعتاد</h3><div class="sub">لا حاجة لتسجيل الحضور حارساً بحارس؛ افتحي القائمة فقط عند الحاجة.</div></div><button id="toggleGuardDone" class="btn ghost">عرض '+normal.length+'</button></div>'+
  '<div id="guardDone" class="card viewCard hidden"><div class="guardRows">'+normal.map(guardRow).join('')+'</div></div>';
 $('backSites').onclick=()=>{S.site=null;S.siteData=null;render()};
 $('toggleGuardDone').onclick=()=>{const b=$('guardDone');b.classList.toggle('hidden');$('toggleGuardDone').textContent=b.classList.contains('hidden')?'عرض '+normal.length:'إخفاء'};
 wireGuards();wireCaseActions();
}

function guardRow(e){
 const level=e.exception_level||'complete';
 const c=level==='action'||level==='review'?'exception':'';
 const reason=e.exception_reason?'<div class="guardMeta"><b>'+(level==='action'?'يحتاج إجراء: ':level==='review'?'يحتاج مراجعة: ':'')+'</b>'+esc(e.exception_reason)+'</div>':'';
 const scls=level==='action'?'bad':level==='review'?'warn':'ok';
 const identityLabel=e.assignment_type==='CASH_COVERAGE'?'حارس تغطية كاش':(e.employee_ref||'بدون رقم وظيفي');
 return '<div class="guardRow '+c+'">'+
  '<div class="guardMain"><div><div class="guardName">'+esc(e.full_name)+'</div><div class="guardMeta">'+esc(identityLabel)+' · '+esc(e.shift_code||'وردية غير محددة')+(e.status_source==='DEFAULT_PRESENT'?' · حضور افتراضي':'')+'</div>'+reason+caseMetaMarkup(e)+'</div>'+
  '<button class="guardStatus '+scls+' editDay" data-a="'+e.assignment_id+'">'+esc(STATUS[e.status]||e.status||'حاضر')+'</button></div>'+
  caseActionsMarkup(e)+
  '</div>';
}

function wireGuards(){
 document.querySelectorAll('.editDay').forEach(b=>b.onclick=()=>dayModal((S.siteData?.employees||[]).find(x=>x.assignment_id===b.dataset.a),work(),()=>openSite(S.site)));
}

async function bulkPresent(){
 const ids=[...document.querySelectorAll('.guardCheck:checked')].map(x=>x.value);
 if(!ids.length)return toast('حددي الحراس أولاً',true);
 if(!await confirmUI('تأكيد الحضور','سيتم تسجيل '+ids.length+' حارساً كحاضر.','تأكيد'))return;
 try{
   await fast('bulkPresent',{date:work(),assignment_ids:ids},12000);
   await openSite(S.site);refreshDay(false);toast('تم التأكيد')
 }catch(e){toast(e.message,true)}
}

async function month(){
 const future=S.ctx?.cycle_state==='future';
 const intro=future
  ?'<div class="card" style="margin-bottom:10px"><div class="sectionHead"><div><h2>جدول الدوام والورديات</h2><div class="sub">يمكن تجهيز توزيع الحراس والمواقع والورديات حتى 12 شهراً قادمة. لا يتم تسجيل حضور قبل بدء الفترة.</div></div><div><div class="pill warn">'+esc(monthLabel(period()))+'</div><div id="planningReadiness" class="sub" style="margin-top:6px;text-align:left">جاري فحص جاهزية التكليفات...</div></div></div></div>'
  :'';
 $('mainView').innerHTML=intro+'<div class="monthLayout"><section class="card roster"><input id="rosterSearch" class="search" placeholder="بحث بالاسم أو الرقم أو الموقع"><div id="rosterList" class="roster-list"><div class="empty" style="min-height:120px"><span class="loading"></span></div></div></section><section id="attendancePanel" class="card attendance"><div class="empty"><b>'+(future?'اختاري حارساً لمراجعة توزيعه المستقبلي':'اختاري موظفاً')+'</b></div></section></div>';
 let tm;$('rosterSearch').oninput=()=>{clearTimeout(tm);tm=setTimeout(()=>loadRoster($('rosterSearch').value.trim()),250)};await loadRoster('')
}

async function loadRoster(q){try{const d=await fast('roster',{period:period(),q},10000);S.roster=d.rows||[];drawRoster()}catch(e){toast(e.message,true)}}
function drawRoster(){
 const l=$('rosterList');if(!l)return;l.innerHTML='';
 if(!S.roster.length){l.innerHTML='<div class="empty">لا توجد نتائج</div>';return}
 let incomplete=0;
 S.roster.forEach(a=>{
   const needs= S.ctx?.cycle_state==='future' && (
     !a.site_code || a.work_days_per_week===null || a.work_days_per_week===undefined ||
     a.daily_hours===null || a.daily_hours===undefined ||
     (!a.shift_code&&!a.shift_detail&&!a.shift_start_text&&!a.shift_start_time)
   );
   if(needs)incomplete++;
   const d=document.createElement('div');d.className='person'+(S.employee?.id===a.id?' active':'');
   d.innerHTML='<div class="name">'+esc(a.full_name)+(needs?' <span class="pill warn" style="font-size:9px">ناقص التخطيط</span>':'')+'</div>'+
     '<div class="meta">'+esc(a.employee_ref||'بدون رقم وظيفي')+' · '+esc(a.site_name||'بدون موقع')+
     (a.assignment_type==='RELIEF_FIXED'?' · بديل راحة ثابت':a.assignment_type==='TEMP_COVERAGE'?' · تغطية مؤقتة':a.assignment_type==='EXTRA_SHIFT'?' · وردية إضافية':a.assignment_type==='CASH_COVERAGE'?' · تغطية كاش':'')+'</div>';
   d.onclick=()=>loadEmployee(a.id);l.appendChild(d)
 });
 const pr=$('planningReadiness');
 if(pr){
   const ready=S.roster.length-incomplete;
   pr.innerHTML=incomplete
     ?'<span style="color:var(--warn)">'+incomplete+' تكليفاً يحتاج استكمال حقول التايم شيت</span> · '+ready+' جاهز'
     :'<span style="color:var(--ok)">جميع التكليفات الظاهرة مكتملة الحقول الأساسية</span>';
 }
}
async function loadEmployee(id){
 $('attendancePanel').innerHTML='<div class="empty"><span class="loading"></span></div>';
 try{
  const d=await fast('employee',{assignment_id:id},10000);S.employee=d.assignment;drawRoster();
  if(S.ctx?.cycle_state==='future')futureAssignment();else attendance()
 }catch(e){toast(e.message,true)}
}
function futureAssignment(){
 const a=S.employee,p=$('attendancePanel');if(!a||!p)return;
 const workDays=a.work_days_per_week??'غير محدد',dailyHours=a.daily_hours??'غير محدد';
 const source=a.source_file_name
  ?'<div class="notice" style="margin-top:14px"><b>مرجع التايم شيت:</b> '+esc(a.source_file_name)+' / '+esc(a.source_sheet||'')+(a.source_row?' / صف '+esc(a.source_row):'')+(a.source_hidden_row?' · صف مخفي تمت قراءته':'')+'</div>'
  :'';
 p.innerHTML='<div class="person-head"><div><h2>'+esc(a.full_name)+'</h2><div class="sub">'+esc(a.employee_ref||'بدون رقم وظيفي')+'</div></div><button id="editAssignment" class="btn primary">تعديل توزيع الحارس</button></div>'+
 '<div class="grid2" style="margin-top:14px">'+
 '<div class="field"><label>المشروع</label><div class="card" style="padding:10px">'+esc(a.project_name||'غير محدد')+'</div></div>'+
 '<div class="field"><label>الموقع</label><div class="card" style="padding:10px">'+esc(a.site_name||'غير محدد')+'</div></div>'+
 '<div class="field"><label>نقطة العمل</label><div class="card" style="padding:10px">'+esc(a.work_point_name||'غير محددة')+'</div></div>'+
 '<div class="field"><label>المشرف</label><div class="card" style="padding:10px">'+esc(a.supervisor_name||'غير محدد')+'</div></div>'+
 '<div class="field"><label>نوع التوزيع</label><div class="card" style="padding:10px">'+esc(a.assignment_type==='CASH_COVERAGE'?'حارس تغطية كاش':a.assignment_type==='EXTRA_SHIFT'?'وردية إضافية':a.assignment_type==='TEMP_COVERAGE'?'تغطية مؤقتة':a.assignment_type==='RELIEF_FIXED'?'بديل راحات':a.assignment_type||'PRIMARY')+'</div></div>'+
 '<div class="field"><label>أيام العمل أسبوعياً</label><div class="card" style="padding:10px">'+esc(workDays)+'</div></div>'+
 '<div class="field"><label>الراحة الأسبوعية</label><div class="card" style="padding:10px">'+esc(a.weekly_off_text||'غير محددة')+'</div></div>'+
 '<div class="field"><label>ساعات العمل اليومية</label><div class="card" style="padding:10px">'+esc(dailyHours)+'</div></div>'+
 '<div class="field"><label>الوردية</label><div class="card" style="padding:10px">'+esc(a.shift_code||'غير محددة')+'</div></div>'+
 '<div class="field"><label>وصف الوردية</label><div class="card" style="padding:10px">'+esc(a.shift_detail||'غير محدد')+'</div></div>'+
 '<div class="field"><label>بداية الوردية</label><div class="card" style="padding:10px">'+esc(String(a.shift_start_time||a.shift_start_text||'غير محددة').slice(0,5))+'</div></div>'+
 '<div class="field"><label>نهاية الوردية</label><div class="card" style="padding:10px">'+esc(String(a.shift_end_time||a.shift_end_text||'غير محددة').slice(0,5))+(a.shift_end_next_day?' · اليوم التالي':'')+'</div></div>'+
 '<div class="field"><label>تاريخ المباشرة بالموقع</label><div class="card" style="padding:10px">'+esc(String(a.start_date||S.ctx.cycle_start).slice(0,10))+'</div></div>'+
 '<div class="field"><label>تاريخ نهاية التوزيع</label><div class="card" style="padding:10px">'+esc(String(a.end_date||S.ctx.cycle_end).slice(0,10))+'</div></div>'+
 '</div>'+
 (a.notes?'<div class="notice" style="margin-top:14px"><b>ملاحظات التشغيل:</b> '+esc(a.notes)+'</div>':'')+
 source+
 '<div class="notice" style="margin-top:14px">هذا جدول دوام مستقبلي. عند بدء الفترة ينتقل توزيع الحراس والورديات إلى المتابعة اليومية، بينما تبقى التغطيات اليومية وتغطية الكاش حالات تشغيلية مستقلة.</div>';
 $('editAssignment').onclick=()=>assignmentModal(a);
}

function dayClass(s){return s==='OFF'||s==='O'?'off':['A','W','R','S'].includes(s)?'abs':s==='CASH'?'cash':s?'filled':''}
function attendance(){const a=S.employee,p=$('attendancePanel');if(!a||!p)return;const ds=dates(S.ctx.cycle_start,S.ctx.cycle_end),m=Object.fromEntries((a.days||[]).map(x=>[String(x.date).slice(0,10),x]));let h='<div class="person-head"><div><h2>'+esc(a.full_name)+'</h2><div class="sub">'+esc(a.project_name||'')+' · '+esc(a.site_name||'')+'</div></div><button id="editAssignment" class="btn ghost">تعديل</button></div><div class="quick"><div class="field"><label>من</label><input id="qFrom" type="date" min="'+S.ctx.cycle_start+'" max="'+S.ctx.cycle_end+'" value="'+S.ctx.cycle_start+'"></div><div class="field"><label>إلى</label><input id="qTo" type="date" min="'+S.ctx.cycle_start+'" max="'+S.ctx.cycle_end+'" value="'+S.ctx.cycle_end+'"></div><div class="field"><label>الحالة</label><select id="qStatus">';['P','OFF','A','T','AL','SK','O'].forEach(c=>h+='<option value="'+c+'">'+STATUS[c]+'</option>');h+='</select></div><button id="qFill" class="btn secondary">تعبئة</button></div><div class="calendar" id="cal"></div>';p.innerHTML=h;ds.forEach(d=>{const e=m[d],b=document.createElement('button');b.className='day '+dayClass(e?.status);b.innerHTML='<div class="n">'+d.slice(8,10)+'/'+d.slice(5,7)+'</div><div class="st">'+(e?esc(STATUS[e.status]||e.status):'—')+'</div>';b.onclick=()=>dayModal({assignment_id:a.id,employee_ref:a.employee_ref,full_name:a.full_name,shift_code:a.shift_code,assignment_type:a.assignment_type,...e},d,()=>loadEmployee(a.id));$('cal').appendChild(b)});$('editAssignment').onclick=()=>assignmentModal(a);$('qFill').onclick=async()=>{const f=$('qFrom').value,t=$('qTo').value;if(!f||!t||f>t)return toast('تحققي من النطاق',true);const ds=dates(f,t),st=$('qStatus').value;if(!await confirmUI('تعبئة النطاق','سيتم تطبيق '+STATUS[st]+' على '+ds.length+' يوماً.','تطبيق'))return;try{await fast('bulkFill',{assignment_id:a.id,dates:ds,status:st,shift_code:a.shift_code||null},12000);await loadEmployee(a.id);if(ds.includes(work()))refreshDay(false);toast('تمت التعبئة')}catch(e){toast(e.message,true)}}}
async function gaps(){
 $('mainView').innerHTML='<div class="card empty" style="min-height:150px"><span class="loading"></span><div style="margin-top:8px">جاري تحميل الاستثناءات وتصحيح البيانات...</div></div>';
 try{
   const [issues,recon,multiRecon,timeConflicts,readiness,opsReadiness,identityTriage]=await Promise.all([
     fast('issues',{period:period(),date:work()},10000),
     fast('reconciliationQueue',{period:period(),limit:50},12000),
     fast('multiAssignmentQueue',{period:period(),limit:60},12000),
     fast('timeConflictQueue',{period:period(),limit:40},12000),
     fast('readiness',{period:period()},10000),
     fast('operationsReadiness',{period:period()},10000),
     fast('identityTriage',{period:period(),category:'OPS_ACTION',limit:40},12000)
   ]);
   S.issues=issues;S.recon=recon;S.multiRecon=multiRecon;S.timeConflicts=timeConflicts;S.readiness=readiness;S.opsReadiness=opsReadiness;S.identityTriage=identityTriage;S.triageCategory='OPS_ACTION';drawGaps()
 }
 catch(e){$('mainView').innerHTML='<div class="card empty">'+esc(e.message)+'</div>';toast(e.message,true)}
}
function drawGaps(){
 const x=S.issues||{},c=x.counts||{};
 const action=x.action_rows||[],review=x.review_rows||[],closed=x.closed_rows||[],data=x.data_rows||[],pending=x.pending_rows||[];
 const row=r=>{
   const siteBtn=r.site_code?'<button class="caseBtn openExceptionSite" data-site="'+esc(r.site_code)+'">فتح الموقع</button>':'';
   return '<div class="gapItem"><b>'+esc(r.full_name||r.employee_key||'')+'</b>'+
    '<div class="sub">'+esc(r.site_name||r.project_name||'')+(r.exception_label?' · '+esc(r.exception_label):r.label?' · '+esc(r.label):'')+'</div>'+
    caseMetaMarkup(r)+
    '<div class="caseActions">'+siteBtn+(r.case_id?caseActionsMarkup(r).replace(/^<div class="caseActions">|<\/div>$/g,''):'')+'</div></div>';
 };
 const sec=(title,sub,count,rows,cls)=>'<div class="card gapCard '+(cls||'')+'"><div class="sectionHead"><div><h3>'+esc(title)+'</h3><div class="sub">'+esc(sub)+'</div></div><div class="pill '+(cls||'')+'">'+Number(count||0)+'</div></div><div class="gapItems">'+(rows.length?rows.slice(0,50).map(row).join(''):'<div class="gapItem">لا توجد حالات</div>')+(rows.length>50?'<div class="gapItem">+ '+(rows.length-50)+' حالات أخرى</div>':'')+'</div></div>';
 const rq=S.recon||{},rs=rq.summary||{},rr=rq.rows||[],ms=rq.multi_assignment_summary||{};
 const issueLabel=x=>({EMPLOYEE_NOT_FOUND:'الموظف غير مربوط',EMPLOYEE_AMBIGUOUS:'اسم موظف ملتبس',ASSIGNMENT_IDENTITY_GAP:'التكليف بلا رقم وظيفي معتمد',SITE_NOT_MAPPED:'الموقع غير مربوط',SITE_AMBIGUOUS:'الموقع يحتاج تحديداً',MULTI_ROW_REVIEW:'صفوف متعددة تحتاج تصنيفاً',HR_PENDING:'بانتظار الموارد البشرية',MASTERDATA_PENDING:'بانتظار اعتماد بيانات الموقع'}[x]||x||'مراجعة بيانات');
 const reconItems=rr.map(r=>{
   const suggested=[r.employee_name_candidate,r.site_name_candidate].filter(Boolean).join(' · ');
   const shift=r.shift_suggestion?.ok?(r.shift_suggestion.start_time+'–'+r.shift_suggestion.end_time):'';
   const cashLevel=r.cash_coverage_candidate_level||'NONE';
   const cashHint=cashLevel!=='NONE'
     ?'<div class="notice" style="margin-top:6px"><b>'+(cashLevel==='HIGH'?'مؤشر كاش من المصدر:':cashLevel==='MEDIUM'?'مؤشر تغطية/بديل:':'بيانات هوية غير مكتملة:')+'</b> '+esc(r.cash_coverage_candidate_reason||'الحالة تحتاج تصنيفاً من العمليات.')+'</div>'
     :'';
   return '<div class="gapItem"><div class="guardMain"><div><b>'+esc(r.guard_name||'')+'</b><div class="sub">'+esc(r.raw_site||'بدون موقع')+' · '+esc(issueLabel(r.issue_code))+'</div></div><span class="guardStatus warn">'+esc(r.source_row||'')+'</span></div>'+
     '<div class="sub" style="margin-top:5px">المصدر: '+esc(r.source_file_name||'')+(r.source_sheet?' / '+esc(r.source_sheet):'')+'</div>'+
     (suggested?'<div class="sub">اقتراح: '+esc(suggested)+'</div>':'')+
     (shift?'<div class="sub">وقت مستخرج من المصدر: '+esc(shift)+'</div>':'')+
     cashHint+
     '<div class="caseActions"><button class="caseBtn primary reconOpen" data-row="'+esc(r.legacy_row_id)+'">معالجة البيانات</button>'+
       ((cashLevel==='HIGH'||cashLevel==='MEDIUM')?'<button class="caseBtn rqCashQuick" data-row="'+esc(r.legacy_row_id)+'">تصنيف التغطية</button>':'')+
     '</div></div>';
 }).join('');
 const it=S.identityTriage||{},its=it.summary||{},itRows=it.rows||[],triageCat=S.triageCategory||'ALL';
 const triageLabel=c=>({WORKER_LINK:'حارس يحتاج ربط بموظف',COVERAGE_RELIEF:'بديل / تغطية',CASH_EXPLICIT:'كاش مذكور في المصدر'}[c]||c);
 const triageActionText=c=>c==='CASH_EXPLICIT'?'تأكيد تغطية كاش':c==='COVERAGE_RELIEF'?'ربط / تصنيف الحارس':'ربط الحارس';
 const triageItems=itRows.slice(0,20).map(r=>{
   const id4=r.source_identity_last4?'<span class="caseTag">هوية **'+esc(r.source_identity_last4)+'</span>':'';
   const shift=(r.shift_start_time&&r.shift_end_time)?'<span class="caseTag">وردية '+esc(String(r.shift_start_time).slice(0,5))+'–'+esc(String(r.shift_end_time).slice(0,5))+'</span>':'';
   const workDays=Number(r.working_days||0)?'<span class="caseTag">أيام عمل من المصدر: '+Number(r.working_days||0)+'</span>':'';
   const strongEmp=r.strong_employee_suggestion&&r.suggested_employee_ref
     ?'<div class="notice" style="margin-top:6px"><b>مرشح موظف قوي:</b> '+esc(r.suggested_employee_name||'')+' · '+esc(r.suggested_employee_ref)+' — يحتاج تأكيد فقط.</div>'
     :'';
   const shortReview=r.short_duration_review
     ?'<div class="notice" style="margin-top:6px"><b>فترة عمل قصيرة وبيانات ناقصة:</b> لا يفترض النظام أنها كاش. حددي الواقع التشغيلي: موظف، تغطية كاش، أو إحالة للموارد البشرية.</div>'
     :'';
   const strongConfirm=r.strong_employee_suggestion&&r.suggested_employee_ref
     ?'<button class="caseBtn ok triageConfirmEmployee" data-row="'+esc(r.representative_legacy_row_id)+'" data-ref="'+esc(r.suggested_employee_ref)+'" data-name="'+esc(r.suggested_employee_name||'')+'" data-site="'+esc(r.site_code||'')+'">تأكيد '+esc(r.suggested_employee_name||'الموظف')+'</button>'
     :'';
   const cashBtn=strongConfirm+(r.triage_category==='CASH_EXPLICIT'
     ?'<button class="caseBtn primary triageCash" data-row="'+esc(r.representative_legacy_row_id)+'">تأكيد كاش</button><button class="caseBtn triageOpen" data-row="'+esc(r.representative_legacy_row_id)+'">ليس كاش / ربط بموظف</button>'
     :r.triage_category==='COVERAGE_RELIEF'
       ?'<button class="caseBtn primary triageOpen" data-row="'+esc(r.representative_legacy_row_id)+'">ربط كموظف بديل</button><button class="caseBtn triageCash" data-row="'+esc(r.representative_legacy_row_id)+'">تغطية كاش</button><button class="caseBtn triageHR" data-row="'+esc(r.representative_legacy_row_id)+'">إحالة للموارد البشرية</button>'
       :'<button class="caseBtn primary triageOpen" data-row="'+esc(r.representative_legacy_row_id)+'">ربط بموظف</button><button class="caseBtn triageCash" data-row="'+esc(r.representative_legacy_row_id)+'">حارس كاش</button><button class="caseBtn triageHR" data-row="'+esc(r.representative_legacy_row_id)+'">إحالة للموارد البشرية</button>');
   return '<div class="gapItem"><div class="guardMain"><div><b>'+esc(r.full_name||'')+'</b><div class="sub">'+esc(r.site_name||'بدون موقع')+' · '+esc(triageLabel(r.triage_category))+'</div></div><span class="pill">'+Number(r.source_rows_count||1)+' صف</span></div>'+
     '<div class="sub" style="margin-top:5px">'+esc(r.triage_reason||'')+'</div>'+strongEmp+shortReview+
     '<div class="caseMeta">'+id4+shift+workDays+'</div>'+
     '<div class="caseActions">'+cashBtn+'</div></div>';
 }).join('');
 const triageCard='<div class="card gapCard '+(Number(its.operations_action||0)?'attention':'complete')+'" style="margin-bottom:10px">'+
   '<div class="sectionHead"><div><h3>تهيئة بيانات الحراس من ملفات التحضير</h3><div class="sub">تعرض افتراضياً الحالات التي تحتاج قراراً من العمليات فقط. ربط الموظفين الإداري يبقى في مسار الموارد البشرية.</div></div><div class="pill '+(Number(its.operations_action||0)?'warn':'ok')+'">'+Number(its.operations_action||0)+' عليك</div></div>'+
   '<div class="caseActions" style="margin-top:8px">'+
     '<button class="caseBtn triageFilter '+(triageCat==='OPS_ACTION'?'primary':'')+'" data-cat="OPS_ACTION">مطلوب من العمليات '+Number(its.operations_action||0)+'</button>'+
     (Number(its.strong_employee_suggestions||0)?'<button class="caseBtn triageFilter '+(triageCat==='STRONG_EMPLOYEE'?'primary':'')+'" data-cat="STRONG_EMPLOYEE">تأكيد ربط واضح '+Number(its.strong_employee_suggestions||0)+'</button>':'')+
     (Number(its.short_duration_review||0)?'<button class="caseBtn triageFilter '+(triageCat==='SHORT_REVIEW'?'primary':'')+'" data-cat="SHORT_REVIEW">فترات قصيرة '+Number(its.short_duration_review||0)+'</button>':'')+
     (Number(its.coverage_relief||0)?'<button class="caseBtn triageFilter '+(triageCat==='COVERAGE_RELIEF'?'primary':'')+'" data-cat="COVERAGE_RELIEF">بدلاء / تغطيات '+Number(its.coverage_relief||0)+'</button>':'')+
     (Number(its.cash_explicit||0)?'<button class="caseBtn triageFilter '+(triageCat==='CASH_EXPLICIT'?'primary':'')+'" data-cat="CASH_EXPLICIT">كاش صريح '+Number(its.cash_explicit||0)+'</button>':'')+
     (Number(its.hr_link_pending||0)?'<button class="caseBtn triageFilter '+(triageCat==='HR_LINK'?'primary':'')+'" data-cat="HR_LINK">مسار الموارد البشرية '+Number(its.hr_link_pending||0)+'</button>':'')+
   '</div>'+
   ((Number(its.strong_employee_suggestions||0)||Number(its.short_duration_review||0)||Number(its.waiting_hr||0)||Number(its.waiting_masterdata||0))?'<div class="caseMeta" style="margin-top:7px">'+
     (Number(its.strong_employee_suggestions||0)?'<span class="caseTag">مرشح موظف قوي: '+Number(its.strong_employee_suggestions||0)+'</span>':'')+
     (Number(its.short_duration_review||0)?'<span class="caseTag">فترات قصيرة تحتاج تصنيف: '+Number(its.short_duration_review||0)+'</span>':'')+
     (Number(its.waiting_hr||0)?'<span class="caseTag">أُحيلت للموارد البشرية: '+Number(its.waiting_hr||0)+'</span>':'')+
     (Number(its.waiting_masterdata||0)?'<span class="caseTag">بانتظار بيانات المواقع: '+Number(its.waiting_masterdata||0)+'</span>':'')+
   '</div>':'')+
   '<div class="notice" style="margin-top:9px">'+
     (triageCat==='HR_LINK'
       ?'<b>هذا مسار بيانات الموارد البشرية.</b> تظهر الحالات هنا للشفافية فقط؛ لا يلزم موظفة العمليات معالجة كل اسم. إذا كانت تعرف الموظف يقيناً يمكنها ربطه، وإلا تُحال للموارد البشرية.'
       :'<b>المطلوب من العمليات:</b> حسم نوع الحالة فقط عندما يكون لها أثر تشغيلي: بديل/تغطية، فترة قصيرة غير واضحة، كاش فعلي، أو تأكيد ربط واضح. بقية ربط الموظفين ليس عملاً يومياً على العمليات.')+
   '</div>'+
   '<div class="gapItems" style="margin-top:9px">'+(triageItems||'<div class="gapItem">لا توجد حالات في هذا التصنيف.</div>')+'</div>'+
   (itRows.length>20?'<div class="sub" style="margin-top:7px">يظهر أول 20 حالة فقط لتبسيط العمل. استخدمي التصنيفات أعلاه للمتابعة على دفعات.</div>':'')+
 '</div>';
  const reconCard='<div class="card gapCard '+(Number(rs.total||0)?'attention':'complete')+'">'+
   '<div class="sectionHead"><div><h3>تصحيح بيانات التحضير</h3><div class="sub">يعرض فقط الصفوف التي لا يمكن اعتمادها آلياً. لا يلزم إعادة إدخال التحضير الصحيح.</div></div><div class="pill '+(Number(rs.total||0)?'warn':'ok')+'">'+Number(rs.total||0)+'</div></div>'+
   '<div class="caseMeta">'+
     '<span class="caseTag">تكليف بلا رقم وظيفي: '+Number(rs.assignment_identity_gap||0)+'</span>'+
     '<span class="caseTag">موظف غير موجود: '+Number(rs.employee_not_found||0)+'</span>'+
     '<span class="caseTag">موقع غير مربوط: '+Number(rs.site_not_mapped||0)+'</span>'+
     '<span class="caseTag">موقع ملتبس: '+Number(rs.site_ambiguous||0)+'</span>'+
     '<span class="caseTag">صفوف متعددة: '+Number(rs.multi_row_review||0)+'</span>'+
     '<span class="caseTag">بانتظار الموارد البشرية: '+Number(rs.hr_pending||0)+'</span>'+
     '<span class="caseTag">بانتظار بيانات المواقع: '+Number(rs.masterdata_pending||0)+'</span>'+
     '<span class="caseTag">مؤشر كاش قوي: '+Number(rs.cash_candidate_high||0)+'</span>'+
     '<span class="caseTag">مؤشر تغطية/بديل: '+Number(rs.cash_candidate_medium||0)+'</span>'+
   '</div>'+
   ((Number(ms.total||0))?'<div class="notice" style="margin-top:9px"><b>فحص الورديات:</b> '+Number(ms.multi_shift_same_day||0)+' حالات ورديات متعددة في اليوم نفسه، '+Number(ms.duplicate_or_coverage||0)+' حالات تكرار/تغطية محتملة، و'+Number(ms.dates_do_not_overlap||0)+' حالات لا تتداخل تواريخها.</div>':'')+
   '<details style="margin-top:9px"><summary class="caseBtn">عرض التفاصيل الفنية للصفوف</summary><div class="gapItems" style="margin-top:9px">'+(reconItems||'<div class="gapItem">لا توجد بيانات معلقة لهذه المنطقة.</div>')+'</div></details></div>';
 const mq=S.multiRecon||{},mqs=mq.summary||{},mGroups=mq.groups||[];
 const patternLabel=p=>({MULTI_SHIFT_SAME_DAY:'وردية ثانية في اليوم نفسه',DUPLICATE_OR_COVERAGE:'تكرار أو تغطية محتملة'}[p]||p||'مراجعة');
 const multiItems=mGroups.map(g=>{
   const rows=(g.rows||[]).map(r=>{
     const sg=r.shift_suggestion||{};
     const tm=sg.ok?sg.start_time+'–'+sg.end_time:(r.shift_text||'الوقت غير محدد');
     return 'صف '+esc(r.source_row)+' · '+esc(tm)+(r.notes?' · '+esc(r.notes):'');
   }).join('<br>');
   return '<div class="gapItem"><div class="guardMain"><div><b>'+esc(g.guard_name||'')+'</b><div class="sub">'+esc(g.raw_site||'')+' · '+esc(patternLabel(g.review_pattern))+'</div></div><span class="guardStatus '+(g.review_pattern==='MULTI_SHIFT_SAME_DAY'?'bad':'warn')+'">'+Number(g.same_date_multi_work||0)+' يوم</span></div>'+
     '<div class="sub" style="margin-top:6px">'+rows+'</div>'+
     '<div class="caseActions"><button class="caseBtn primary multiReconOpen" data-group="'+esc(g.group_key)+'">معالجة الورديات / التغطية</button></div></div>';
 }).join('');
 const multiCard='<div class="card gapCard '+(Number(mqs.total||0)?'attention':'complete')+'" style="margin-top:10px">'+
   '<div class="sectionHead"><div><h3>الورديات المتعددة والتغطيات المحتملة</h3><div class="sub">الحالات التي ظهر فيها الموظف أكثر من مرة في الموقع نفسه. لا تعتبر خطأ تلقائياً؛ يلزم تحديد وردية إضافية أو تغطية أو تكرار.</div></div><div class="pill '+(Number(mqs.total||0)?'warn':'ok')+'">'+Number(mqs.total||0)+'</div></div>'+
   '<div class="caseMeta"><span class="caseTag">ورديات متعددة: '+Number(mqs.multi_shift_same_day||0)+'</span><span class="caseTag">تكرار/تغطية محتملة: '+Number(mqs.duplicate_or_coverage||0)+'</span></div>'+
   '<div class="gapItems" style="margin-top:9px">'+(multiItems||'<div class="gapItem">لا توجد مجموعات معلقة لهذه المنطقة.</div>')+'</div></div>';
 const tq=S.timeConflicts||{},tqs=tq.summary||{},tGroups=tq.groups||[];
 const fmtTime=v=>v?String(v).slice(0,5):'—';
 const timeItems=tGroups.map(g=>{
   const left=esc(g.assignment_a_site||g.site_a_name||'موقع 1')+' · '+esc(fmtTime(g.assignment_a_start))+'–'+esc(fmtTime(g.assignment_a_end));
   const right=esc(g.assignment_b_site||g.site_b_name||'موقع 2')+' · '+esc(fmtTime(g.assignment_b_start))+'–'+esc(fmtTime(g.assignment_b_end));
   return '<div class="gapItem"><div class="guardMain"><div><b>'+esc(g.employee_name||g.employee_ref||'')+'</b><div class="sub">'+left+' ↔ '+right+'</div></div><span class="guardStatus bad">'+Number(g.conflict_dates||0)+' يوم</span></div>'+
     '<div class="caseActions"><button class="caseBtn conflictOpenAssignment" data-a="'+esc(g.assignment_a)+'">فتح التكليف الأول</button><button class="caseBtn conflictOpenAssignment" data-a="'+esc(g.assignment_b)+'">فتح التكليف الثاني</button></div></div>';
 }).join('');
 const timeCard='<div class="card gapCard '+(Number(tqs.groups||0)?'critical':'complete')+'" style="margin-top:10px">'+
   '<div class="sectionHead"><div><h3>تعارض زمني مؤكد</h3><div class="sub">هذه ليست مجرد صفوف مكررة؛ فترات العمل نفسها تتداخل زمنياً. يجب تعديل أحد التكليفين قبل إقفال الدورة.</div></div><div class="pill '+(Number(tqs.groups||0)?'bad':'ok')+'">'+Number(tqs.groups||0)+'</div></div>'+
   '<div class="caseMeta"><span class="caseTag">موظفون متأثرون: '+Number(tqs.employees||0)+'</span><span class="caseTag">أيام تعارض: '+Number(tqs.conflict_dates||0)+'</span></div>'+
   '<div class="gapItems" style="margin-top:9px">'+(timeItems||'<div class="gapItem">لا توجد تعارضات زمنية مؤكدة لهذه المنطقة.</div>')+'</div></div>';
 const ord=S.opsReadiness||{},opsBlocked=ord.status==='BLOCKED';
 const opsHandoffDone=!!ord.operations_submitted_at;
 const opsCard='<div class="card '+(opsBlocked?'attention':'complete')+'" style="margin-bottom:10px">'+
   '<div class="sectionHead"><div><h3>مسؤولية العمليات في الدورة</h3><div class="sub">'+
     (opsBlocked
       ?'تبقى حالات تحتاج قراراً تشغيلياً قبل أن تسلّم العمليات عملها.'
       :'لا توجد موانع تشغيلية حالية. يمكن اعتماد وتسليم أعمال العمليات حتى لو بقيت أعمال تخص الموارد البشرية أو البيانات المرجعية.')+
   '</div></div><div class="pill '+(opsBlocked?'warn':'ok')+'">'+
     (opsBlocked?Number(ord.blocker_count||0)+' متبقي':(opsHandoffDone?'تم التسليم سابقاً':'جاهز للتسليم'))+
   '</div></div>'+
   '<div class="caseMeta">'+
     '<span class="caseTag">قرارات الحراس: '+Number(ord.operations_action||0)+'</span>'+
     '<span class="caseTag">ورديات متعددة: '+Number(ord.multi_assignment_groups||0)+'</span>'+
     '<span class="caseTag">تعارضات زمنية: '+Number(ord.time_conflict_groups||0)+'</span>'+
     '<span class="caseTag">تغطيات مفتوحة: '+Number(ord.open_coverage_cases||0)+'</span>'+
     '<span class="caseTag">حالات تشغيلية مفتوحة: '+Number(ord.open_operations_cases||0)+'</span>'+
   '</div>'+
   (Number(ord.hr_link_pending||0)?'<div class="sub" style="margin-top:7px">يوجد '+Number(ord.hr_link_pending||0)+' حالة ربط موظف في مسار الموارد البشرية؛ لا تدخل ضمن مسؤولية الإقفال التشغيلي لموظفة العمليات.</div>':'')+
 '</div>';
  const rd=S.readiness||{},blocked=rd.status==='BLOCKED';
 const readinessCard='<div class="card '+(blocked?'attention critical':'complete')+'" style="margin-bottom:10px">'+
   '<div class="sectionHead"><div><h3>الإقفال النهائي للدورة</h3><div class="sub">'+(blocked?'الإقفال النهائي ما زال ينتظر معالجة جميع المسارات المختصة، وليس العمليات وحدها.':'جميع المسارات مكتملة والدورة جاهزة للإقفال النهائي.')+'</div></div><div class="pill '+(blocked?'bad':'ok')+'">'+(blocked?Number(rd.blocker_count||0)+' مانع':'جاهز')+'</div></div>'+
   '<div class="caseMeta">'+
     '<span class="caseTag">مطلوب من العمليات: '+Number(its.operations_action||0)+'</span>'+
     '<span class="caseTag">ربط موظفين - الموارد البشرية: '+Number(its.hr_link_pending||0)+'</span>'+
     '<span class="caseTag">بيانات أخرى معلقة: '+Number(rd.data_blockers||0)+'</span>'+
     '<span class="caseTag">ورديات متعددة: '+Number(rd.multi_assignment_groups||0)+'</span>'+
     '<span class="caseTag">تعارضات زمنية: '+Number(rd.time_conflict_groups||0)+'</span>'+
     '<span class="caseTag">تغطيات مفتوحة: '+Number(rd.open_coverage_cases||0)+'</span>'+
     '<span class="caseTag">حضور افتراضي P: '+Number(rd.implicit_present_days||0)+'</span>'+
   '</div>'+
   '<div class="sub" style="margin-top:7px">الحضور الافتراضي P لا يعد نقصاً. إجمالي موانع الإقفال قد يشمل أعمالاً تخص الموارد البشرية أو البيانات المرجعية؛ شاشة العمليات تعرض افتراضياً ما يحتاج قراراً تشغيلياً فقط.</div></div>';
 $('mainView').innerHTML=
  '<div class="sectionHead"><div><h2>الحالات الاستثنائية</h2><div class="sub">الأولوية للعمل التشغيلي الفعلي. الحضور المعتاد لا يحتاج إدخالاً فردياً.</div></div></div>'+
  (pending.length?'<div class="card" style="margin:10px 0"><div class="sectionHead"><div><h3>قيد العمل اليومي</h3><div class="sub">يوجد '+pending.length+' موظفاً بانتظار التحضير اليوم؛ هذه حالة طبيعية وليست استثناءً.</div></div><div class="pill">'+pending.length+'</div></div></div>':'')+
  '<div class="gapList" style="margin-top:10px">'+
    sec('تحتاج إجراء الآن','غياب، انسحاب، استقالة، إيقاف أو تغطية غير مكتملة.',c.action_now,action,'bad')+
    sec('بانتظار المراجعة','إجازات واستئذانات وتغطيات وأحداث تم تسجيلها وتحتاج اعتماد المسار المختص.',c.needs_review,review,'warn')+
  '</div>'+
  '<div class="sectionHead" style="margin-top:16px"><div><h2>تهيئة وإقفال الدورة</h2><div class="sub">تظهر هنا فقط مشكلات البيانات والورديات التي تمنع الإقفال أو تحتاج قراراً. لا يعاد إدخال التحضير الصحيح.</div></div></div>'+
  opsCard+readinessCard+triageCard+timeCard+multiCard+reconCard+
  '<div class="gapList" style="margin-top:10px">'+
    sec('مشكلات البيانات اليومية','هوية حارس أو موقع غير محسوم، أو تداخل تشغيلي لليوم المحدد.',c.data_issues,data,'')+
    sec('حالات مغلقة','حالات تمت معالجتها واعتمادها، وتبقى محفوظة للرجوع والمراجعة.',c.closed_cases,closed,'ok')+
  '</div>';
 wireCaseActions();wireReconActions();wireIdentityTriageActions();wireMultiReconActions();wireTimeConflictActions();
}


async function loadIdentityTriage(category){
 const cat=category||'OPS_ACTION';
 try{
   S.triageCategory=cat;
   S.identityTriage=await fast('identityTriage',{period:period(),category:cat,limit:60},12000);
   drawGaps();
 }catch(e){toast(e.message,true)}
}
async function openTriageResolution(rowId,mode='default'){
 if(!rowId)return;
 try{
   const d=await fast('reconciliationRow',{legacy_row_id:rowId},10000);
   if(d?.row)return reconciliationModal(d.row,mode);
   toast('تعذر تحميل تفاصيل الحالة.',true);
 }catch(e){toast(e.message,true)}
}
function wireIdentityTriageActions(){
 document.querySelectorAll('.triageFilter').forEach(b=>b.onclick=()=>loadIdentityTriage(b.dataset.cat||'ALL'));
 document.querySelectorAll('.triageOpen').forEach(b=>b.onclick=()=>openTriageResolution(b.dataset.row,'default'));
 document.querySelectorAll('.triageCash').forEach(b=>b.onclick=()=>openTriageResolution(b.dataset.row,'cash'));
 document.querySelectorAll('.triageConfirmEmployee').forEach(b=>b.onclick=async()=>{
   const rowId=b.dataset.row,employeeRef=b.dataset.ref,employeeName=b.dataset.name,siteCode=b.dataset.site;
   if(!rowId||!employeeRef)return;
   if(!await confirmUI('تأكيد ربط الحارس','سيتم ربط بيانات التحضير بالموظف <b>'+esc(employeeName)+'</b> ('+esc(employeeRef)+'). لا يتم هذا الربط تلقائياً؛ هذا تأكيد منك على أن الشخص هو نفسه.','تأكيد الربط'))return;
   try{
     const d=await fast('resolveReconciliation',{payload:{
       legacy_row_id:rowId,
       issue_code:'ASSIGNMENT_IDENTITY_GAP',
       resolution_type:'LINK_PRIMARY',
       employee_ref:employeeRef,
       site_code:siteCode||null
     }},12000);
     toast(d.message||'تم ربط الحارس');await gaps();
   }catch(e){toast(e.message,true)}
 });
 document.querySelectorAll('.triageHR').forEach(b=>b.onclick=async()=>{
   const rowId=b.dataset.row;if(!rowId)return;
   if(!await confirmUI('إحالة الحالة للموارد البشرية','سيتم اعتبار قرار العمليات مكتملًا من ناحية نوع الحالة، وتنتقل مهمة ربط الموظف للموارد البشرية. ستبقى الحالة مانعاً للإقفال حتى اعتماد الربط.','إحالة للموارد البشرية'))return;
   try{
     const d=await fast('resolveReconciliation',{payload:{legacy_row_id:rowId,issue_code:'ASSIGNMENT_IDENTITY_GAP',resolution_type:'SEND_HR'}},12000);
     toast(d.message||'تمت الإحالة');await gaps();
   }catch(e){toast(e.message,true)}
 });
}


function wireReconActions(){
 document.querySelectorAll('.reconOpen').forEach(b=>b.onclick=()=>{
   const r=(S.recon?.rows||[]).find(x=>x.legacy_row_id===b.dataset.row);
   if(r)reconciliationModal(r);
 });
 document.querySelectorAll('.rqCashQuick').forEach(b=>b.onclick=()=>{
   const r=(S.recon?.rows||[]).find(x=>x.legacy_row_id===b.dataset.row);
   if(r)reconciliationModal(r,'cash');
 });
}

function reconciliationModal(r,openMode='default'){
 const issueNames={EMPLOYEE_NOT_FOUND:'الموظف غير موجود في المطابقة الحالية',EMPLOYEE_AMBIGUOUS:'يوجد أكثر من موظف محتمل',ASSIGNMENT_IDENTITY_GAP:'التكليف موجود في التحضير لكنه غير مربوط برقم وظيفي معتمد',SITE_NOT_MAPPED:'الموقع غير مربوط',SITE_AMBIGUOUS:'اسم الموقع يقابل أكثر من موقع',MULTI_ROW_REVIEW:'الموظف ظاهر بأكثر من صف/وردية',HR_PENDING:'الحالة محالة للموارد البشرية وما زالت تمنع الإقفال',MASTERDATA_PENDING:'الموقع محال لمراجعة البيانات المرجعية وما زال يمنع الإقفال'};
 let siteOpts='<option value="">اختاري الموقع الصحيح</option>';
 const candidates=r.site_candidates||[],seen=new Set();
 if(candidates.length){
   siteOpts+='<optgroup label="المواقع المرشحة من ملف التحضير">';
   candidates.forEach(s=>{seen.add(s.site_code);siteOpts+='<option value="'+esc(s.site_code)+'">'+esc((s.client_name||'')+' — '+(s.project_name||'')+' — '+(s.site_name||s.site_code))+'</option>'});
   siteOpts+='</optgroup>';
 }
 siteOpts+='<optgroup label="جميع مواقع المنطقة">';
 (S.ctx?.sites||[]).forEach(s=>{if(!seen.has(s.site_code)){seen.add(s.site_code);siteOpts+='<option value="'+esc(s.site_code)+'">'+esc((s.client_name||'')+' — '+(s.project_name||'')+' — '+s.site_name)+'</option>'}});
 siteOpts+='</optgroup>';
 if(r.site_code_candidate&&!seen.has(r.site_code_candidate))siteOpts+='<option value="'+esc(r.site_code_candidate)+'">'+esc(r.site_name_candidate||r.site_code_candidate)+'</option>';
 const empCandidates=r.employee_candidates||[];
 const fuzzyCandidates=(r.fuzzy_employee_candidates||[]).filter(e=>!empCandidates.some(x=>x.employee_ref===e.employee_ref));
 const empCandidateHtml=(empCandidates.length||fuzzyCandidates.length)
   ?'<div class="sub" style="margin-top:6px">مرشحون من قاعدة الموظفين — اختاري فقط إذا كان الشخص هو نفسه:</div><div class="caseActions">'+
     empCandidates.slice(0,8).map(e=>'<button type="button" class="caseBtn primary rqEmpCandidate" data-ref="'+esc(e.employee_ref)+'" data-name="'+esc(e.full_name)+'">'+esc(e.full_name)+' · '+esc(e.employee_ref)+'</button>').join('')+
     fuzzyCandidates.slice(0,5).map(e=>{
       const flags=[e.same_site?'نفس الموقع':'',e.same_project?'نفس المشروع':'',e.employee_status||''].filter(Boolean).join(' · ');
       return '<button type="button" class="caseBtn rqEmpCandidate" data-ref="'+esc(e.employee_ref)+'" data-name="'+esc(e.full_name)+'">'+esc(e.full_name)+' · '+esc(e.employee_ref)+(flags?' · '+esc(flags):'')+'</button>';
     }).join('')+
     '</div>'
   :'';
 const cashCandidates=r.cash_worker_candidates||[];
 let cashWorkerOpts='<option value="">حارس كاش جديد / غير مسجل سابقاً</option>';
 cashCandidates.forEach(c=>cashWorkerOpts+='<option value="'+esc(c.coverage_worker_id)+'">'+esc(c.display_name)+(c.mobile_last4?' · جوال **'+esc(c.mobile_last4):'')+(c.national_id_last4?' · هوية **'+esc(c.national_id_last4):'')+'</option>');
 const cashSignal=(r.cash_coverage_candidate_level&&r.cash_coverage_candidate_level!=='NONE')
   ?'<div class="notice" style="margin-top:10px"><b>تنبيه تشغيلي:</b> '+esc(r.cash_coverage_candidate_reason||'قد تكون الحالة حارس تغطية كاش.')+
     (r.source_identity_last4?'<br>هوية موجودة في المصدر تنتهي بـ **'+esc(r.source_identity_last4):'')+
     '<br>هذا مجرد مؤشر من ملف التحضير، وليس تصنيفاً تلقائياً. اختاري «حارس تغطية كاش» فقط إذا كانت الحالة كذلك فعلياً.</div>'
   :'';
 const sg=r.shift_suggestion||{};
 const start=sg.ok?sg.start_time:'',end=sg.ok?sg.end_time:'';
 const siteShifts=r.site_shift_candidates||[];
 const shiftChips=siteShifts.length
   ?'<div class="sub" style="margin-top:8px">ورديات مستخدمة في الموقع — اختاري لتعبئة الوقت:</div><div class="caseActions">'+
     siteShifts.map(s=>'<button type="button" class="caseBtn rqShiftChip" data-start="'+esc(s.start_time)+'" data-end="'+esc(s.end_time)+'">'+esc(s.start_time)+'–'+esc(s.end_time)+(s.usage_count?' · '+Number(s.usage_count):'')+'</button>').join('')+
     '</div>'
   :'';
 modal(
  '<h3>تصحيح بيانات التحضير</h3>'+
  '<div class="notice"><b>'+esc(issueNames[r.issue_code]||'حالة تحتاج مراجعة')+'</b><br>المصدر: '+esc(r.source_file_name||'')+' / صف '+esc(r.source_row||'')+'<br>لن يتم تغيير ملف المصدر؛ سيحفظ النظام قرار التصحيح وأثر المراجعة.</div>'+cashSignal+
  '<div class="grid2">'+
    '<div class="field"><label>الاسم في ملف التحضير</label><input value="'+esc(r.guard_name||'')+'" disabled></div>'+
    '<div class="field"><label>الموقع في ملف التحضير</label><input value="'+esc(r.raw_site||'')+'" disabled></div>'+
  '</div>'+
  '<div id="rqEmpSearchBox" class="field" style="margin-top:10px"><label>البحث عن الموظف الصحيح</label><input id="rqEmpSearch" placeholder="الاسم أو الرقم الوظيفي"><div id="rqEmpSug" class="suggestions hidden"></div>'+empCandidateHtml+'</div>'+
  '<div class="grid2" style="margin-top:10px">'+
    '<div id="rqEmpRefBox" class="field"><label>الرقم الوظيفي</label><input id="rqEmpRef" value="'+esc(Number(r.employee_candidate_count||0)===1?(r.employee_ref_candidate||''):'')+'" placeholder="اختاري من البحث"></div>'+
    '<div id="rqEmpNameBox" class="field"><label>اسم الموظف المعتمد</label><input id="rqEmpName" value="'+esc(Number(r.employee_candidate_count||0)===1?(r.employee_name_candidate||''):'')+'" disabled></div>'+
    '<div class="field"><label>الموقع الصحيح</label><select id="rqSite">'+siteOpts+'</select></div>'+
    '<div class="field"><label>تصنيف الصف</label><select id="rqType"><option value="LINK_PRIMARY">تكليف أساسي</option><option value="MARK_CASH_COVERAGE">حارس تغطية كاش</option><option value="LINK_EXTRA_SHIFT">وردية إضافية</option><option value="LINK_COVERAGE">تغطية بحارس موظف</option><option value="IGNORE_DUPLICATE">صف مكرر</option></select></div>'+
    '<div class="field"><label>بداية الوردية</label><input id="rqStart" type="time" value="'+esc(start)+'"></div>'+
    '<div class="field"><label>نهاية الوردية</label><input id="rqEnd" type="time" value="'+esc(end)+'"></div>'+
  '</div>'+shiftChips+
  '<div id="rqCashBox" class="hidden" style="margin-top:10px">'+
    '<div class="notice"><b>حارس تغطية كاش:</b> لا يتطلب رقماً وظيفياً. الاسم والموقع والوردية مطلوبة، والمبلغ يمكن استكماله لاحقاً من المالية. لن يسمح النظام بتداخل ورديتين لنفس حارس الكاش عند إعادة استخدام سجله.</div>'+
    '<div class="grid2" style="margin-top:8px">'+
      '<div class="field"><label>سجل حارس كاش سابق</label><select id="rqCashWorker">'+cashWorkerOpts+'</select></div>'+
      '<div class="field"><label>اسم حارس الكاش *</label><input id="rqCashName" value="'+esc(r.guard_name||'')+'"></div>'+
      '<div class="field"><label>الجوال — اختياري</label><input id="rqCashMobile" inputmode="numeric" placeholder="إن كان متاحاً"></div>'+
      '<div class="field"><label>آخر 4 من الهوية — اختياري</label><input id="rqCashIdLast4" inputmode="numeric" maxlength="4" value="'+esc(r.source_identity_last4||'')+'" placeholder="إن كانت متاحة"></div>'+
      '<div class="field"><label>مبلغ الكاش — اختياري الآن</label><input id="rqCashAmount" type="number" min="0" step="0.01" placeholder="يستكمل من المالية إذا لم يكن معروفاً"></div>'+
    '</div>'+
  '</div>'+
  '<div id="rqHint" class="notice" style="margin-top:10px">إذا كان الموظف ظاهراً في ورديتين، اختاري «وردية إضافية» أو «تغطية» حسب الواقع. النظام يمنع التداخل الزمني الفعلي.</div>'+
  '<div class="modal-actions"><button id="rqSave" class="btn primary">اعتماد التصحيح</button><button id="rqHR" class="btn secondary">إحالة للموارد البشرية</button><button id="rqMDM" class="btn gold">إحالة لبيانات المواقع</button><button id="rqCancel" class="btn ghost">إلغاء</button></div>'
 );
 if(r.linked_site_code)$('rqSite').value=r.linked_site_code;
 else if(Number(r.site_candidate_count||0)===1&&r.site_code_candidate)$('rqSite').value=r.site_code_candidate;
 document.querySelectorAll('.rqEmpCandidate').forEach(b=>b.onclick=()=>{$('rqEmpRef').value=b.dataset.ref||'';$('rqEmpName').value=b.dataset.name||''});
 document.querySelectorAll('.rqShiftChip').forEach(b=>b.onclick=()=>{$('rqStart').value=b.dataset.start||'';$('rqEnd').value=b.dataset.end||''});
 if($('rqCashWorker'))$('rqCashWorker').onchange=()=>{
   const id=$('rqCashWorker').value;
   const c=cashCandidates.find(x=>x.coverage_worker_id===id);
   if(c&&c.display_name)$('rqCashName').value=c.display_name;
 };
 if(r.same_name_site_rows>1&&r.issue_code!=='ASSIGNMENT_IDENTITY_GAP')$('rqType').value='LINK_EXTRA_SHIFT';
 if(openMode==='cash')$('rqType').value='MARK_CASH_COVERAGE';
 const updateHint=()=>{
   const t=$('rqType').value,h=$('rqHint'),cash=t==='MARK_CASH_COVERAGE';
   $('rqCashBox').classList.toggle('hidden',!cash);
   $('rqEmpSearchBox').classList.toggle('hidden',cash);
   $('rqEmpRefBox').classList.toggle('hidden',cash);
   $('rqEmpNameBox').classList.toggle('hidden',cash);
   if(t==='IGNORE_DUPLICATE')h.textContent='سيتم استبعاد هذا الصف كتكرار مؤكد مع إبقاء أثر المراجعة والمصدر.';
   else if(t==='MARK_CASH_COVERAGE')h.textContent='سيتم التعامل مع الحارس كحارس تغطية كاش مستقل عن قاعدة الموظفين. يجب تحديد بداية ونهاية الوردية، وستبقى الحالة مفتوحة للمراجعة المالية حتى اعتماد بيانات الكاش.';
   else if(t==='LINK_COVERAGE')h.textContent='سيحفظ الصف كتغطية مرتبطة بحارس موظف فعلي. يلزم وقت بداية ونهاية، وتبقى التغطية بانتظار استكمال الحارس/الوردية المغطاة إذا لم تكن محددة.';
   else if(t==='LINK_EXTRA_SHIFT')h.textContent='وردية إضافية صحيحة لنفس الموظف. يجب تحديد وقت البداية والنهاية، وسيتم منع أي تداخل فعلي مع تكليف آخر.';
   else h.textContent='تكليف أساسي. إذا كان الاسم مكرراً في أكثر من صف لن يتم الحفظ دون وقت وردية واضح.';
 };
 $('rqType').onchange=updateHint;updateHint();
 let tm;
 $('rqEmpSearch').oninput=()=>{clearTimeout(tm);tm=setTimeout(async()=>{
   const q=$('rqEmpSearch').value.trim(),box=$('rqEmpSug');
   if(q.length<2){box.classList.add('hidden');return}
   try{
     const d=await fast('searchEmployee',{q},8000);box.innerHTML='';
     (d.rows||[]).slice(0,12).forEach(e=>{
       const x=document.createElement('div');x.className='suggestion';
       x.innerHTML='<b>'+esc(e.full_name)+'</b><div class="sub">'+esc(e.employee_id)+(e.job_title?' · '+esc(e.job_title):'')+'</div>';
       x.onclick=()=>{$('rqEmpRef').value=e.employee_id||'';$('rqEmpName').value=e.full_name||'';box.classList.add('hidden')};
       box.appendChild(x)
     });
     box.classList.toggle('hidden',!(d.rows||[]).length)
   }catch{}
 },220)};
 $('rqCancel').onclick=closeModal;
 const submitResolution=async(type)=>{
   const payload={
     legacy_row_id:r.legacy_row_id,
     issue_code:r.issue_code,
     resolution_type:type||$('rqType').value,
     employee_ref:$('rqEmpRef').value.trim()||null,
     site_code:$('rqSite').value||null,
     shift_start:$('rqStart').value||null,
     shift_end:$('rqEnd').value||null,
     coverage_worker_id:$('rqCashWorker')?.value||null,
     cash_worker_name:$('rqCashName')?.value.trim()||null,
     cash_worker_mobile:$('rqCashMobile')?.value.trim()||null,
     cash_worker_id_last4:$('rqCashIdLast4')?.value.trim()||null,
     cash_amount:$('rqCashAmount')?.value||null
   };
   if(!['IGNORE_DUPLICATE','SEND_HR','SEND_MASTERDATA'].includes(payload.resolution_type)){
     if(!payload.site_code)return toast('اختاري الموقع الصحيح أو أحِيلي الحالة لبيانات المواقع.',true);
     if(payload.resolution_type==='MARK_CASH_COVERAGE'){
       if(!payload.cash_worker_name)return toast('اسم حارس تغطية الكاش مطلوب.',true);
       if(!payload.shift_start||!payload.shift_end)return toast('حددي بداية ونهاية وردية حارس تغطية الكاش لمنع التداخل الزمني.',true);
       if(payload.cash_worker_id_last4&&payload.cash_worker_id_last4.length!==4)return toast('آخر 4 من الهوية يجب أن تكون أربعة أرقام.',true);
     }else{
       if(!payload.employee_ref)return toast('اختاري الموظف الصحيح أو أحِيلي الحالة للموارد البشرية.',true);
       const identityOnly=r.issue_code==='ASSIGNMENT_IDENTITY_GAP'&&payload.resolution_type==='LINK_PRIMARY';
       if(((!identityOnly&&r.same_name_site_rows>1)||['LINK_EXTRA_SHIFT','LINK_COVERAGE'].includes(payload.resolution_type))&&(!payload.shift_start||!payload.shift_end))
         return toast('هذه الحالة متعددة الصفوف/الورديات؛ حددي وقت البداية والنهاية.',true);
     }
   }
   const b=$('rqSave');if(b)b.disabled=true;
   try{
     const d=await fast('resolveReconciliation',{payload},15000);
     closeModal();await gaps();toast(d.message||'تم اعتماد التصحيح')
   }catch(e){toast(e.message,true);if(b)b.disabled=false}
 };
 $('rqSave').onclick=()=>submitResolution();
 $('rqHR').onclick=()=>submitResolution('SEND_HR');
 $('rqMDM').onclick=()=>submitResolution('SEND_MASTERDATA');
}



function wireTimeConflictActions(){
 document.querySelectorAll('.conflictOpenAssignment').forEach(b=>b.onclick=async()=>{
   const id=b.dataset.a;if(!id)return;
   S.tab='month';tabUI();await month();await loadEmployee(id);
 });
}

function wireMultiReconActions(){
 document.querySelectorAll('.multiReconOpen').forEach(b=>b.onclick=()=>{
   const g=(S.multiRecon?.groups||[]).find(x=>x.group_key===b.dataset.group);
   if(g)multiAssignmentModal(g);
 });
}

function shiftDurationHours(start,end){
 if(!start||!end)return null;
 const a=start.split(':').map(Number),b=end.split(':').map(Number);
 if(a.length<2||b.length<2)return null;
 let x=a[0]*60+a[1],y=b[0]*60+b[1];if(y<=x)y+=1440;
 return (y-x)/60;
}

function multiAssignmentModal(g){
 const rows=g.rows||[];
 const rowCards=rows.map((r,i)=>{
   const sg=r.shift_suggestion||{};
   let start=sg.ok?sg.start_time:'',end=sg.ok?sg.end_time:'';
   const dur=shiftDurationHours(start,end);
   const suspicious=dur!==null&&dur>16;
   if(suspicious){start='';end=''}
   const sourceTime=r.shift_text||'غير محدد';
   return '<div class="card" style="padding:11px;margin-top:8px">'+
     '<div class="guardMain"><div><b>صف '+esc(r.source_row)+'</b><div class="sub">'+esc(sourceTime)+(r.notes?' · '+esc(r.notes):'')+'</div></div><span class="pill">'+Number(r.working_dates||0)+' يوم عمل</span></div>'+
     (suspicious?'<div class="notice" style="margin:7px 0"><b>يحتاج تصحيحاً:</b> قراءة الوقت من المصدر تنتج مدة '+dur.toFixed(1)+' ساعة؛ لم يتم اعتمادها تلقائياً.</div>':'')+
     '<div class="grid2" style="margin-top:8px"><div class="field"><label>بداية الوردية</label><input class="maStart" data-row="'+esc(r.legacy_row_id)+'" type="time" value="'+esc(start)+'"></div>'+
     '<div class="field"><label>نهاية الوردية</label><input class="maEnd" data-row="'+esc(r.legacy_row_id)+'" type="time" value="'+esc(end)+'"></div></div>'+
   '</div>';
 }).join('');
 let rowOptions=rows.map(r=>'<option value="'+esc(r.legacy_row_id)+'">صف '+esc(r.source_row)+' — '+esc(r.shift_text||r.notes||'بدون وصف')+'</option>').join('');
 modal(
  '<h3>معالجة الورديات / التغطية</h3>'+
  '<div class="notice"><b>'+esc(g.guard_name||'')+'</b> — '+esc(g.raw_site||'')+'<br>المصدر: '+esc(g.source_file_name||'')+'<br>ظهر الموظف في أكثر من صف. النظام لن يدمج الصفوف تلقائياً حتى يتم تحديد معناها التشغيلي.</div>'+
  '<div class="field"><label>ما معنى ظهور الصفوف المتعددة؟</label><select id="maType"><option value="INDEPENDENT_SHIFTS">ورديات مستقلة صحيحة</option><option value="COVERAGE">أحد الصفوف تغطية</option><option value="DUPLICATE">صف مكرر بالخطأ</option></select></div>'+
  '<div id="maCoverageBox" class="field hidden" style="margin-top:9px"><label>أي صف يمثل التغطية؟</label><select id="maCoverageRow">'+rowOptions+'</select></div>'+
  '<div id="maKeepBox" class="field hidden" style="margin-top:9px"><label>أي صف هو السجل الصحيح الذي سيبقى؟</label><select id="maKeepRow">'+rowOptions+'</select></div>'+
  '<div id="maTimeRows">'+rowCards+'</div>'+
  '<div id="maRule" class="notice" style="margin-top:10px">سيتم فصل كل صف إلى وردية زمنية مستقلة. يمنع الحفظ إذا تداخلت الفترات فعلياً في نفس التاريخ.</div>'+
  '<div class="modal-actions"><button id="maSave" class="btn primary">اعتماد المعالجة</button><button id="maCancel" class="btn ghost">إلغاء</button></div>'
 );
 const sync=()=>{
   const t=$('maType').value;
   $('maCoverageBox').classList.toggle('hidden',t!=='COVERAGE');
   $('maKeepBox').classList.toggle('hidden',t!=='DUPLICATE');
   $('maTimeRows').classList.toggle('hidden',t==='DUPLICATE');
   $('maRule').textContent=t==='DUPLICATE'
     ?'اختاري الصف الصحيح فقط. ستستبعد الصفوف الأخرى كتكرار مع الاحتفاظ بأثر المصدر والمراجعة.'
     :t==='COVERAGE'
       ?'حددي صف التغطية وأوقات كل وردية. التغطية ستبقى مفتوحة حتى تحديد الحارس/الوردية المغطاة إذا لم تكن موجودة في المصدر.'
       :'سيتم فصل الصفوف إلى ورديات مستقلة. نهاية وردية عند نفس لحظة بداية الوردية التالية لا تعد تداخلاً.';
 };
 $('maType').onchange=sync;sync();$('maCancel').onclick=closeModal;
 $('maSave').onclick=async()=>{
   const type=$('maType').value;
   const payload={
     group_key:g.group_key,
     resolution_type:type,
     keep_legacy_row_id:type==='DUPLICATE'?$('maKeepRow').value:null,
     coverage_legacy_row_id:type==='COVERAGE'?$('maCoverageRow').value:null,
     row_times:[]
   };
   if(type!=='DUPLICATE'){
     let bad=false;
     rows.forEach(r=>{
       const st=document.querySelector('.maStart[data-row="'+r.legacy_row_id+'"]')?.value||'';
       const en=document.querySelector('.maEnd[data-row="'+r.legacy_row_id+'"]')?.value||'';
       if(!st||!en)bad=true;
       payload.row_times.push({legacy_row_id:r.legacy_row_id,start_time:st,end_time:en});
     });
     if(bad)return toast('حددي بداية ونهاية الوردية لكل صف قبل الاعتماد.',true);
   }
   const b=$('maSave');b.disabled=true;
   try{
     const d=await fast('resolveMultiAssignment',{payload},18000);
     closeModal();await gaps();toast(d.message||'تم اعتماد معالجة الورديات')
   }catch(e){toast(e.message,true);b.disabled=false}
 };
}


function dayModal(e,d,done){
 if(!e)return;
 const isCashGuard=e.assignment_type==='CASH_COVERAGE';
 let st='';
 Object.entries(STATUS).forEach(x=>st+='<option value="'+x[0]+'" '+(e.status===x[0]?'selected':'')+'>'+x[1]+'</option>');
 modal('<h3>'+esc(e.full_name)+' — '+d+'</h3>'+
 (isCashGuard?'<div class="notice"><b>حارس تغطية كاش:</b> هذا السجل يمثل الحارس المنفذ نفسه، لذلك لا يطلب حارساً بديلاً. عند حالة «تغطية كاش» يكفي استكمال المبلغ والملاحظة.</div>':'')+
 '<div class="grid2"><div class="field"><label>حالة الحضور *</label><select id="dStatus">'+st+'</select></div><div class="field"><label>الوردية</label><input id="dShift" value="'+esc(e.shift_code||'')+'"></div></div>'+
 '<div id="coverageFields" class="hidden"><div class="section-title">بيانات التغطية</div><div class="grid2">'+
 '<div class="field" id="replNameBox"><label>اسم الحارس البديل</label><input id="replName" value="'+esc(e.replacement_name||'')+'"></div>'+
 '<div class="field" id="replRefBox"><label>الرقم الوظيفي للحارس البديل</label><input id="replRef" value="'+esc(e.replacement_employee_ref||'')+'"></div>'+
 '<div class="field" id="cashBox"><label>مبلغ تغطية الكاش</label><input id="cash" type="number" min="0" step="0.01" value="'+(e.cash_amount??'')+'"></div></div></div>'+
 '<div class="field" style="margin-top:10px"><label>ملاحظات التشغيل</label><textarea id="dNote" rows="2">'+esc(e.note||'')+'</textarea></div>'+
 '<div class="modal-actions"><button id="saveD" class="btn primary">حفظ</button><button id="cancelD" class="btn ghost">إلغاء</button></div>');
 const cov=()=>{
   const s=$('dStatus').value,on=s==='SUB'||s==='CASH';
   $('coverageFields').classList.toggle('hidden',!on);
   $('cashBox').classList.toggle('hidden',s!=='CASH');
   $('replNameBox').classList.toggle('hidden',isCashGuard);
   $('replRefBox').classList.toggle('hidden',isCashGuard);
 };
 $('dStatus').onchange=cov;cov();$('cancelD').onclick=closeModal;
 $('saveD').onclick=async()=>{
  const p={
   assignment_id:e.assignment_id,date:d,status:$('dStatus').value,shift_code:$('dShift').value||null,
   note:$('dNote').value.trim()||null,
   replacement_name:isCashGuard?null:($('replName')?.value.trim()||null),
   replacement_employee_ref:isCashGuard?null:($('replRef')?.value.trim()||null),
   covered_employee_name:isCashGuard?null:(e.full_name||null),
   covered_employee_ref:isCashGuard?null:(e.employee_ref||null),
   cash_amount:$('cash')?.value||null
  };
  $('saveD').disabled=true;
  try{await fast('saveDay',{payload:p},10000);Object.assign(e,p);classifyLocalException(e);closeModal();done&&done();if(d===work())refreshDay(false);toast('تم الحفظ')}
  catch(x){toast(x.message,true);$('saveD').disabled=false}
 };
}

function assignmentModal(a=null){
 if(!S.ctx)return toast('انتظري اكتمال التحميل',true);
 let opts='<option value="">اختاري الموقع</option>';
 (S.ctx.sites||[]).forEach(s=>opts+='<option value="'+esc(s.site_code)+'" '+(a?.site_code===s.site_code?'selected':'')+'>'+esc((s.client_name||'')+' — '+(s.project_name||'')+' — '+s.site_name)+'</option>');
 let sh='';SHIFTS.forEach(x=>sh+='<option value="'+x[0]+'" '+(a?.shift_code===x[0]?'selected':'')+'>'+x[1]+'</option>');
 modal(
 '<h3>'+(a?'تعديل توزيع الحارس':'توزيع حارس على موقع')+'</h3>'+
 '<div class="notice"><b>توزيع الحراس:</b> هذه الشاشة لتوزيع حارس على موقع ووردية، وليست لإنشاء ملف موظف جديد. بيانات الهوية والجوال والآيبان والراتب تبقى في ملف الموظف، بينما يعتمد التايم شيت هنا على بيانات الموقع والدوام والوردية.</div>'+
 '<div class="field" style="margin-top:10px"><label>اختيار الحارس من قاعدة الموظفين</label><input id="empSearch" placeholder="الاسم أو الرقم الوظيفي"><div id="empSug" class="suggestions hidden"></div></div>'+
 '<div class="grid2" style="margin-top:10px"><div class="field"><label>الرقم الوظيفي</label><input id="empRef" value="'+esc(a?.employee_ref||'')+'" placeholder="EMP_ID"></div><div class="field"><label>اسم الحارس *</label><input id="empName" value="'+esc(a?.full_name||'')+'"></div></div>'+
 '<div class="grid2" style="margin-top:10px"><div class="field"><label>المسمى الوظيفي</label><input id="jobTitle" value="'+esc(a?.job_title||'حارس أمن')+'" placeholder="مثال: حارس أمن"></div><div class="field"><label>الموقع *</label><select id="siteSel">'+opts+'</select></div></div>'+
 '<div id="siteContextHint" class="sub" style="margin-top:6px"></div>'+
 '<div id="empSourceHint" class="sub" style="margin-top:6px"></div>'+
 '<div id="empOpsHint" class="notice hidden" style="margin-top:8px"></div>'+
 '<div style="margin-top:12px;font-weight:900">بيانات الدوام بالموقع</div>'+
 '<div class="grid2" style="margin-top:8px">'+
   '<div class="field"><label>المشرف الميداني</label><input id="supervisorName" value="'+esc(a?.supervisor_name||'')+'" placeholder="اسم المشرف"></div>'+
   '<div class="field"><label>نوع التوزيع</label><select id="atype"><option value="PRIMARY">حارس ثابت</option><option value="RELIEF_FIXED">بديل راحات</option><option value="TEMP_COVERAGE">تغطية مؤقتة</option><option value="EXTRA_SHIFT">وردية إضافية</option><option value="OTHER">تكليف آخر</option></select></div>'+
   '<div class="field"><label>نقطة الحراسة</label><input id="workPointName" value="'+esc(a?.work_point_name||'')+'" placeholder="مثال: بوابة رئيسية، مدخل موظفين، مبنى إداري"></div>'+
   '<div class="field"><label>الراحة الأسبوعية</label><input id="weeklyOffText" value="'+esc(a?.weekly_off_text||'')+'" placeholder="مثال: الجمعة أو الخميس والجمعة"></div>'+
   '<div class="field"><label>أيام العمل أسبوعياً</label><input id="workDays" type="number" min="0" max="7" step="0.5" value="'+esc(a?.work_days_per_week??'')+'" placeholder="كما هو بالمصدر — يترك فارغاً إذا لم يرد"></div>'+
   '<div class="field"><label>ساعات العمل اليومية</label><input id="dailyHours" type="number" min="1" max="24" step="0.5" value="'+esc(a?.daily_hours??'')+'" placeholder="مثال: 8 أو 12 — يترك فارغاً إذا لم يرد بالمصدر"></div>'+
   '<div class="field"><label>الوردية</label><select id="shift">'+sh+'</select></div>'+
   '<div class="field"><label>وصف الوردية</label><input id="shiftDetail" value="'+esc(a?.shift_detail||'')+'" placeholder="مثال: صباح / مساء / بديل راحات"></div>'+
   '<div class="field"><label>بداية الوردية</label><input id="shiftStartText" type="time" value="'+esc(String(a?.shift_start_time||a?.shift_start_text||'').slice(0,5).match(/^\\d{2}:\\d{2}$/)?.[0]||'')+'"></div>'+
   '<div class="field"><label>نهاية الوردية</label><input id="shiftEndText" type="time" value="'+esc(String(a?.shift_end_time||a?.shift_end_text||'').slice(0,5).match(/^\\d{2}:\\d{2}$/)?.[0]||'')+'"></div>'+
   '<div class="field"><label>تاريخ المباشرة بالموقع</label><input id="startDate" type="date" value="'+String(a?.start_date||S.ctx.cycle_start).slice(0,10)+'"></div>'+
   '<div class="field"><label>تاريخ نهاية التوزيع</label><input id="endDate" type="date" value="'+String(a?.end_date||S.ctx.cycle_end).slice(0,10)+'"></div>'+
 '</div>'+
 '<div id="atypeHint" class="notice hidden" style="margin-top:10px"></div>'+
 '<div class="field" style="margin-top:10px"><label>ملاحظات التشغيل</label><textarea id="assignmentNotes" rows="2" placeholder="مباشرة، نقل، استثناء تكليف، أو ملاحظة تشغيلية">'+esc(a?.notes||'')+'</textarea></div>'+
 '<div class="sub" style="margin-top:8px">تغطية الكاش أو التغطية اليومية تسجل كحالة تشغيلية بتاريخها وحارسها البديل، ولا تنشأ كسجل موظف باسم «التغطية».</div>'+
 '<div class="modal-actions"><button id="saveA" class="btn primary">حفظ التوزيع</button><button id="cancelA" class="btn ghost">إلغاء</button></div>'
 );
 if(a)$('atype').value=a.assignment_type||'PRIMARY';
 let selectedEmployeeStatus='';
 let selectedEvidence=a?{
   source_file_name:a.source_file_name||null,source_sheet:a.source_sheet||null,
   source_row:a.source_row||null,source_hidden_row:a.source_hidden_row??null,
   contract_status:a.contract_status_snapshot||null,
   insurance_status:a.insurance_status_snapshot||null
 }:null;
 const inferTimesheetShift=(txt,hours)=>{
   const t=String(txt||'').toLowerCase(),h=Number(hours||0);
   if(/اخر|آخر|ليل/.test(t))return h>=11?'N12':'N8';
   if(/مساء|عصر/.test(t))return h>=11?'N12':'E8';
   if(/صباح|نهار/.test(t))return h>=11?'D12':'D8';
   return t?'OTHER':'';
 };
 const showSiteContext=()=>{
   const s=(S.ctx.sites||[]).find(x=>x.site_code===$('siteSel').value);
   $('siteContextHint').textContent=s?'العميل: '+(s.client_name||'غير محدد')+' · المشروع: '+(s.project_name||'غير محدد')+' · الموقع: '+(s.site_name||''):'';
 };
 const showTypeHint=()=>{
   const t=$('atype').value,h=$('atypeHint');
   if(t==='TEMP_COVERAGE'){
     h.textContent='التغطية المؤقتة مخصصة لحارس فعلي يغطي الموقع لفترة محددة. يلزم الرقم الوظيفي وتاريخ البداية والنهاية. تغطية اليوم الواحد وتغطية الكاش تسجل من شاشة الحضور اليومي.';
     h.classList.remove('hidden');
   }else if(t==='RELIEF_FIXED'){
     h.textContent='بديل الراحات حارس فعلي يغطي أيام الراحة بشكل متكرر. إذا لم يحدد المصدر أياماً أو ساعات ثابتة فلا يتم افتراضها.';
     h.classList.remove('hidden');
   }else if(t==='EXTRA_SHIFT'){
     h.textContent='الوردية الإضافية تعني أن الموظف نفسه يعمل فترة زمنية ثانية. يلزم تحديد بداية ونهاية الوردية، ويمنع النظام أي تداخل زمني.';
     h.classList.remove('hidden');
   }else h.classList.add('hidden');
 };
 $('siteSel').onchange=showSiteContext;$('atype').onchange=showTypeHint;showSiteContext();showTypeHint();
 let tm;
 $('empSearch').oninput=()=>{clearTimeout(tm);tm=setTimeout(async()=>{
   const q=$('empSearch').value.trim();
   if(q.length<2)return $('empSug').classList.add('hidden');
   try{
     const d=await fast('searchEmployee',{q},8000),b=$('empSug');b.innerHTML='';
     (d.rows||[]).forEach(e=>{
       const x=document.createElement('div');x.className='suggestion';
       const src=e.timesheet_source_file?' · مصدر تايم شيت متاح':'';
       x.innerHTML='<b>'+esc(e.full_name)+'</b><div class="sub">'+esc(e.employee_id)+(e.job_title?' · '+esc(e.job_title):'')+(e.default_site_name?' · '+esc(e.default_site_name):'')+src+'</div>';
       x.onclick=()=>{
         $('empRef').value=e.employee_id||'';
         $('empName').value=e.full_name||'';
         $('jobTitle').value=e.job_title||'حارس أمن';
         if(e.site_ref&&[...$('siteSel').options].some(o=>o.value===e.site_ref))$('siteSel').value=e.site_ref;
         if(e.last_supervisor_name)$('supervisorName').value=e.last_supervisor_name;
         if(e.last_work_point_name)$('workPointName').value=e.last_work_point_name;
         if(e.last_weekly_off_text)$('weeklyOffText').value=e.last_weekly_off_text;
         if(e.last_work_days_per_week!==null&&e.last_work_days_per_week!==undefined&&e.last_work_days_per_week!=='')$('workDays').value=e.last_work_days_per_week;
         if(e.last_daily_hours!==null&&e.last_daily_hours!==undefined&&e.last_daily_hours!=='')$('dailyHours').value=e.last_daily_hours;
         const inferred=e.last_shift_code||inferTimesheetShift(e.last_shift_detail,e.last_daily_hours);
         if(inferred&&[...$('shift').options].some(o=>o.value===inferred))$('shift').value=inferred;
         if(e.last_shift_detail)$('shiftDetail').value=e.last_shift_detail;
         if(e.last_shift_start_text)$('shiftStartText').value=e.last_shift_start_text;
         if(e.last_shift_end_text)$('shiftEndText').value=e.last_shift_end_text;
         if(e.last_assignment_type&&[...$('atype').options].some(o=>o.value===e.last_assignment_type))$('atype').value=e.last_assignment_type;
         selectedEmployeeStatus=e.employee_status||'';
         selectedEvidence=e.timesheet_source_file?{
           source_file_id:e.timesheet_source_file_id||null,
           source_file_name:e.timesheet_source_file||null,
           source_sheet:e.timesheet_source_sheet||null,
           source_row:e.timesheet_source_row||null,
           source_hidden_row:e.timesheet_hidden_row??null,
           source_group:e.timesheet_source_group||null,
           evidence_quality:e.timesheet_evidence_quality||null,
           contract_status:e.last_contract_status||null,
           insurance_status:e.last_insurance_status||null,
           direct_start_text:e.timesheet_direct_start_text||null,
           source_notes_text:e.timesheet_source_notes||null
         }:null;
         const source=e.timesheet_source_file
           ?'المصدر التشغيلي: '+e.timesheet_source_file+' / '+(e.timesheet_source_sheet||'')+' / صف '+(e.timesheet_source_row||'')+(e.timesheet_hidden_row?' (صف مخفي وتمت قراءته)':'')+(e.source_has_material_hidden_columns?' · الملف يحتوي أعمدة مخفية تشغيلية تمت مراعاتها':'')
           :'بيانات التكليف المرجعية: '+[e.default_client_name,e.default_project_name,e.default_site_name].filter(Boolean).join(' — ');
         $('empSourceHint').textContent=(selectedEmployeeStatus?'حالة الموظف: '+selectedEmployeeStatus+' · ':'')+source;
         $('empSourceHint').style.color=/منتهي|مستبعد/.test(selectedEmployeeStatus)?'var(--bad)':'';
         const ops=[
           e.last_contract_status?'حالة العقد: '+e.last_contract_status:'',
           e.last_insurance_status?'التأمينات: '+e.last_insurance_status:'',
           e.timesheet_direct_start_text?'المباشرة بالمصدر: '+e.timesheet_direct_start_text:'',
           e.timesheet_source_notes?'ملاحظة المصدر: '+e.timesheet_source_notes:''
         ].filter(Boolean);
         $('empOpsHint').textContent=ops.join(' · ');
         $('empOpsHint').classList.toggle('hidden',!ops.length);
         showSiteContext();showTypeHint();b.classList.add('hidden')
       };
       b.appendChild(x)
     });
     b.classList.toggle('hidden',!(d.rows||[]).length)
   }catch{}
 },250)};
 $('cancelA').onclick=closeModal;
 $('saveA').onclick=async()=>{
   const p={
    id:a?.id||null,period:period(),
    employee_ref:$('empRef').value.trim()||null,
    full_name:$('empName').value.trim(),
    job_title:$('jobTitle').value.trim()||'حارس أمن',
    site_code:$('siteSel').value||null,
    work_point_name:$('workPointName').value.trim()||null,
    supervisor_name:$('supervisorName').value.trim()||null,
    weekly_off_text:$('weeklyOffText').value.trim()||null,
    work_days_per_week:$('workDays').value||null,
    daily_hours:$('dailyHours').value||null,
    shift_code:$('shift').value||null,
    shift_detail:$('shiftDetail').value.trim()||null,
    shift_start_text:$('shiftStartText').value.trim()||null,
    shift_end_text:$('shiftEndText').value.trim()||null,
    assignment_type:$('atype').value,
    start_date:$('startDate').value,
    end_date:$('endDate').value,
    notes:$('assignmentNotes').value.trim()||null,
    contract_status_snapshot:selectedEvidence?.contract_status||a?.contract_status_snapshot||null,
    insurance_status_snapshot:selectedEvidence?.insurance_status||a?.insurance_status_snapshot||null,
    source_file_name:selectedEvidence?.source_file_name||a?.source_file_name||null,
    source_sheet:selectedEvidence?.source_sheet||a?.source_sheet||null,
    source_row:selectedEvidence?.source_row||a?.source_row||null,
    source_hidden_row:selectedEvidence?.source_hidden_row??a?.source_hidden_row??null,
    source_snapshot:selectedEvidence||null
   };
   if(!p.full_name)return toast('اسم الموظف مطلوب',true);
   const cleanName=p.full_name.replace(/\s+/g,' ').trim();
   if(/^(التغطية|التغطيه|تغطية|تغطيه|تغطية كاش|تغطيه كاش|بديل)$/i.test(cleanName)
      ||(/[0-9٠-٩۰-۹]/.test(cleanName)&&/(فرد|افراد|أفراد|شخص)/.test(cleanName)))
     return toast('هذا السطر ليس حارساً فعلياً. صفوف التغطية والمجاميع لا تنشأ كسجلات موظفين.',true);
   if(!p.site_code)return toast('اختيار موقع العمل مطلوب',true);
   if(!a&&/منتهي|مستبعد/.test(selectedEmployeeStatus)&&p.assignment_type!=='NEW_HIRE')
     return toast('حالة الموظف في قاعدة الموظفين '+selectedEmployeeStatus+'. لا ينشأ له تكليف جديد قبل معالجة حالته أو اختيار «موظف جديد» عند إعادة التعيين.',true);
   const sourceBacked=!!selectedEvidence?.source_file_name;
   if(!a&&!sourceBacked&&['PRIMARY','NEW_HIRE'].includes(p.assignment_type)&&(!p.work_days_per_week||!p.daily_hours))
     return toast('للتكليف اليدوي الجديد حددي أيام العمل وساعات العمل. إذا كان التكليف موثقاً في ملف تايم شيت فيسمح بحفظ النقص كفجوة بيانات بدلاً من اختلاق قيمة.',true);
   if(!a&&!sourceBacked&&['PRIMARY','NEW_HIRE'].includes(p.assignment_type)&&!p.shift_code&&!p.shift_detail&&!p.shift_start_text)
     return toast('للتكليف اليدوي الجديد حددي الوردية أو وقت بدايتها.',true);
   if(p.assignment_type==='TEMP_COVERAGE'&&!p.employee_ref)
     return toast('التغطية المؤقتة يجب أن ترتبط بحارس فعلي ذي رقم وظيفي.',true);
   if(['TEMP_COVERAGE','EXTRA_SHIFT'].includes(p.assignment_type)&&(!p.shift_start_text||!p.shift_end_text))
     return toast('التغطية أو الوردية الإضافية تتطلب وقت بداية ونهاية واضحاً.',true);
   if(p.start_date&&p.end_date&&p.start_date>p.end_date)return toast('تاريخ البداية يجب أن يسبق تاريخ النهاية',true);
   const btn=$('saveA');btn.disabled=true;
   try{
     if(p.employee_ref&&p.shift_start_text&&p.shift_end_text&&p.start_date&&p.end_date){
       const cf=await fast('assignmentTimeConflicts',{
         employee_ref:p.employee_ref,start_date:p.start_date,end_date:p.end_date,
         start_time:p.shift_start_text,end_time:p.shift_end_text,
         exclude_assignment_id:a?.id||null
       },12000);
       if(Number(cf.overlap_count||0)>0){
         btn.disabled=false;
         return toast('لا يمكن الحفظ: يوجد تداخل زمني في '+Number(cf.conflict_dates||0)+' يوم/أيام مع تكليف قائم. عدلي الوقت أو صححي نوع التوزيع.',true);
       }
     }
     await fast('saveAssignment',{payload:p},10000);closeModal();await bootstrap();toast('تم حفظ توزيع الحارس')
   }
   catch(e){toast(e.message,true);btn.disabled=false}
 }
}

async function exportCsv(){if(!S.ctx)return toast('انتظري اكتمال التحميل',true);const b=$('exportBtn'),o=b.textContent;b.disabled=true;b.textContent='...';try{const d=await fast('export',{period:period()},20000),u=URL.createObjectURL(new Blob(['\ufeff'+(d.csv||'')],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download=d.filename||'arkanat-prep.csv';a.click();URL.revokeObjectURL(u);toast('تم تجهيز CSV')}catch(e){toast(e.message,true)}finally{b.disabled=false;b.textContent=o}}

$('loginBtn').onclick=async()=>{const national_id=$('opId').value.trim(),mobile=$('opMobile').value.trim(),region=$('opRegion').value;if(!/^\d{10}$/.test(national_id)||!/^05\d{8}$/.test(mobile)||!region)return toast('تحققي من الهوية والجوال والمنطقة',true);$('loginBtn').disabled=true;try{const d=await login({national_id,mobile,region});S.token=d.token;S.region=d.region_code||region;localStorage.setItem('arkPrepToken',S.token);localStorage.setItem('arkPrepRegion',S.region);showApp();await bootstrap()}catch(e){toast(e.message,true)}finally{$('loginBtn').disabled=false}};
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{S.tab=t.dataset.tab;S.site=null;S.siteData=null;render()});
$('addBtn').onclick=()=>assignmentModal();
$('period').onchange=async()=>{$('workDate').value=period()+'-01';S.employee=null;await bootstrap()};
$('workDate').onchange=async()=>{normalizeWorkDate();S.site=null;S.siteData=null;S.issues=null;await refreshDay(true)};
$('logoutBtn').onclick=()=>{localStorage.removeItem('arkPrepToken');localStorage.removeItem('arkPrepRegion');for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k&&k.startsWith('arkPrepCache:'))sessionStorage.removeItem(k)}S.token='';S.region='';S.ctx=null;S.day=null;showLogin()};
$('printBtn').onclick=()=>{if(!S.ctx)return toast('انتظري اكتمال التحميل',true);if(window.openClientPrint)return window.openClientPrint();toast('خدمة الطباعة ما زالت قيد التهيئة',true)};
$('submitBtn').onclick=async()=>{
 if(!S.ctx)return toast('انتظري اكتمال التحميل',true);
 try{
   const [ord,rd]=await Promise.all([
     fast('operationsReadiness',{period:period()},10000),
     fast('readiness',{period:period()},10000)
   ]);
   S.opsReadiness=ord;S.readiness=rd;

   if(ord.status==='BLOCKED'){
     S.tab='gaps';tabUI();await gaps();
     return toast('تبقى على العمليات '+Number(ord.blocker_count||0)+' حالة تحتاج قراراً قبل التسليم. تم فتح الاستثناءات.',true);
   }

   if(rd.status==='READY'){
     if(!await confirmUI('الإقفال النهائي للدورة','اكتملت مسؤولية العمليات وجميع مسارات البيانات الأخرى. سيتم إقفال دورة '+monthLabel(period())+' نهائياً.','إقفال نهائي'))return;
     const d=await fast('submit',{period:period()},12000);
     toast(d.message||'تم الإقفال النهائي');await refreshDay(true);return;
   }

   const hr=Number(ord.hr_link_pending||0),other=Math.max(0,Number(rd.blocker_count||0)-hr);
   const body='مسؤولية العمليات مكتملة. سيتم اعتماد وتسليم أعمال العمليات لهذه الدورة، بينما يبقى الإقفال النهائي بانتظار المسارات المختصة.'+
     (hr?'<br><b>ربط موظفين لدى الموارد البشرية:</b> '+hr:'')+
     (other?'<br><b>موانع أخرى خارج الإقفال التشغيلي:</b> '+other:'');
   if(!await confirmUI('اعتماد وتسليم أعمال العمليات',body,'اعتماد وتسليم'))return;
   const d=await fast('operationsHandoff',{period:period()},12000);
   toast(d.message||'تم تسليم أعمال العمليات');
   S.tab='gaps';tabUI();await gaps();
 }catch(e){toast(e.message,true)}
};
$('exportBtn').onclick=exportCsv;

const d=ry();initPeriodOptions(d.slice(0,7));$('workDate').value=d;syncContextUi();
if(S.token){showApp();bootstrap()}else showLogin();
