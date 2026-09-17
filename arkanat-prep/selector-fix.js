(()=>{
  const q=id=>document.getElementById(id);
  const style=document.createElement('style');
  style.textContent=`.print-toolbar select:disabled{background:#f3f1ee;color:#9a928d;cursor:not-allowed;border-color:#dfdbd5}.tb-btn:disabled{opacity:.48;cursor:not-allowed;box-shadow:none}.selection-summary{border-top:1px dashed #e2ddd6;padding-top:5px}`;
  document.head.appendChild(style);

  rebuildClients=function(preferredCode=''){
    const previous=q('pClient').value;
    const clients=uniq(P.groups.map(clientKey));
    q('pClient').innerHTML=optionHtml(clients,'اختاري العميل');
    const preferred=P.groups.find(g=>g.code===preferredCode);
    if(preferred) q('pClient').value=clientKey(preferred);
    else if(previous&&clients.includes(previous)) q('pClient').value=previous;
    else if(clients.length===1) q('pClient').value=clients[0];
    fillProjects(preferredCode,false);
    updateSelectionSummary();
  };

  fillProjects=function(preferredCode='',render=true){
    const c=q('pClient').value;
    const preferred=P.groups.find(g=>g.code===preferredCode);
    if(!c){
      q('pProject').innerHTML='<option value="">اختاري العميل أولاً</option>';
      q('pProject').disabled=true;
      q('pSite').innerHTML='<option value="">اختاري المشروع أولاً</option>';
      q('pSite').disabled=true;
      updateSelectionSummary();
      if(render) renderSheet();
      return;
    }
    q('pProject').disabled=false;
    const groups=P.groups.filter(g=>clientKey(g)===c);
    const projects=uniq(groups.map(projectKey));
    const previous=q('pProject').value;
    q('pProject').innerHTML=optionHtml(projects,'اختاري المشروع');
    if(preferred&&clientKey(preferred)===c) q('pProject').value=projectKey(preferred);
    else if(previous&&projects.includes(previous)) q('pProject').value=previous;
    else if(projects.length===1) q('pProject').value=projects[0];
    else q('pProject').value='';
    fillSites(preferredCode,render);
  };

  fillSites=function(preferredCode='',render=true){
    const c=q('pClient').value,p=q('pProject').value;
    if(!c||!p){
      q('pSite').innerHTML=`<option value="">${c?'اختاري المشروع أولاً':'اختاري العميل أولاً'}</option>`;
      q('pSite').disabled=true;
      updateSelectionSummary();
      if(render) renderSheet();
      return;
    }
    q('pSite').disabled=false;
    const groups=P.groups.filter(g=>clientKey(g)===c&&projectKey(g)===p);
    const previous=q('pSite').value;
    q('pSite').innerHTML='<option value="">اختاري الموقع</option>'+groups.map(g=>`<option value="${esc(g.code)}">${esc(labelSite(g))}</option>`).join('');
    if(preferredCode&&groups.some(g=>g.code===preferredCode)) q('pSite').value=preferredCode;
    else if(previous&&groups.some(g=>g.code===previous)) q('pSite').value=previous;
    else if(groups.length===1) q('pSite').value=groups[0].code;
    else q('pSite').value='';
    updateSelectionSummary();
    if(render) renderSheet();
  };

  clearSelection=function(){
    q('pSearch').value='';
    q('pClient').value='';
    fillProjects('',false);
    q('pSite').value='';
    updateSelectionSummary();
    renderSheet();
  };

  q('pProject').disabled=true;
  q('pSite').disabled=true;
})();
