
(function(){
const API='https://dbxvfrkkocfwjumvoaha.supabase.co/functions/v1/arkanat-prep-fast';
const STATUS_PRINT={P:'P',OFF:'OFF',A:'A',T:'T',AL:'AL',SK:'SK',S:'S',W:'W',R:'R',O:'O',SUB:'C',CASH:'C',OTHER:'-'};
const CP={sites:[],guards:[],coverageEvents:[],site:null,filename:'',mode:'client',period:'',ctx:null,periods:[]};
const $p=function(id){return document.getElementById(id)};
const escp=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]})};
const safeName=function(s){return String(s||'').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim()};
const cleanDate=function(x){return String(x||'').slice(0,10)};
const clientKey=function(s){return s.client_name||'غير محدد'};
const projectKey=function(s){return s.project_name||'بدون مشروع'};
const uniq=function(arr){return Array.from(new Set(arr)).sort(function(a,b){return String(a).localeCompare(String(b),'ar')})};

function ensureShell(){
 if($p('clientPrintShell'))return;
 const root=document.createElement('div');
 root.id='clientPrintShell';root.className='client-print-shell';root.setAttribute('aria-hidden','true');
 root.innerHTML='<div class="cp-toolbar"><div class="cp-toolbar-in">'+
 '<div id="cpCycle" class="cp-cycle"></div>'+ '<div class="cp-field"><label id="cpPeriodLabel">الشهر للطباعة</label><select id="cpPeriod"></select></div>'+
 '<div class="cp-field" style="grid-column:1/-1"><label>نوع التايم شيت</label><div class="cp-mode"><button id="cpModeClient" class="active">تايم شيت العميل</button><button id="cpModeInternal">التايم شيت الداخلي</button></div><div id="cpModeNote" class="cp-mode-note">نسخة مبسطة لإثبات الحضور والتشغيل واعتماد العميل، ولا تعرض التفاصيل المالية أو ملاحظات العمل الداخلية.</div></div>'+
 '<div class="cp-field"><label>العميل</label><select id="cpClient"></select></div>'+
 '<div class="cp-field"><label>المشروع</label><select id="cpProject"></select></div>'+
 '<div class="cp-field"><label>الموقع</label><select id="cpSite"></select></div>'+
 '<div class="cp-actions"><button id="cpClose" class="cp-btn cp-btn-ghost">إغلاق</button><button id="cpPrint" class="cp-btn cp-btn-primary" disabled>طباعة / حفظ PDF</button></div>'+
 '<div id="cpProgress" class="cp-progress"></div></div></div>'+
 '<div id="cpNotice" class="cp-notice" style="display:none"></div>'+
 '<div id="cpStage" class="cp-stage"><div class="cp-empty"><div><b>اختاري العميل ثم المشروع ثم الموقع</b><div style="margin-top:7px">ثم اختاري نسخة العميل أو النسخة الداخلية حسب الاستخدام.</div></div></div></div>';
 document.body.appendChild(root);
 $p('cpClose').onclick=closeClientPrint;
 $p('cpPeriod').onchange=function(){loadPrintPeriod($p('cpPeriod').value)};
 $p('cpClient').onchange=function(){fillProjects()};
 $p('cpProject').onchange=function(){fillSites()};
 $p('cpSite').onchange=loadSelectedSite;
 $p('cpPrint').onclick=printReport;
 $p('cpModeClient').onclick=function(){setPrintMode('client')};
 $p('cpModeInternal').onclick=function(){setPrintMode('internal')};
}
async function setPrintMode(mode){
 const next=mode==='internal'?'internal':'client';
 if(CP.mode===next)return;
 const prefer=$p('cpSite')&&$p('cpSite').value||'';
 CP.mode=next;
 $p('cpModeClient').classList.toggle('active',CP.mode==='client');
 $p('cpModeInternal').classList.toggle('active',CP.mode==='internal');
 $p('cpPeriodLabel').textContent=CP.mode==='client'?'شهر العميل للطباعة':'دورة التحضير الداخلية للطباعة';
 $p('cpModeNote').textContent=CP.mode==='client'
  ?'تايم شيت العميل يغطي الشهر الميلادي كاملاً من يوم 1 حتى آخر يوم في الشهر، ولا يعرض التفاصيل المالية أو ملاحظات العمل الداخلية.'
  :'التايم شيت الداخلي يتبع دورة العمليات والموارد والمالية المعتمدة، ويعرض الاستثناءات والتغطيات والأثر التشغيلي والمالي.';
 if(CP.period)await loadPrintPeriod(CP.period,prefer); else emptyStage();
}


