-- =============================================================================
-- 0012_social_rls.sql
-- RLS for the Social Media Planner tool (tables in 0011_social_tool.sql).
-- Internal planning data — no public access.
-- =============================================================================

alter table public.social_posts enable row level security;

create policy "social: posts member read"
  on public.social_posts for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'social'));

create policy "social: posts admin write"
  on public.social_posts for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'social'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'social'));

create policy "social: posts superadmin delete"
  on public.social_posts for delete
  using (public.is_superadmin());
