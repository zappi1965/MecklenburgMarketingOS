
-- MMOS v18 Demo Sandbox Isolation
-- Demo no longer needs Supabase writes. This patch only marks demo customers and documents isolation.

alter table if exists public.customers add column if not exists is_demo boolean default false;
alter table if exists public.invoices add column if not exists is_demo boolean default false;

update public.customers
set is_demo = true
where lower(coalesce(name,'')) like 'demo %'
   or lower(coalesce(name,'')) in (
      'demo alexas inselblick',
      'demo barber lounge rostock',
      'demo norddach gmbh'
   );

update public.invoices i
set is_demo = true
where exists (
  select 1 from public.customers c
  where c.id = i.customer_id and coalesce(c.is_demo,false) = true
);

insert into public.security_audit_logs (actor_name, action, entity_type, metadata)
values ('System','demo_sandbox_isolation_applied','system','{"version":"0024","note":"demo writes are local browser sandbox"}'::jsonb)
on conflict do nothing;
