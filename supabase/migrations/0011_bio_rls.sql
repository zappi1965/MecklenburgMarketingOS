-- =============================================================================
-- 0011_bio_rls.sql
-- RLS for the Link-in-Bio tool (tables in 0010_bio_tool.sql).
-- =============================================================================

alter table public.bio_pages enable row level security;
alter table public.bio_links enable row level security;

-- --- bio_pages --------------------------------------------------------------
create policy "bio: pages public read"
  on public.bio_pages for select
  using (is_active = true or public.is_tenant_member(tenant_id));

create policy "bio: pages admin write"
  on public.bio_pages for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'bio'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'bio'));

create policy "bio: pages superadmin delete"
  on public.bio_pages for delete
  using (public.is_superadmin());

-- --- bio_links --------------------------------------------------------------
create policy "bio: links public read"
  on public.bio_links for select
  using (is_active = true or public.is_tenant_member(tenant_id));

create policy "bio: links admin write"
  on public.bio_links for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'bio'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'bio'));

create policy "bio: links superadmin delete"
  on public.bio_links for delete
  using (public.is_superadmin());
