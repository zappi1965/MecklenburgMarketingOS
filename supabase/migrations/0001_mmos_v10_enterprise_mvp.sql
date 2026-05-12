create extension if not exists "pgcrypto";

create table if not exists public.profiles (id uuid primary key,email text unique,full_name text,phone text,role text not null default 'customer',avatar_url text,created_at timestamptz not null default now());
create table if not exists public.customers (id uuid primary key default gen_random_uuid(),name text not null,branch text,contact_name text,email text unique,phone text,status text not null default 'Lead',lifecycle_status text not null default 'Lead',rating numeric(3,2) not null default 0,revenue numeric(12,2) not null default 0,notes text,created_at timestamptz not null default now());
create table if not exists public.user_customer_access (user_id uuid not null references public.profiles(id) on delete cascade,customer_id uuid not null references public.customers(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,customer_id));
create or replace function public.is_admin() returns boolean language sql stable as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','employee','support','sales','seo_manager','buchhaltung')); $$;
create or replace function public.can_access_customer(cid uuid) returns boolean language sql stable as $$ select public.is_admin() or exists(select 1 from public.user_customer_access where user_id=auth.uid() and customer_id=cid); $$;

create table if not exists public.customer_tool_access (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,tool_key text not null,enabled boolean not null default true,source_package text,created_at timestamptz not null default now(),unique(customer_id,tool_key));
create table if not exists public.activity_logs (id uuid primary key default gen_random_uuid(),customer_id uuid references public.customers(id) on delete cascade,user_id uuid references public.profiles(id) on delete set null,event_type text not null,title text not null,description text,entity text,entity_id uuid,created_at timestamptz not null default now());
create table if not exists public.notifications (id uuid primary key default gen_random_uuid(),customer_id uuid references public.customers(id) on delete cascade,user_id uuid references public.profiles(id) on delete cascade,title text not null,message text,type text not null default 'info',priority text not null default 'Normal',read boolean not null default false,target_view text,created_at timestamptz not null default now());
create table if not exists public.automation_rules (id uuid primary key default gen_random_uuid(),name text not null,trigger_type text not null,action_type text not null,customer_id uuid references public.customers(id) on delete cascade,enabled boolean not null default true,config jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create table if not exists public.automation_runs (id uuid primary key default gen_random_uuid(),customer_id uuid references public.customers(id) on delete cascade,rule_id uuid references public.automation_rules(id) on delete set null,trigger_type text,action_type text,status text not null default 'pending',payload jsonb not null default '{}'::jsonb,error_message text,created_at timestamptz not null default now());
create table if not exists public.audit_logs (id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id) on delete set null,customer_id uuid references public.customers(id) on delete cascade,action text not null,entity text,entity_id uuid,before_data jsonb,after_data jsonb,created_at timestamptz not null default now());

