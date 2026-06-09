-- =============================================================================
-- 0014_coupons_rls.sql
-- RLS for the Coupons tool (tables in 0013_coupons_tool.sql).
-- Public validation runs through a service-role action; rows aren't exposed.
-- =============================================================================

alter table public.coupons             enable row level security;
alter table public.coupon_redemptions  enable row level security;

-- --- coupons ----------------------------------------------------------------
create policy "coupons: member read"
  on public.coupons for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'coupons'));

create policy "coupons: member write"
  on public.coupons for all
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'coupons'))
  with check (public.is_tenant_member(tenant_id)
          and public.tool_active(tenant_id, 'coupons'));

create policy "coupons: superadmin delete"
  on public.coupons for delete
  using (public.is_superadmin());

-- --- coupon_redemptions (immutable log) -------------------------------------
create policy "coupons: redemptions member read"
  on public.coupon_redemptions for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'coupons'));

create policy "coupons: redemptions insert"
  on public.coupon_redemptions for insert
  with check (true);

create policy "coupons: redemptions superadmin delete"
  on public.coupon_redemptions for delete
  using (public.is_superadmin());

-- Audit trigger on coupons.
create trigger audit_coupons
  after insert or update or delete on public.coupons
  for each row execute function public.audit_log_trigger();