async function api(action,payload,timeout){
 payload=payload||{};timeout=timeout||15000;
 const token=localStorage.getItem('arkPrepToken')||'';
 if(!token)throw new Error('سجلي الدخول إلى التحضير أولاً.');
 const ctrl=new AbortController(),tm=setTimeout(function(){ctrl.abort()},timeout);
 try{
  const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.assign({action:action,token:token},payload)),signal:ctrl.signal});
  const d=await r.json();
  if(!r.ok||d&&d.ok===false)throw new Error(d&&((d.message)||(d.code))||'تعذر تحميل بيانات الكشف');
  return d;
 }catch(e){
  if(e&&e.name==='AbortError')throw new Error('تأخر تجهيز الكشف. أعيدي المحاولة.');
  throw e;
 }finally{clearTimeout(tm)}
}

function monthName(p){
 const z=String(p).split('-').map(Number);
 return new Intl.DateTimeFormat('ar-SA-u-ca-gregory',{month:'long',year:'numeric'}).format(new Date(z[0],z[1]-1,1));
}
function fmtDate(x){const z=String(x).split('-');return z[2]+'-'+z[1]+'-'+z[0]}
function dateList(start,end){
 const out=[],d=new Date(start+'T12:00:00'),z=new Date(end+'T12:00:00');
 while(d<=z&&out.length<40){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1)}
 return out;
}
function cycleContext(){
 if(CP.ctx&&CP.period){
  return {period:CP.period,region:CP.ctx.region_name||'',start:CP.ctx.cycle_start,end:CP.ctx.cycle_end};
 }
 try{
  if(typeof S!=='undefined'&&S.ctx){
   return {period:document.getElementById('period')&&document.getElementById('period').value||S.ctx.period,region:S.ctx.region_name,start:S.ctx.cycle_start,end:S.ctx.cycle_end};
  }
 }catch(e){}
 const p=document.getElementById('period')&&document.getElementById('period').value||new Date().toISOString().slice(0,7);
 return {period:p,region:'',start:p+'-01',end:p+'-28'};
}
function periodStateLabel(s){
 return s==='current'?'الحالية':s==='future'?'قادمة / للتجهيز':'سابقة';
}
function periodOptionText(p){
 const src=p.source==='archive'?' · أرشيف تاريخي':'';
 return monthName(p.period)+' — '+periodStateLabel(p.state)+src+(p.entry_count?' · '+p.entry_count+' سجل':'');
}
async function loadPrintPeriod(period,preferSite){
 if(!period)return;
 CP.period=period;CP.ctx=null;CP.sites=[];CP.guards=[];CP.coverageEvents=[];CP.site=null;CP.filename='';
 $p('cpClient').innerHTML='<option value="">جاري تحميل العملاء...</option>';
 $p('cpProject').innerHTML='<option value="">—</option>';
 $p('cpSite').innerHTML='<option value="">—</option>';
 $p('cpPrint').disabled=true;
 const modeLabel=CP.mode==='client'?'شهر العميل':'الدورة الداخلية';
 $p('cpProgress').textContent='جاري تحميل '+modeLabel+' '+monthName(period);
 $p('cpStage').innerHTML='<div class="cp-empty"><div><span class="loading"></span><div style="margin-top:8px"><b>جاري تحميل بيانات '+modeLabel+'</b></div></div></div>';
 try{
   const action=CP.mode==='client'?'printClientCatalog':'printCatalog';
   const d=await api(action,{period:period},12000);
   CP.ctx={region_name:d.region_name||'',cycle_start:d.cycle_start,cycle_end:d.cycle_end,source:d.source||'live'};
   CP.sites=(d.sites||[]).map(function(s){return {
     code:s.site_code,site_code:s.site_code,site_name:s.site_name,project_code:s.project_code,
     project_name:s.project_name,client_name:s.client_name,city:s.city,guard_count:s.guard_count
   }});
   const ctx=cycleContext();
   const head=CP.mode==='client'?'شهر العميل':'الدورة الداخلية';
   $p('cpCycle').innerHTML='<b>'+head+':</b> '+escp(monthName(ctx.period))+' <span>·</span> '+fmtDate(ctx.start)+' ← '+fmtDate(ctx.end)+' <span>·</span> '+escp(ctx.region)+(CP.ctx?.source==='archive'?' <span>·</span> أرشيف تاريخي':'');
   $p('cpProgress').textContent=CP.sites.length+' موقع';
   if(!CP.sites.length){
     $p('cpClient').innerHTML='<option value="">لا توجد مواقع</option>';
     $p('cpStage').innerHTML='<div class="cp-empty"><div><b>لا توجد بيانات قابلة للطباعة لهذه الفترة</b><div style="margin-top:7px">اختاري شهراً أو دورة أخرى من قائمة الطباعة.</div></div></div>';
     return;
   }
   rebuildClients(preferSite||'');
 }catch(e){
   $p('cpProgress').textContent='';
   $p('cpStage').innerHTML='<div class="cp-empty"><div><b>تعذر تحميل فترة الطباعة</b><div style="margin-top:7px">'+escp(e.message)+'</div></div></div>';
 }
}


