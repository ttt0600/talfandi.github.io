-- بوابة العهد النقدية — أركانات
-- مخطط قاعدة البيانات المستقلة (Supabase/PostgreSQL)
-- لا يرتبط بأي قاعدة بيانات أو نظام آخر.

create extension if not exists pgcrypto;

create table if not exists public.cash_requests (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  request_date date,
  region text,
  supervisor text not null,
  amount numeric(14,2) not null check (amount >= 0),
  purpose text,
  site text,
  beneficiary text,
  iban text,
  source_channel text,
  source_reference text,
  source_message text,
  finance_notes text,
  status text not null default 'جديد',
  source_file text,
  source_sheet text,
  source_row text,
  snapshot_status text not null default 'current',
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  funded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  legacy_id text,
  request_id uuid references public.cash_requests(id) on delete set null,
  transaction_date date,
  source_date_raw text,
  date_status text,
  transaction_type text not null,
  amount numeric(14,2) not null check (amount >= 0),
  opening_sign smallint check (opening_sign in (-1,1)),
  region text,
  custody_holder text,
  operational_supervisor text,
  transfer_to text,
  site text,
  absent_employee text,
  cover_employee text,
  reason text,
  description text,
  document_ref text,
  vehicle text,
  funding_method text,
  funding_ref text,
  beneficiary text,
  source_channel text,
  source_reference text,
  source_message text,
  notes text,
  reported_balance numeric(14,2),
  status text not null default 'مسجل',
  source_name text,
  source_file text,
  source_sheet text,
  source_row text,
  scope_key text,
  snapshot_status text not null default 'current',
  summary_derived boolean not null default false,
  control_exclude boolean not null default false,
  linked_transaction_id uuid references public.cash_transactions(id) on delete set null,
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  fingerprint text,
  import_mode text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.cash_audit_log (
  id uuid primary key default gen_random_uuid(),
  event_time timestamptz not null default now(),
  user_id uuid references auth.users(id),
  user_label text,
  action text not null,
  entity_type text,
  entity_id text,
  details text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_cash_requests_status on public.cash_requests(status);
create index if not exists idx_cash_requests_date on public.cash_requests(request_date);
create index if not exists idx_cash_transactions_date on public.cash_transactions(transaction_date);
create index if not exists idx_cash_transactions_holder on public.cash_transactions(custody_holder);
create index if not exists idx_cash_transactions_type on public.cash_transactions(transaction_type);
create index if not exists idx_cash_transactions_scope on public.cash_transactions(scope_key);
create index if not exists idx_cash_transactions_snapshot on public.cash_transactions(snapshot_status);
create index if not exists idx_cash_imports_fingerprint on public.cash_imports(fingerprint);
create index if not exists idx_cash_audit_time on public.cash_audit_log(event_time desc);

alter table public.cash_requests enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.cash_imports enable row level security;
alter table public.cash_audit_log enable row level security;

-- النسخة التجريبية المشتركة: كل مستخدم مصادق عليه داخل المشروع يستطيع القراءة والكتابة.
-- يمكن تضييق الصلاحيات لاحقاً إلى محاسب منطقة/مدير مالي بعد تثبيت التشغيل.
drop policy if exists "cash_requests_authenticated_all" on public.cash_requests;
create policy "cash_requests_authenticated_all" on public.cash_requests
for all to authenticated using (true) with check (true);

drop policy if exists "cash_transactions_authenticated_all" on public.cash_transactions;
create policy "cash_transactions_authenticated_all" on public.cash_transactions
for all to authenticated using (true) with check (true);

drop policy if exists "cash_imports_authenticated_all" on public.cash_imports;
create policy "cash_imports_authenticated_all" on public.cash_imports
for all to authenticated using (true) with check (true);

drop policy if exists "cash_audit_authenticated_all" on public.cash_audit_log;
create policy "cash_audit_authenticated_all" on public.cash_audit_log
for select, insert to authenticated using (true) with check (true);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cash_requests_set_updated_at on public.cash_requests;
create trigger cash_requests_set_updated_at before update on public.cash_requests
for each row execute function public.set_updated_at();

drop trigger if exists cash_transactions_set_updated_at on public.cash_transactions;
create trigger cash_transactions_set_updated_at before update on public.cash_transactions
for each row execute function public.set_updated_at();
