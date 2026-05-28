-- AI Social-Post-Generator: gespeicherte Post-Entwuerfe.
-- Idempotent.

create extension if not exists pgcrypto;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  platform text not null,                 -- instagram | facebook | google_post | linkedin
  topic text,
  tone text,
  language text not null default 'de',
  content text not null,
  hashtags text[] not null default '{}',
  status text not null default 'draft',    -- draft | scheduled | published
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_social_posts_customer on public.social_posts(customer_id, status);

alter table public.social_posts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='social_posts' and policyname='mmos_admin_write') then
    begin
      execute 'create policy mmos_admin_write on public.social_posts for all to authenticated using (coalesce(public.mmos_is_admin(), false)) with check (coalesce(public.mmos_is_admin(), false))';
    exception when others then raise notice 'mmos_admin_write skipped on social_posts: %', sqlerrm; end;
  end if;
end $$;