function catalogFromState(){
 const map=new Map(),sources=[];
 try{if(typeof S!=='undefined'&&S.ctx&&S.ctx.sites)sources.push.apply(sources,S.ctx.sites)}catch(e){}
 try{if(typeof S!=='undefined'&&S.day&&S.day.sites)sources.push.apply(sources,S.day.sites)}catch(e){}
 sources.forEach(function(s){
  const code=s.site_code;if(!code||code==='__MISSING__')return;
  const prev=map.get(code)||{};
  map.set(code,{code:code,site_name:s.site_name||prev.site_name||'بدون موقع',project_name:s.project_name||prev.project_name||'بدون مشروع',project_code:s.project_code||prev.project_code||'',client_name:s.client_name||prev.client_name||'غير محدد',city:s.city||prev.city||''});
 });
 return Array.from(map.values()).sort(function(a,b){return (clientKey(a)+' '+projectKey(a)+' '+a.site_name).localeCompare(clientKey(b)+' '+projectKey(b)+' '+b.site_name,'ar')});
}
function opt(items,placeholder){
 return '<option value="">'+escp(placeholder)+'</option>'+items.map(function(x){return '<option value="'+escp(x)+'">'+escp(x)+'</option>'}).join('');
}
function rebuildClients(prefer){
 const clients=uniq(CP.sites.map(clientKey));
 $p('cpClient').innerHTML=opt(clients,'اختاري العميل');
 const pref=CP.sites.find(function(s){return s.code===prefer});
 if(pref)$p('cpClient').value=clientKey(pref);else if(clients.length===1)$p('cpClient').value=clients[0];
 fillProjects(prefer,false);
}
function fillProjects(prefer,load){
 prefer=prefer||'';if(load===undefined)load=true;
 const c=$p('cpClient').value;
 const rows=CP.sites.filter(function(s){return !c||clientKey(s)===c});
 const projects=uniq(rows.map(projectKey));
 $p('cpProject').innerHTML=opt(projects,'اختاري المشروع');
 const pref=CP.sites.find(function(s){return s.code===prefer});
 if(pref&&(!c||clientKey(pref)===c))$p('cpProject').value=projectKey(pref);else if(projects.length===1)$p('cpProject').value=projects[0];
 fillSites(prefer,load);
}
function fillSites(prefer,load){
 prefer=prefer||'';if(load===undefined)load=true;
 const c=$p('cpClient').value,p=$p('cpProject').value;
 const rows=CP.sites.filter(function(s){return (!c||clientKey(s)===c)&&(!p||projectKey(s)===p)});
 $p('cpSite').innerHTML='<option value="">اختاري الموقع</option>'+rows.map(function(s){return '<option value="'+escp(s.code)+'">'+escp(s.site_name)+(s.city?' — '+escp(s.city):'')+'</option>'}).join('');
 if(prefer&&rows.some(function(s){return s.code===prefer}))$p('cpSite').value=prefer;else if(rows.length===1)$p('cpSite').value=rows[0].code;
 if(load&&$p('cpSite').value)loadSelectedSite();else emptyStage();
}
function emptyStage(){
 CP.site=null;CP.guards=[];CP.coverageEvents=[];CP.filename='';$p('cpPrint').disabled=true;$p('cpProgress').textContent='';$p('cpNotice').style.display='none';
 $p('cpStage').innerHTML='<div class="cp-empty"><div><b>اختاري العميل ثم المشروع ثم الموقع</b><div style="margin-top:7px">سيتم تجهيز كشف التحضير الشهري للموقع المحدد فقط.</div></div></div>';
}

