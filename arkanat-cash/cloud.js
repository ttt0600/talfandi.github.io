(function(){
  const cfg = window.ARKANAT_CASH_CONFIG || {mode:"local"};
  const api = { ready:false, mode:cfg.mode||"local", client:null, session:null, access:null };

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){
        if(window.supabase) resolve();
        else existing.addEventListener("load",resolve,{once:true});
        return;
      }
      const s=document.createElement("script");
      s.src=src; s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
  }
  function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
  function chunk(arr,size){ const out=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; }

  function requestToDb(r,email){
    return {
      id:r.id, legacy_id:r.legacyNo||r.legacy_id||null,
      request_date:r.date||null, source_date_raw:r.dateRaw||null, date_status:r.dateStatus||null,
      region:r.region||null, supervisor:r.supervisor||"", amount:n(r.amount),
      purpose:r.purpose||null, site:r.site||null, beneficiary:r.beneficiary||null, iban:r.iban||null,
      source_channel:r.sourceChannel||null, source_reference:r.sourceReference||null, source_message:r.sourceMessage||null,
      finance_notes:r.notes||null, status:r.status||"جديد", source_name:r.source||null,
      source_file:r.sourceFile||null, source_sheet:r.sourceSheet||null, source_row:r.sourceRow==null?null:String(r.sourceRow),
      scope_key:r.scopeKey||null, snapshot_status:r.snapshotStatus||"current",
      created_at:r.createdAt||new Date().toISOString(), approved_at:r.approvedAt||null, funded_at:r.fundedAt||null,
      created_by_email:r.createdByEmail||email||null
    };
  }
  function requestFromDb(r){
    return {
      id:r.id, legacyNo:r.legacy_id||"", date:r.request_date||"", dateRaw:r.source_date_raw||"",
      dateStatus:r.date_status||"", region:r.region||"", supervisor:r.supervisor||"", amount:n(r.amount),
      purpose:r.purpose||"", site:r.site||"", beneficiary:r.beneficiary||"", iban:r.iban||"",
      sourceChannel:r.source_channel||"", sourceReference:r.source_reference||"", sourceMessage:r.source_message||"",
      notes:r.finance_notes||"", status:r.status||"جديد", source:r.source_name||"",
      sourceFile:r.source_file||"", sourceSheet:r.source_sheet||"", sourceRow:r.source_row||"",
      scopeKey:r.scope_key||"", snapshotStatus:r.snapshot_status||"current",
      createdAt:r.created_at||"", approvedAt:r.approved_at||"", fundedAt:r.funded_at||"",
      createdByEmail:r.created_by_email||""
    };
  }
  function txnToDb(t,email){
    return {
      id:t.id, legacy_id:t.legacyNo||t.legacy_id||null, request_id:t.requestId||null,
      transaction_date:t.date||null, source_date_raw:t.dateRaw||null, date_status:t.dateStatus||null,
      transaction_type:t.type||"مصروف تشغيلي", amount:n(t.amount), opening_sign:t.openingSign==null?null:Number(t.openingSign),
      region:t.region||null, custody_holder:t.custodyHolder||null, operational_supervisor:t.supervisor||null,
      transfer_to:t.transferTo||null, site:t.site||null, absent_employee:t.absent||null, cover_employee:t.cover||null,
      reason:t.reason||null, description:t.description||null, document_ref:t.documentRef||null, vehicle:t.vehicle||null,
      funding_method:t.fundingMethod||null, funding_ref:t.fundingRef||null, beneficiary:t.beneficiary||null,
      source_channel:t.sourceChannel||null, source_reference:t.sourceReference||null, source_message:t.sourceMessage||null,
      notes:t.notes||null, reported_balance:t.reportedBalance==null||t.reportedBalance===""?null:n(t.reportedBalance),
      status:t.status||"مسجل", source_name:t.source||null, source_file:t.sourceFile||null, source_sheet:t.sourceSheet||null,
      source_row:t.sourceRow==null?null:String(t.sourceRow), scope_key:t.scopeKey||null,
      snapshot_status:t.snapshotStatus||"current", summary_derived:!!t.summaryDerived, control_exclude:!!t.controlExclude,
      linked_transaction_id:t.linkedId||null, approved_at:t.approvedAt||null,
      created_at:t.createdAt||new Date().toISOString(), created_by_email:t.createdByEmail||email||null
    };
  }
  function txnFromDb(t){
    return {
      id:t.id, legacyNo:t.legacy_id||"", requestId:t.request_id||"", date:t.transaction_date||"",
      dateRaw:t.source_date_raw||"", dateStatus:t.date_status||"", type:t.transaction_type||"",
      amount:n(t.amount), openingSign:t.opening_sign==null?null:Number(t.opening_sign),
      region:t.region||"", custodyHolder:t.custody_holder||"", supervisor:t.operational_supervisor||"",
      transferTo:t.transfer_to||"", site:t.site||"", absent:t.absent_employee||"", cover:t.cover_employee||"",
      reason:t.reason||"", description:t.description||"", documentRef:t.document_ref||"", vehicle:t.vehicle||"",
      fundingMethod:t.funding_method||"", fundingRef:t.funding_ref||"", beneficiary:t.beneficiary||"",
      sourceChannel:t.source_channel||"", sourceReference:t.source_reference||"", sourceMessage:t.source_message||"",
      notes:t.notes||"", reportedBalance:t.reported_balance==null?"":n(t.reported_balance),
      status:t.status||"مسجل", source:t.source_name||"", sourceFile:t.source_file||"", sourceSheet:t.source_sheet||"",
      sourceRow:t.source_row||"", scopeKey:t.scope_key||"", snapshotStatus:t.snapshot_status||"current",
      summaryDerived:!!t.summary_derived, controlExclude:!!t.control_exclude, linkedId:t.linked_transaction_id||"",
      approvedAt:t.approved_at||"", createdAt:t.created_at||"", createdByEmail:t.created_by_email||""
    };
  }
  function importToDb(x,email){
    const meta={...(x||{})}; delete meta.id; delete meta.fileName; delete meta.fingerprint; delete meta.mode;
    delete meta.importedAt; delete meta.addedTransactions; delete meta.addedRequests; delete meta.superseded; delete meta.duplicatesSkipped;
    return {
      id:x.id, file_name:x.fileName||"", fingerprint:x.fingerprint||null, import_mode:x.mode||"snapshot",
      metadata:meta, added_transactions:Number(x.addedTransactions||0), added_requests:Number(x.addedRequests||0),
      superseded_count:Number(x.superseded||0), duplicates_skipped:Number(x.duplicatesSkipped||0),
      created_at:x.importedAt||new Date().toISOString(), created_by_email:email||null
    };
  }
  function importFromDb(x){
    const m=x.metadata||{};
    return {
      id:x.id, fileName:x.file_name||"", fingerprint:x.fingerprint||"", mode:x.import_mode||"snapshot",
      importedAt:x.created_at||"", addedTransactions:x.added_transactions||0, addedRequests:x.added_requests||0,
      superseded:x.superseded_count||0, duplicatesSkipped:x.duplicates_skipped||0, ...m
    };
  }
  function auditToDb(x,email){
    return {
      id:x.id, event_time:x.at||new Date().toISOString(), user_email:email||x.userEmail||null,
      user_label:x.operator||x.userLabel||null, action:x.action||"", entity_type:x.entityType||null,
      entity_id:x.entityId||null, details:x.details||null, metadata:x.metadata||{}
    };
  }
  function auditFromDb(x){
    return {
      id:x.id, at:x.event_time||"", userEmail:x.user_email||"", operator:x.user_label||"",
      action:x.action||"", entityType:x.entity_type||"", entityId:x.entity_id||"", details:x.details||"",
      metadata:x.metadata||{}
    };
  }

  api.init = async function(){
    if(api.mode!=="supabase") return {mode:"local",ready:false};
    if(!cfg.supabaseUrl || !cfg.supabasePublishableKey) throw new Error("إعدادات قاعدة البيانات المشتركة غير مكتملة");
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    api.client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    const {data,error}=await api.client.auth.getSession();
    if(error) throw error;
    api.session=data.session||null; api.ready=true;
    api.client.auth.onAuthStateChange((_event,session)=>{
      api.session=session||null;
      window.dispatchEvent(new CustomEvent("cash-cloud-auth",{detail:{session:api.session}}));
    });
    return {mode:"supabase",ready:true,session:api.session};
  };

  api.signInWithPassword = async function(email,password){
    if(!api.client) throw new Error("الوضع المشترك غير مفعّل");
    const {data,error}=await api.client.auth.signInWithPassword({email,password});
    if(error) throw error;
    api.session=data.session||null;
    return data;
  };

  api.signInWithOtp = async function(email){
    if(!api.client) throw new Error("الوضع المشترك غير مفعّل");
    const {error}=await api.client.auth.signInWithOtp({email,options:{shouldCreateUser:false}});
    if(error) throw error;
    return true;
  };

  api.signOut = async function(){
    if(!api.client) return;
    const {error}=await api.client.auth.signOut();
    if(error) throw error;
    api.session=null; api.access=null;
  };

  api.checkAccess = async function(){
    if(!api.client || !api.session) return null;
    const email=(api.session.user&&api.session.user.email)||"";
    const {data,error}=await api.client.from("cash_portal_access").select("email,role,display_name,enabled,user_id,must_change_password,managed_by_cash_portal").eq("email",email).maybeSingle();
    if(error) throw error;
    api.access=data||null;
    return api.access;
  };

  api.loadState = async function(){
    if(!api.client || !api.session) throw new Error("يجب تسجيل الدخول");
    const [rq,tx,im,au]=await Promise.all([
      api.client.from("cash_requests").select("*").order("created_at",{ascending:true}),
      api.client.from("cash_transactions").select("*").order("created_at",{ascending:true}),
      api.client.from("cash_imports").select("*").order("created_at",{ascending:true}),
      api.client.from("cash_audit_log").select("*").order("event_time",{ascending:true})
    ]);
    for(const x of [rq,tx,im,au]) if(x.error) throw x.error;
    return {
      requests:(rq.data||[]).map(requestFromDb),
      transactions:(tx.data||[]).map(txnFromDb),
      imports:(im.data||[]).map(importFromDb),
      auditLog:(au.data||[]).map(auditFromDb)
    };
  };

  api.syncState = async function(state){
    if(!api.client || !api.session) throw new Error("يجب تسجيل الدخول");
    const email=(api.session.user&&api.session.user.email)||"";
    const requests=(state.requests||[]).map(x=>requestToDb(x,email));
    const transactions=(state.transactions||[]).map(x=>txnToDb(x,email));
    const imports=(state.imports||[]).map(x=>importToDb(x,email));
    const audit=(state.auditLog||[]).map(x=>auditToDb(x,email));
    for(const rows of chunk(requests,250)){ if(!rows.length) continue; const {error}=await api.client.from("cash_requests").upsert(rows,{onConflict:"id"}); if(error) throw error; }
    for(const rows of chunk(transactions,250)){ if(!rows.length) continue; const {error}=await api.client.from("cash_transactions").upsert(rows,{onConflict:"id"}); if(error) throw error; }
    for(const rows of chunk(imports,100)){ if(!rows.length) continue; const {error}=await api.client.from("cash_imports").upsert(rows,{onConflict:"id"}); if(error) throw error; }
    for(const rows of chunk(audit,250)){ if(!rows.length) continue; const {error}=await api.client.from("cash_audit_log").upsert(rows,{onConflict:"id"}); if(error) throw error; }
    return {requests:requests.length,transactions:transactions.length,imports:imports.length,audit:audit.length};
  };

  api.adminUsers = async function(action,payload={}){
    if(!api.client || !api.session) throw new Error("يجب تسجيل الدخول");
    const res=await fetch(cfg.supabaseUrl+"/functions/v1/cash-user-admin",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer "+api.session.access_token,
        "apikey":cfg.supabasePublishableKey
      },
      body:JSON.stringify({action,...payload})
    });
    let body={};try{body=await res.json()}catch(_){}
    if(!res.ok){
      const err=new Error(body.message||body.error||"تعذر تنفيذ إدارة المستخدمين");
      err.code=body.error||"admin_action_failed";
      err.status=res.status;
      throw err;
    }
    return body;
  };

  api.isRemoteEmpty = async function(){
    if(!api.client || !api.session) return true;
    const [r,t]=await Promise.all([
      api.client.from("cash_requests").select("id",{count:"exact",head:true}),
      api.client.from("cash_transactions").select("id",{count:"exact",head:true})
    ]);
    if(r.error) throw r.error; if(t.error) throw t.error;
    return (r.count||0)===0 && (t.count||0)===0;
  };

  window.ArkanatCashCloud=api;
})();