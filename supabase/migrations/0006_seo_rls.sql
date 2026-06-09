-- =============================================================================
-- 0006_seo_rls.sql
-- RLS for the SEO & Local Listings tool (tables in 0005_seo_tool.sql).
-- =============================================================================

alter table public.seo_profiles       enable row level security;
alter table public.seo_keywords       enable row level security;
alter table public.seo_rank_snapshots enable row level security;

-- --- seo_profiles -----------------------------------------------------------
create policy "seo: profiles member read"
  on public.seo_profiles for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'seo'));

create policy "seo: profiles admin write"
  on public.seo_profiles for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'seo'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'seo'));

create policy "seo: profiles superadmin delete"
  on public.seo_profiles for delete
  using (public.is_superadmin());

-- --- seo_keywords -----------------------------------------------------------
create policy "seo: keywords member read"
  on public.seo_keywords for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'seo'));

create policy "seo: keywords admin write"
  on public.seo_keywords for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'seo'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'seo'));

create policy "seo: keywords superadmin delete"
  on public.seo_keywords for delete
  using (public.is_superadmin());

-- --- seo_rank_snapshots (immutable history) ---------------------------------
create policy "seo: snapshots member read"
  on public.seo_rank_snapshots for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'seo'));

create policy "seo: snapshots admin insert"
  on public.seo_rank_snapshots for insert
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'seo'));

create policy "seo: snapshots superadmin delete"
  on public.seo_rank_snapshots for delete
  using (public.is_superadmin());