async function loadSelectedSite(){
 const code=$p('cpSite').value;if(!code)return emptyStage();
 const s=CP.sites.find(function(x){return x.code===code});if(!s)return;
 CP.site=s;CP.guards=[];CP.coverageEvents=[];$p('cpPrint').disabled=true;
 $p('cpNotice').style.display='block';$p('cpNotice').textContent='جاري تجهيز بيانات الكشف...';
 $p('cpProgress').textContent='جاري التحميل';
 $p('cpStage').innerHTML='<div class="cp-empty"><div><span class="loading"></span><div style="margin-top:9px"><b>جاري تجهيز '+(CP.mode==='internal'?'التايم شيت الداخلي':'تايم شيت العميل')+'</b></div><div style="margin-top:6px">'+(CP.mode==='client'?'فترة العميل: من أول الشهر إلى آخر يوم فيه.':'الفترة الداخلية: حسب دورة التحضير المعتمدة.')+'</div></div></div>';
 try{
  const ctx=cycleContext();
  const action=CP.mode==='client'?'printClientSiteMonth':'printSiteMonth';
  const d=await api(action,{period:ctx.period,site_code:code},15000);
  CP.guards=d.guards||[];
  CP.coverageEvents=CP.mode==='internal'?(d.coverage_events||[]):[];
  if(d.site)CP.site=Object.assign({},s,{
    code:d.site.site_code||code,site_name:d.site.site_name||s.site_name,
    project_code:d.site.project_code||s.project_code,project_name:d.site.project_name||s.project_name,
    client_name:d.site.client_name||s.client_name,city:d.site.city||s.city
  });
  if(!CP.guards.length)throw new Error('لا توجد تكليفات محفوظة لهذا الموقع في الفترة المحددة.');
  $p('cpProgress').textContent=CP.guards.length+' حارس';
  renderReport();
 }catch(e){
  $p('cpProgress').textContent='';
  $p('cpNotice').style.display='block';$p('cpNotice').textContent=e.message;
  $p('cpStage').innerHTML='<div class="cp-empty"><div><b>تعذر تجهيز الكشف</b><div style="margin-top:7px">'+escp(e.message)+'</div></div></div>';
 }
}

function activeOn(a,date){const c=cycleContext(),s=cleanDate(a.start_date)||c.start,e=cleanDate(a.end_date)||c.end;return date>=s&&date<=e}
function dayEntry(a,date){return (a.days||[]).find(function(d){return cleanDate(d.date)===date})}
function shiftHours(code){const m=String(code||'').match(/(8|12)$/);return m?Number(m[1]):null}
function workHours(a,d){if(!d)return 0;if(d.worked_hours!==null&&d.worked_hours!==undefined&&d.worked_hours!=='')return Number(d.worked_hours)||0;if(['P','SUB','CASH'].includes(d.status))return shiftHours(d.shift_code||a.shift_code)||0;return 0}
function dayClass(st){if(!st)return'missing';if(['A','W','R','S'].includes(st))return'abs';if(['OFF','O','AL','SK'].includes(st))return'off';if(['SUB','CASH'].includes(st))return'cover';return''}
function metrics(ds){
 const z={present:0,abs:0,withdraw:0,off:0,coverage:0,missing:0,hours:0,missing_dates:0,missing_guards:0,permission:0,annual:0,sick:0,official:0,cash_total:0,overtime_total:0,hr_cases:0,finance_cases:0,operations_cases:0,open_cases:0,review_cases:0,closed_cases:0};
 const md=new Set(),mg=new Set();
 CP.guards.forEach(function(a){
  ds.forEach(function(date){
   if(!activeOn(a,date))return;
   const e=dayEntry(a,date);
   if(!e){z.missing++;md.add(date);mg.add(a.id||a.employee_ref||a.full_name);return}
   if(e.status==='P')z.present++;
   if(e.status==='A')z.abs++;
   if(e.status==='W')z.withdraw++;
   if(e.status==='T')z.permission++;
   if(e.status==='AL')z.annual++;
   if(e.status==='SK')z.sick++;
   if(e.status==='O')z.official++;
   if(['OFF','O','AL','SK'].includes(e.status))z.off++;
   if(['SUB','CASH'].includes(e.status))z.coverage++;
   z.hours+=workHours(a,e);
   z.cash_total+=Number(e.cash_amount||0);
   z.overtime_total+=Number(e.overtime_hours||0);
   if(e.review_lane==='HR')z.hr_cases++;
   if(e.review_lane==='FINANCE')z.finance_cases++;
   if(e.review_lane==='OPERATIONS')z.operations_cases++;
   if(e.workflow_status==='OPEN'||e.workflow_status==='IN_PROGRESS')z.open_cases++;
   if(e.workflow_status==='PENDING_REVIEW')z.review_cases++;
   if(e.workflow_status==='CLOSED')z.closed_cases++;
  });
 });
 CP.coverageEvents.forEach(function(e){
   const q=Number(e.quantity||1);
   z.coverage+=q;
   z.cash_total+=Number(e.cash_amount||0);
   if(e.coverage_type==='CASH'){
     z.finance_cases+=e.status==='OPEN'?1:0;
   }else{
     z.operations_cases+=e.status==='OPEN'?1:0;
   }
   if(e.status==='OPEN')z.open_cases++;
   if(e.status==='CONFIRMED')z.closed_cases++;
 });
 z.missing_dates=md.size;z.missing_guards=mg.size;
 return z;
}
function guardRow(a,idx,ds){
 let cells='',worked=0,hours=0;
 ds.forEach(function(date){
  const on=activeOn(a,date),e=on?dayEntry(a,date):null,st=e&&e.status||'',code=!on?'':(st?(STATUS_PRINT[st]||st):'—');
  cells+='<td class="'+(on?dayClass(st):'off')+'">'+escp(code)+'</td>';
  if(e&&['P','SUB','CASH'].includes(st))worked++;hours+=workHours(a,e);
 });
 const fourth=CP.mode==='internal'?(a.shift_code||'—'):(a.job_title||'حارس أمن');
 return '<tr><td>'+(idx+1)+'</td><td class="cp-name">'+escp(a.full_name||'')+'</td><td>'+escp(a.employee_ref||'—')+'</td><td>'+escp(fourth)+'</td>'+cells+'<td><b>'+worked+'</b></td><td><b>'+(hours||'')+'</b></td></tr>';
}

