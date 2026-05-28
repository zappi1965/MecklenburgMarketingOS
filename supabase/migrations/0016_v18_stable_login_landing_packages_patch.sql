
-- MMOS v18 Stable Login Landing Packages Patch

alter table public.admin_profiles add column if not exists avatar_url text;
alter table public.notifications add column if not exists actor_avatar text;
alter table public.notifications add column if not exists actor_name text;
alter table public.notifications add column if not exists is_read boolean default false;
alter table public.notifications add column if not exists type text default 'system';
alter table public.customers add column if not exists is_demo boolean default false;
alter table public.invoices add column if not exists is_demo boolean default false;

update public.customers set is_demo = true where name ilike 'DEMO %';
update public.invoices i
set is_demo = true
where exists (select 1 from public.customers c where c.id = i.customer_id and c.is_demo = true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars','avatars',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert with check (bucket_id = 'avatars');

create or replace view public.revenue_invoices_real as
select i.*
from public.invoices i
left join public.customers c on c.id = i.customer_id
where coalesce(i.is_demo,false) = false
and coalesce(c.is_demo,false) = false;