create table if not exists public.offers (id uuid primary key default gen_random_uuid(),offer_number text unique not null,customer_id uuid not null references public.customers(id) on delete cascade,title text not null,amount numeric(12,2) not null default 0,status text not null default 'Offen',package_name text,package_price numeric(12,2),package_tools text[],file_name text,file_url text,uploaded_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.contracts (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,contract_name text not null,package_name text,monthly_value numeric(12,2) not null default 0,start_date date not null default current_date,end_date date,cancellation_notice_days integer not null default 30,status text not null default 'Aktiv',file_name text,file_url text,created_at timestamptz not null default now());
create table if not exists public.invoices (id uuid primary key default gen_random_uuid(),invoice_number text unique not null,customer_id uuid not null references public.customers(id) on delete cascade,amount numeric(12,2) not null default 0,service text,status text not null default 'Offen',due_date date,paid_at timestamptz,file_url text,created_at timestamptz not null default now());
create table if not exists public.reminders (id uuid primary key default gen_random_uuid(),invoice_id uuid references public.invoices(id) on delete cascade,customer_id uuid not null references public.customers(id) on delete cascade,reminder_number text,level text not null default '1. Mahnung',fee numeric(12,2) not null default 15,status text not null default 'Offen',file_url text,created_at timestamptz not null default now());

create table if not exists public.tickets (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,title text not null,description text,status text not null default 'angekommen',priority text not null default 'Normal',feedback text,created_by uuid references public.profiles(id) on delete set null,created_at timestamptz not null default now());
create table if not exists public.ticket_messages (id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.tickets(id) on delete cascade,author_id uuid references public.profiles(id) on delete set null,message text not null,created_at timestamptz not null default now());
create table if not exists public.service_categories (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,name text not null,price numeric(12,2) not null default 0,duration_minutes integer not null default 60,created_at timestamptz not null default now());
create table if not exists public.appointments (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,service_category_id uuid references public.service_categories(id) on delete set null,client_name text,appointment_date date not null,start_time text,end_time text,notes text,invoice_id uuid references public.invoices(id) on delete set null,created_at timestamptz not null default now());

create table if not exists public.seo_traffic (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,month text,organic_traffic integer not null default 0,impressions integer not null default 0,clicks integer not null default 0,ctr numeric(6,2) not null default 0,avg_position numeric(6,2) not null default 0,top10_keywords integer not null default 0,backlinks integer not null default 0,technical_score integer not null default 0,local_visibility integer not null default 0,created_at timestamptz not null default now());
create table if not exists public.seo_keywords (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,keyword text not null,position numeric(6,2) not null default 0,impressions integer not null default 0,clicks integer not null default 0,created_at timestamptz not null default now());
create table if not exists public.local_seo_heatmap (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,area_name text,keyword text,rank_position integer not null default 0,visibility_score integer not null default 0,recommendation text,created_at timestamptz not null default now());
create table if not exists public.review_ai_replies (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,reviewer_name text,rating integer check (rating between 1 and 5),review_text text,suggested_reply text,tone text not null default 'professionell',status text not null default 'Entwurf',bad_words_detected boolean not null default false,created_at timestamptz not null default now());
create table if not exists public.customer_goals (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,created_by uuid references public.profiles(id) on delete set null,goal_name text not null,metric text not null,target_value numeric(12,2) not null default 0,current_value numeric(12,2) not null default 0,start_date date default current_date,end_date date,status text not null default 'Aktiv',auto_current boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.integrations (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,platform text,api_key text,account_id text,location_id text,connected_email text,enabled boolean not null default true,last_sync_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.multi_locations (id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.customers(id) on delete cascade,location_name text not null,address text,phone text,google_profile_url text,enabled boolean not null default true,location_user_id uuid references public.profiles(id) on delete set null,login_email text,login_password_hint text,created_at timestamptz not null default now());
create table if not exists public.sales_pipeline (id uuid primary key default gen_random_uuid(),customer_id uuid references public.customers(id) on delete cascade,deal_name text not null,stage text not null default 'Lead',value numeric(12,2) not null default 0,probability integer not null default 25,expected_close_date date,notes text,created_at timestamptz not null default now());

do $$ declare t text; begin
  foreach t in array array['profiles','customers','user_customer_access','customer_tool_access','activity_logs','notifications','automation_rules','automation_runs','audit_logs','offers','contracts','invoices','reminders','tickets','ticket_messages','service_categories','appointments','seo_traffic','seo_keywords','local_seo_heatmap','review_ai_replies','customer_goals','integrations','multi_locations','sales_pipeline']
  loop execute format('alter table public.%I enable row level security',t); end loop;
end $$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (id=auth.uid() or public.is_admin());
drop policy if exists profiles_write on public.profiles;
create policy profiles_write on public.profiles for all using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());

drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers for select using (public.is_admin() or public.can_access_customer(id));
drop policy if exists customers_write on public.customers;
create policy customers_write on public.customers for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists uca_read on public.user_customer_access;
create policy uca_read on public.user_customer_access for select using (user_id=auth.uid() or public.is_admin());
drop policy if exists uca_write on public.user_customer_access;
create policy uca_write on public.user_customer_access for all using (public.is_admin()) with check (public.is_admin());

do $$ declare t text; begin
  foreach t in array array['customer_tool_access','activity_logs','notifications','offers','contracts','invoices','reminders','tickets','service_categories','appointments','seo_traffic','seo_keywords','local_seo_heatmap','review_ai_replies','customer_goals','integrations','multi_locations','sales_pipeline']
  loop
    execute format('drop policy if exists %I on public.%I',t||'_read',t);
    execute format('create policy %I on public.%I for select using (public.can_access_customer(customer_id))',t||'_read',t);
    execute format('drop policy if exists %I on public.%I',t||'_write',t);
    execute format('create policy %I on public.%I for all using (public.can_access_customer(customer_id)) with check (public.can_access_customer(customer_id))',t||'_write',t);
  end loop;
end $$;

drop policy if exists automation_admin_all on public.automation_rules;
create policy automation_admin_all on public.automation_rules for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists automation_runs_admin_all on public.automation_runs;
create policy automation_runs_admin_all on public.automation_runs for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists audit_admin_all on public.audit_logs;
create policy audit_admin_all on public.audit_logs for all using (public.is_admin()) with check (public.is_admin());

insert into public.automation_rules(name,trigger_type,action_type,enabled,config) values
('Angebot gewonnen → Tools freischalten','offer_won','unlock_tools',true,'{}'::jsonb),
('Rechnung überfällig → Mahnung','invoice_overdue','create_reminder',true,'{}'::jsonb),
('Neues Ticket → Notification','ticket_created','notify_admin',true,'{}'::jsonb)
on conflict do nothing;