function cols(ds){
 let x='<col style="width:5mm"><col style="width:32mm"><col style="width:18mm"><col style="width:15mm">';
 ds.forEach(function(){x+='<col style="width:5mm">'});
 x+='<col style="width:12mm"><col style="width:14mm">';
 return '<colgroup>'+x+'</colgroup>';
}
function head(ds){
 const x=ds.map(function(v){const z=v.split('-');return '<th><div class="cp-day-head"><b>'+Number(z[2])+'</b><small>'+Number(z[1])+'</small></div></th>'}).join('');
 const fourth=CP.mode==='internal'?'الوردية':'المسمى';
 return '<thead><tr><th>م</th><th>اسم الحارس</th><th>الرقم الوظيفي</th><th>'+fourth+'</th>'+x+'<th>أيام العمل</th><th>الساعات</th></tr></thead>';
}

function pageHeader(page,total,ds){
 const c=cycleContext(),s=CP.site,label=s.project_name||s.site_name||s.client_name;
 const title=CP.mode==='internal'?'التايم شيت الداخلي - '+label:'كشف حضور حراس الأمن - '+label;
 const extra=CP.mode==='internal'
  ?'<span>PRJ: '+escp(s.project_code||'—')+'</span><span>SIT: '+escp(s.code||s.site_code||'—')+'</span>'
  :'';
 return '<div class="cp-head"><div class="cp-brand"><div class="cp-brand-mark"></div><div class="cp-brand-ar">أركانات للحراسات الأمنية</div><div class="cp-brand-en">ARKANAT for Security Guards</div></div>'+
 '<div class="cp-center"><div class="cp-title">'+escp(title)+'</div><div class="cp-meta"><span>'+escp(c.region)+(s.city?' - '+escp(s.city):'')+'</span><span>العميل: '+escp(clientKey(s))+'</span><span>المشروع: '+escp(projectKey(s))+'</span>'+extra+'<span>'+(CP.mode==='internal'?'الدورة الداخلية: ':'شهر العميل: ')+escp(monthName(c.period))+'</span><span>'+fmtDate(ds[0])+' إلى '+fmtDate(ds[ds.length-1])+'</span></div></div>'+
 '<div class="cp-page-num"><b>'+page+'/'+total+'</b>صفحة</div></div>';
}

