
-- MMOS v18 Global Notifications + Profile Pictures Patch

alter table public.notifications add column if not exists actor_name text;
alter table public.notifications add column if not exists actor_avatar text;
alter table public.notifications add column if not exists is_read boolean default false;
alter table public.notifications add column if not exists type text default 'system';

alter table public.admin_profiles add column if not exists avatar_url text;

update public.admin_profiles
set display_name = 'DominiqueMM'
where display_name in ('Admin','admin');

insert into public.admin_profiles (display_name, email, role, permissions)
values
('DominiqueMM','dominique@mm.local','admin','{"all": true}'::jsonb),
('JanneMM','janne@mm.local','admin','{"all": true}'::jsonb)
on conflict (display_name) do update
set role = excluded.role,
    permissions = excluded.permissions;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
('avatars','avatars',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public;

drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects for insert with check (bucket_id = 'avatars');
