(function(){
  const cfg = window.ARKANAT_CASH_CONFIG || {mode:"local"};
  const api = { ready:false, mode:cfg.mode||"local", client:null, session:null };

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===src);
      if(existing){ if(window.supabase) resolve(); else existing.addEventListener("load",resolve,{once:true}); return; }
      const s=document.createElement("script"); s.src=src; s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
  }

  api.init = async function(){
    if(api.mode!=="supabase") return {mode:"local",ready:false};
    if(!cfg.supabaseUrl || !cfg.supabasePublishableKey) throw new Error("إعدادات قاعدة البيانات المشتركة غير مكتملة");
    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    api.client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
    const {data}=await api.client.auth.getSession();
    api.session=data.session||null; api.ready=true;
    api.client.auth.onAuthStateChange((_event,session)=>{api.session=session||null; window.dispatchEvent(new CustomEvent("cash-cloud-auth",{detail:{session:api.session}}));});
    return {mode:"supabase",ready:true,session:api.session};
  };

  api.signInWithOtp = async function(email){
    if(!api.client) throw new Error("الوضع المشترك غير مفعّل");
    const redirectTo=location.origin+location.pathname;
    const {error}=await api.client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});
    if(error) throw error;
    return true;
  };

  api.signOut = async function(){
    if(!api.client) return;
    const {error}=await api.client.auth.signOut();
    if(error) throw error;
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
    return {requests:rq.data||[],transactions:tx.data||[],imports:im.data||[],auditLog:au.data||[]};
  };

  api.upsertRequest = async function(row){
    if(!api.client || !api.session) throw new Error("يجب تسجيل الدخول");
    const {data,error}=await api.client.from("cash_requests").upsert(row).select().single();
    if(error) throw error; return data;
  };

  api.upsertTransaction = async function(row){
    if(!api.client || !api.session) throw new Error("يجب تسجيل الدخول");
    const {data,error}=await api.client.from("cash_transactions").upsert(row).select().single();
    if(error) throw error; return data;
  };

  api.insertImport = async function(row){
    if(!api.client || !api.session) throw new Error("يجب تسجيل الدخول");
    const {data,error}=await api.client.from("cash_imports").insert(row).select().single();
    if(error) throw error; return data;
  };

  api.insertAudit = async function(row){
    if(!api.client || !api.session) throw new Error("يجب تسجيل الدخول");
    const {data,error}=await api.client.from("cash_audit_log").insert(row).select().single();
    if(error) throw error; return data;
  };

  window.ArkanatCashCloud=api;
})();