function finalBlock(m){
 const s=CP.site;
 const approvals=CP.mode==='internal'
  ?'<div class="cp-approvals"><div class="cp-approval"><b>مشرف الأمن</b>الاسم / التوقيع</div><div class="cp-approval"><b>إدارة العمليات الموحدة</b>الاسم / التوقيع</div><div class="cp-approval"><b>الموارد البشرية</b>الاسم / التوقيع</div><div class="cp-approval"><b>الإدارة المالية</b>الاسم / التوقيع</div><div class="cp-approval"><b>المراجعة</b>الاسم / التوقيع</div></div>'
  :'<div class="cp-approvals"><div class="cp-approval"><b>مسؤول العميل / الموقع</b>الاسم / التوقيع</div><div class="cp-approval"><b>مشرف الأمن</b>الاسم / التوقيع</div><div class="cp-approval"><b>ممثل أركانات / العمليات</b>الاسم / التوقيع</div></div>';
 const banner=CP.mode==='internal'
  ?'<div class="cp-internal-banner">مستند داخلي للمصالحة بين العمليات والموارد البشرية والمالية — يتبع دورة التحضير الداخلية ويعرض محركات الأثر المالي والتشغيلي ولا يرسل للعميل.</div>'
  :'<div class="cp-client-block">كشف العميل يغطي الشهر الميلادي من يوم 1 حتى آخر يوم في الشهر لإثبات الحضور والتنفيذ والاعتماد، ولا يتضمن بيانات الرواتب أو مبالغ التغطية أو الملاحظات الداخلية.</div>';
 const internalImpact=CP.mode==='internal'
  ?'<div class="cp-kpis" style="margin-top:1.2mm"><div class="cp-kpi"><b>غياب للحسم</b><strong>'+m.abs+'</strong></div><div class="cp-kpi"><b>انسحاب للحسم</b><strong>'+m.withdraw+'</strong></div><div class="cp-kpi"><b>تغطية كاش</b><strong>'+m.cash_total.toFixed(2)+'</strong></div><div class="cp-kpi"><b>إضافي مسجل</b><strong>'+m.overtime_total.toFixed(1)+'</strong></div></div>'+
   '<div class="cp-legend"><span>مراجعة HR: <b>'+m.hr_cases+'</b></span><span>مراجعة المالية: <b>'+m.finance_cases+'</b></span><span>مراجعة العمليات: <b>'+m.operations_cases+'</b></span><span>مفتوح/قيد المعالجة: <b>'+m.open_cases+'</b></span><span>بانتظار المراجعة: <b>'+m.review_cases+'</b></span><span>مغلق: <b>'+m.closed_cases+'</b></span></div>'
  :'';
 return '<div class="cp-final">'+banner+'<div class="cp-kpis"><div class="cp-kpi"><b>الحضور</b><strong>'+m.present+'</strong></div><div class="cp-kpi"><b>الغياب</b><strong>'+m.abs+'</strong></div><div class="cp-kpi"><b>الانسحاب</b><strong>'+m.withdraw+'</strong></div><div class="cp-kpi"><b>التغطيات</b><strong>'+m.coverage+'</strong></div></div>'+
 internalImpact+
 '<div class="cp-legend"><span><b>P</b> حاضر</span><span><b>A</b> غائب</span><span><b>OFF</b> راحة</span><span><b>T</b> استئذان</span><span><b>AL</b> إجازة سنوية</span><span><b>SK</b> مرضية</span><span><b>W</b> انسحاب</span><span><b>R</b> استقالة</span><span><b>S</b> توقف</span><span><b>C</b> تغطية</span><span><b>إجمالي الساعات</b> '+m.hours+'</span></div>'+
 approvals+
 '<div class="cp-foot"><span>شركة أركانات للحراسات الأمنية</span><span>'+escp(s.project_name||s.site_name||'')+'</span><span>'+escp(cycleContext().period)+'</span></div>'+
 (m.missing?'<div class="cp-draft">مسودة غير مكتملة - '+m.missing+' خانة تحضير يومية غير مسجلة</div>':'')+'</div>';
}
function internalCaseState(s){return {OPEN:'مفتوح',IN_PROGRESS:'قيد المعالجة',PENDING_REVIEW:'بانتظار المراجعة',CLOSED:'مغلق'}[s]||''}
function internalLane(s){return {OPERATIONS:'العمليات',HR:'الموارد البشرية',FINANCE:'المالية'}[s]||s||''}
function internalEvents(){
 const rows=[];
 CP.guards.forEach(function(a){
  (a.days||[]).forEach(function(d){
   const st=d.status||'';
   const notable=!['P','OFF'].includes(st)||Number(d.overtime_hours||0)>0||d.note||d.replacement_name||d.replacement_employee_ref||d.cash_amount||d.case_id;
   if(!notable)return;
   rows.push({
    date:cleanDate(d.date),name:a.full_name||'',employee_ref:a.employee_ref||'',
    status:STATUS_PRINT[st]||st,shift:d.shift_code||a.shift_code||'',
    worked_hours:d.worked_hours==null?'':d.worked_hours,
    overtime_hours:d.overtime_hours==null?'':d.overtime_hours,
    replacement:d.replacement_name||d.replacement_employee_ref||'',
    cash:d.cash_amount==null?'':d.cash_amount,
    exception_label:d.exception_label||'',
    workflow_status:internalCaseState(d.workflow_status),
    review_lane:internalLane(d.review_lane),
    action_note:d.action_note||'',
    review_note:d.review_note||'',
    note:d.note||''
   });
  });
 });
 CP.coverageEvents.forEach(function(e){
   rows.push({
    date:cleanDate(e.date)||'',
    name:e.executor_name||'تغطية غير مسماة',
    employee_ref:e.executor_employee_ref||'',
    status:e.coverage_type==='CASH'?'CASH':'C',
    shift:e.shift_code||'',
    worked_hours:'',
    overtime_hours:'',
    replacement:e.executor_name||e.executor_employee_ref||'',
    cash:e.cash_amount==null?'':e.cash_amount,
    exception_label:e.event_label||'تغطية تاريخية',
    workflow_status:e.status==='CONFIRMED'?'مؤكد':'مفتوح',
    review_lane:e.coverage_type==='CASH'?'المالية':'العمليات',
    action_note:'',
    review_note:e.verification_state==='UNRESOLVED'?'يحتاج مراجعة المصدر':'',
    note:[e.note,e.source_sheet&&e.source_row?('المصدر: '+e.source_sheet+' / صف '+e.source_row):''].filter(Boolean).join(' | ')
   });
 });
 return rows.sort(function(a,b){return a.date.localeCompare(b.date)||a.name.localeCompare(b.name,'ar')});
}
function internalLedgerPage(rows,page,total,ds){
 return '<section class="cp-page">'+pageHeader(page,total,ds)+'<div class="cp-internal-banner">سجل الاستثناءات والتغطيات الداخلي — يستخدم للمراجعة والمصالحة بين العمليات والموارد البشرية والمالية، ولا يرسل للعميل.</div>'+
 '<div class="cp-ledger-wrap"><div class="cp-ledger-title">تفاصيل الاستثناءات والتغطيات ومسار المعالجة</div><table class="cp-ledger"><thead><tr>'+
 '<th>التاريخ</th><th>الحارس</th><th>EMP_ID</th><th>الحالة</th><th>الاستثناء</th><th>مسار المعالجة</th><th>جهة المراجعة</th><th>إضافي</th><th>البديل / المنفذ</th><th>الكاش</th><th>ملاحظات</th>'+
 '</tr></thead><tbody>'+
 rows.map(function(r){
   const notes=[r.note,r.action_note,r.review_note].filter(Boolean).join(' | ');
   return '<tr><td class="num">'+escp(r.date)+'</td><td>'+escp(r.name)+'</td><td class="num">'+escp(r.employee_ref)+'</td><td class="num">'+escp(r.status)+'</td><td>'+escp(r.exception_label)+'</td><td class="num">'+escp(r.workflow_status)+'</td><td class="num">'+escp(r.review_lane)+'</td><td class="num">'+escp(r.overtime_hours)+'</td><td>'+escp(r.replacement)+'</td><td class="num">'+escp(r.cash)+'</td><td>'+escp(notes)+'</td></tr>'
 }).join('')+
 '</tbody></table></div></section>';
}


