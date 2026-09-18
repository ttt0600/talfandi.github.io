
(function(){
const API='https://dbxvfrkkocfwjumvoaha.supabase.co/functions/v1/arkanat-prep-fast';
const STATUS_PRINT={P:'P',OFF:'OFF',A:'A',T:'T',AL:'AL',SK:'SK',S:'S',W:'W',R:'R',O:'O',SUB:'C',CASH:'C',OTHER:'-'};
const CP={sites:[],guards:[],site:null,filename:''};
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
 '<div id="cpCycle" class="cp-cycle"></div>'+
 '<div class="cp-field"><label>العميل</label><select id="cpClient"></select></div>'+
 '<div class="cp-field"><label>المشروع</label><select id="cpProject"></select></div>'+
 '<div class="cp-field"><label>الموقع</label><select id="cpSite"></select></div>'+
 '<div class="cp-actions"><button id="cpClose" class="cp-btn cp-btn-ghost">إغلاق</button><button id="cpPrint" class="cp-btn cp-btn-primary" disabled>طباعة / حفظ PDF</button></div>'+
 '<div id="cpProgress" class="cp-progress"></div></div></div>'+
 '<div id="cpNotice" class="cp-notice" style="display:none"></div>'+
 '<div id="cpStage" class="cp-stage"><div class="cp-empty"><div><b>اختاري العميل ثم المشروع ثم الموقع</b><div style="margin-top:7px">سيتم تجهيز كشف التحضير الشهري للموقع المحدد فقط.</div></div></div></div>';
 document.body.appendChild(root);
 $p('cpClose').onclick=closeClientPrint;
 $p('cpClient').onchange=function(){fillProjects()};
 $p('cpProject').onchange=function(){fillSites()};
 $p('cpSite').onchange=loadSelectedSite;
 $p('cpPrint').onclick=printReport;
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
 try{
  if(typeof S!=='undefined'&&S.ctx){
   return {period:document.getElementById('period')&&document.getElementById('period').value||S.ctx.period,region:S.ctx.region_name,start:S.ctx.cycle_start,end:S.ctx.cycle_end};
  }
 }catch(e){}
 const p=document.getElementById('period')&&document.getElementById('period').value||new Date().toISOString().slice(0,7);
 return {period:p,region:'',start:p+'-01',end:p+'-28'};
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
 CP.site=null;CP.guards=[];CP.filename='';$p('cpPrint').disabled=true;$p('cpProgress').textContent='';$p('cpNotice').style.display='none';
 $p('cpStage').innerHTML='<div class="cp-empty"><div><b>اختاري العميل ثم المشروع ثم الموقع</b><div style="margin-top:7px">سيتم تجهيز كشف التحضير الشهري للموقع المحدد فقط.</div></div></div>';
}

async function loadSelectedSite(){
 const code=$p('cpSite').value;if(!code)return emptyStage();
 const s=CP.sites.find(function(x){return x.code===code});if(!s)return;
 CP.site=s;CP.guards=[];$p('cpPrint').disabled=true;
 $p('cpNotice').style.display='block';$p('cpNotice').textContent='جاري تجهيز بيانات الكشف...';
 $p('cpProgress').textContent='جاري التحميل';
 $p('cpStage').innerHTML='<div class="cp-empty"><div><span class="loading"></span><div style="margin-top:9px"><b>جاري تجهيز التحضير الشهري</b></div><div style="margin-top:6px">يتم تحميل سجلات هذا الموقع فقط في طلب واحد.</div></div></div>';
 try{
  const ctx=cycleContext();
  const roster=await api('roster',{period:ctx.period,q:'@site:'+code},15000);
  const rows=roster.rows||[];
  if(!rows.length)throw new Error('لا توجد تكليفات محفوظة لهذا الموقع في دورة التحضير المحددة.');
  CP.guards=rows;
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
 const z={present:0,abs:0,withdraw:0,off:0,coverage:0,missing:0,hours:0,missing_dates:0,missing_guards:0};
 const md=new Set(),mg=new Set();
 CP.guards.forEach(function(a){
  ds.forEach(function(date){
   if(!activeOn(a,date))return;
   const e=dayEntry(a,date);
   if(!e){z.missing++;md.add(date);mg.add(a.id||a.employee_ref||a.full_name);return}
   if(e.status==='P')z.present++;
   if(e.status==='A')z.abs++;
   if(e.status==='W')z.withdraw++;
   if(['OFF','O','AL','SK'].includes(e.status))z.off++;
   if(['SUB','CASH'].includes(e.status))z.coverage++;
   z.hours+=workHours(a,e);
  });
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
 return '<tr><td>'+(idx+1)+'</td><td class="cp-name">'+escp(a.full_name||'')+'</td><td>'+escp(a.employee_ref||'—')+'</td><td>'+escp(a.job_title||'حارس أمن')+'</td>'+cells+'<td><b>'+worked+'</b></td><td><b>'+(hours||'')+'</b></td></tr>';
}
function cols(ds){
 let x='<col style="width:5mm"><col style="width:32mm"><col style="width:18mm"><col style="width:15mm">';
 ds.forEach(function(){x+='<col style="width:5mm">'});
 x+='<col style="width:12mm"><col style="width:14mm">';
 return '<colgroup>'+x+'</colgroup>';
}
function head(ds){
 const x=ds.map(function(v){const z=v.split('-');return '<th><div class="cp-day-head"><b>'+Number(z[2])+'</b><small>'+Number(z[1])+'</small></div></th>'}).join('');
 return '<thead><tr><th>م</th><th>اسم الحارس</th><th>الرقم الوظيفي</th><th>المسمى</th>'+x+'<th>أيام العمل</th><th>الساعات</th></tr></thead>';
}
function pageHeader(page,total,ds){
 const c=cycleContext(),s=CP.site,label=s.project_name||s.site_name||s.client_name;
 return '<div class="cp-head"><div class="cp-brand"><div class="cp-brand-mark"></div><div class="cp-brand-ar">أركانات للحراسات الأمنية</div><div class="cp-brand-en">ARKANAT for Security Guards</div></div>'+
 '<div class="cp-center"><div class="cp-title">كشف حضور حراس الأمن - '+escp(label)+'</div><div class="cp-meta"><span>'+escp(c.region)+(s.city?' - '+escp(s.city):'')+'</span><span>العميل: '+escp(clientKey(s))+'</span><span>المشروع: '+escp(projectKey(s))+'</span><span>دورة '+escp(monthName(c.period))+'</span><span>'+fmtDate(ds[0])+' إلى '+fmtDate(ds[ds.length-1])+'</span></div></div>'+
 '<div class="cp-page-num"><b>'+page+'/'+total+'</b>صفحة</div></div>';
}
function finalBlock(m){
 const s=CP.site;
 return '<div class="cp-final"><div class="cp-kpis"><div class="cp-kpi"><b>الحضور</b><strong>'+m.present+'</strong></div><div class="cp-kpi"><b>الغياب</b><strong>'+m.abs+'</strong></div><div class="cp-kpi"><b>الانسحاب</b><strong>'+m.withdraw+'</strong></div><div class="cp-kpi"><b>التغطيات</b><strong>'+m.coverage+'</strong></div></div>'+
 '<div class="cp-legend"><span><b>P</b> حاضر</span><span><b>A</b> غائب</span><span><b>OFF</b> راحة</span><span><b>T</b> استئذان</span><span><b>AL</b> إجازة سنوية</span><span><b>SK</b> مرضية</span><span><b>W</b> انسحاب</span><span><b>R</b> استقالة</span><span><b>S</b> توقف</span><span><b>C</b> تغطية</span><span><b>إجمالي الساعات</b> '+m.hours+'</span></div>'+
 '<div class="cp-approvals"><div class="cp-approval"><b>مسؤول العميل / الموقع</b>الاسم / التوقيع</div><div class="cp-approval"><b>مشرف الأمن</b>الاسم / التوقيع</div><div class="cp-approval"><b>مدير إدارة التشغيل</b>الاسم / التوقيع</div><div class="cp-approval"><b>إدارة العمليات الموحدة</b>الاسم / التوقيع</div><div class="cp-approval"><b>إدارة الموارد البشرية</b>الاسم / التوقيع</div></div>'+
 '<div class="cp-foot"><span>شركة أركانات للحراسات الأمنية</span><span>'+escp(s.project_name||s.site_name||'')+'</span><span>'+escp(cycleContext().period)+'</span></div>'+
 (m.missing?'<div class="cp-draft">مسودة غير مكتملة - '+m.missing+' خانة تحضير يومية غير مسجلة</div>':'')+'</div>';
}
function renderReport(){
 const c=cycleContext(),ds=dateList(c.start,c.end),m=metrics(ds),perPage=26,chunks=[];
 for(let i=0;i<CP.guards.length;i+=perPage)chunks.push(CP.guards.slice(i,i+perPage));
 if(!chunks.length)chunks.push([]);
 $p('cpStage').innerHTML=chunks.map(function(chunk,pi){
  return '<section class="cp-page">'+pageHeader(pi+1,chunks.length,ds)+'<div class="cp-table-wrap"><table class="cp-table">'+cols(ds)+head(ds)+'<tbody>'+chunk.map(function(a,j){return guardRow(a,pi*perPage+j,ds)}).join('')+'</tbody></table></div>'+
  '<div class="cp-strip"><span class="site">'+escp(CP.site.site_name||CP.site.project_name||'')+'</span><span class="cp-small">عدد الحراس: '+CP.guards.length+' · الفترة التشغيلية: '+fmtDate(ds[0])+' - '+fmtDate(ds[ds.length-1])+'</span><span class="ref">'+(pi+1)+'/'+chunks.length+'</span></div>'+
  (pi===chunks.length-1?finalBlock(m):'')+'</section>';
 }).join('');
 $p('cpNotice').style.display=m.missing?'block':'none';
 $p('cpNotice').textContent=m.missing?'الكشف غير مكتمل: توجد '+m.missing+' خانات تحضير يومية غير مسجلة (موظف × يوم)، موزعة على '+m.missing_guards+' حارس و'+m.missing_dates+' تواريخ. يجب استكمالها قبل إرسال الكشف للعميل.':'';
 $p('cpPrint').disabled=false;
 CP.filename='أركانات - كشف حضور - '+safeName(CP.site.project_name||CP.site.site_name||CP.site.client_name)+' - '+safeName(c.region||'')+' - '+safeName(monthName(c.period));
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
 const c=cycleContext();
 $p('cpCycle').innerHTML='<b>دورة التحضير:</b> '+escp(monthName(c.period))+' <span>·</span> '+fmtDate(c.start)+' ← '+fmtDate(c.end)+' <span>·</span> '+escp(c.region||'');
 CP.sites=catalogFromState();
 if(!CP.sites.length){$p('cpStage').innerHTML='<div class="cp-empty"><div><b>لا توجد مواقع متاحة للطباعة</b><div style="margin-top:7px">حمّلي بيانات المنطقة أولاً ثم أعيدي المحاولة.</div></div></div>';return}
 let prefer='';
 try{prefer=S.site||(S.employee&&S.employee.site_code)||''}catch(e){}
 rebuildClients(prefer);
 if(prefer&&CP.sites.some(function(x){return x.code===prefer})){
  const ps=CP.sites.find(function(x){return x.code===prefer});
  $p('cpClient').value=clientKey(ps);fillProjects(prefer,false);$p('cpProject').value=projectKey(ps);fillSites(prefer,false);$p('cpSite').value=prefer;await loadSelectedSite();
 }else{
  const clients=uniq(CP.sites.map(clientKey));
  if(clients.length===1){$p('cpClient').value=clients[0];fillProjects('',false)}
 }
}
window.openClientPrint=openClientPrint;
window.closeClientPrint=closeClientPrint;
})();
