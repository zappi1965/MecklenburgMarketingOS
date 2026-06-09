-- =============================================================================
-- 0009_shortlinks_rls.sql
-- RLS for the Link Shortener tool (tables in 0008_shortlinks_tool.sql).
-- The public redirect resolves links via a server route (service role); link
-- rows are not exposed to anon directly.
-- =============================================================================

alter table public.short_links       enable row level security;
alter table public.short_link_clicks enable row level security;

-- --- short_links ------------------------------------------------------------
create policy "links: member read"
  on public.short_links for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'links'));

create policy "links: admin write"
  on public.short_links for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'links'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'links'));

create policy "links: superadmin delete"
  on public.short_links for delete
  using (public.is_superadmin());

-- --- short_link_clicks (immutable log) --------------------------------------
create policy "links: clicks member read"
  on public.short_link_clicks for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'links'));

create policy "links: clicks insert"
  on public.short_link_clicks for insert
  with check (true);

create policy "links: clicks superadmin delete"
  on public.short_link_clicks for delete
  using (public.is_superadmin());