function renderReport(){
 const c=cycleContext(),ds=dateList(c.start,c.end),m=metrics(ds),perPage=26,chunks=[];
 for(let i=0;i<CP.guards.length;i+=perPage)chunks.push(CP.guards.slice(i,i+perPage));
 if(!chunks.length)chunks.push([]);
 const events=CP.mode==='internal'?internalEvents():[],ledgerChunks=[];
 for(let i=0;i<events.length;i+=22)ledgerChunks.push(events.slice(i,i+22));
 const total=chunks.length+ledgerChunks.length;
 let html=chunks.map(function(chunk,pi){
  return '<section class="cp-page">'+pageHeader(pi+1,total,ds)+'<div class="cp-table-wrap"><table class="cp-table">'+cols(ds)+head(ds)+'<tbody>'+chunk.map(function(a,j){return guardRow(a,pi*perPage+j,ds)}).join('')+'</tbody></table></div>'+
  '<div class="cp-strip"><span class="site">'+escp(CP.site.site_name||CP.site.project_name||'')+'</span><span class="cp-small">عدد الحراس: '+CP.guards.length+' · الفترة التشغيلية: '+fmtDate(ds[0])+' - '+fmtDate(ds[ds.length-1])+'</span><span class="ref">'+(pi+1)+'/'+total+'</span></div>'+
  (pi===chunks.length-1?finalBlock(m):'')+'</section>';
 }).join('');
 if(CP.mode==='internal'){
  html+=ledgerChunks.map(function(rows,i){return internalLedgerPage(rows,chunks.length+i+1,total,ds)}).join('');
 }
 $p('cpStage').innerHTML=html;
 if(m.missing){
  $p('cpNotice').style.display='block';
  $p('cpNotice').textContent=CP.mode==='client'
   ?'لا يمكن اعتماد نسخة العميل بعد: توجد '+m.missing+' خانات تحضير يومية غير مسجلة (موظف × يوم)، موزعة على '+m.missing_guards+' حارس و'+m.missing_dates+' تواريخ.'
   :'مسودة داخلية: توجد '+m.missing+' خانات تحضير يومية غير مسجلة. يمكن طباعتها للمراجعة الداخلية، ولا تعتمد كنسخة عميل.';
 }else{$p('cpNotice').style.display='none';$p('cpNotice').textContent=''}
 $p('cpPrint').disabled=CP.mode==='client'&&m.missing>0;
 CP.filename='أركانات - '+(CP.mode==='internal'?'تايم شيت داخلي':'كشف حضور العميل')+' - '+safeName(CP.site.project_name||CP.site.site_name||CP.site.client_name)+' - '+safeName(c.region||'')+' - '+safeName(monthName(c.period));
}

