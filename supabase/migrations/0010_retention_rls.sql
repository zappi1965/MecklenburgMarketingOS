-- =============================================================================
-- 0010_retention_rls.sql
-- RLS for the Retention / Win-Back tool (tables in 0009_retention_tool.sql).
-- =============================================================================

alter table public.retention_campaigns enable row level security;
alter table public.retention_targets   enable row level security;

-- --- retention_campaigns ----------------------------------------------------
create policy "retention: campaigns member read"
  on public.retention_campaigns for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'retention'));

create policy "retention: campaigns admin write"
  on public.retention_campaigns for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'retention'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'retention'));

create policy "retention: campaigns superadmin delete"
  on public.retention_campaigns for delete
  using (public.is_superadmin());

-- --- retention_targets (immutable log) --------------------------------------
create policy "retention: targets member read"
  on public.retention_targets for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'retention'));

create policy "retention: targets insert"
  on public.retention_targets for insert
  with check (true);

create policy "retention: targets superadmin delete"
  on public.retention_targets for delete
  using (public.is_superadmin());