function printReport(){
 if(!CP.site||!CP.guards.length)return;
 const old=document.title;document.title=CP.filename||'أركانات - كشف حضور';
 setTimeout(function(){window.print();setTimeout(function(){document.title=old},500)},60);
}
function closeClientPrint(){
 const sh=$p('clientPrintShell');if(!sh)return;
 sh.classList.remove('open');sh.setAttribute('aria-hidden','true');document.body.style.overflow='';
}
async function openClientPrint(){
 ensureShell();
 const sh=$p('clientPrintShell');sh.classList.add('open');sh.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
 CP.mode='client';CP.period='';CP.ctx=null;CP.sites=[];CP.guards=[];CP.site=null;
 $p('cpModeClient').classList.add('active');$p('cpModeInternal').classList.remove('active');
 $p('cpPeriodLabel').textContent='شهر العميل للطباعة';
 $p('cpModeNote').textContent='تايم شيت العميل يغطي الشهر الميلادي كاملاً من يوم 1 حتى آخر يوم في الشهر، ولا يعرض التفاصيل المالية أو ملاحظات العمل الداخلية.';
 $p('cpCycle').innerHTML='<b>أشهر الطباعة:</b> جاري تحميل الأرشيف...';
 $p('cpPeriod').innerHTML='<option value="">جاري تحميل الدورات...</option>';
 try{
   const p=await api('printPeriods',{},12000);
   CP.periods=p.periods||[];
   if(!CP.periods.length){
     $p('cpPeriod').innerHTML='<option value="">لا توجد دورات محفوظة</option>';
     $p('cpStage').innerHTML='<div class="cp-empty"><b>لا توجد دورات تحضير محفوظة لهذه المنطقة.</b></div>';
     return;
   }
   $p('cpPeriod').innerHTML=CP.periods.map(function(x){return '<option value="'+escp(x.period)+'">'+escp(periodOptionText(x))+'</option>'}).join('');
   let mainPeriod='';
   try{mainPeriod=document.getElementById('period')&&document.getElementById('period').value||''}catch(e){}
   const chosen=CP.periods.some(function(x){return x.period===mainPeriod})?mainPeriod:CP.periods[0].period;
   $p('cpPeriod').value=chosen;
   let prefer='';
   try{prefer=S.site||(S.employee&&S.employee.site_code)||''}catch(e){}
   await loadPrintPeriod(chosen,prefer);
 }catch(e){
   $p('cpCycle').textContent='تعذر تحميل أرشيف الطباعة';
   $p('cpStage').innerHTML='<div class="cp-empty"><div><b>تعذر تحميل دورات التحضير السابقة</b><div style="margin-top:7px">'+escp(e.message)+'</div></div></div>';
 }
}

window.openClientPrint=openClientPrint;
window.closeClientPrint=closeClientPrint;
})();
