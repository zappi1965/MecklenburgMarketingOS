-- =============================================================================
-- 0005_referral_rls.sql
-- RLS for the Referral tool (tables in 0004_referral_tool.sql).
-- =============================================================================

alter table public.referral_programs enable row level security;
alter table public.referral_codes    enable row level security;
alter table public.referrals          enable row level security;

-- --- referral_programs ------------------------------------------------------
create policy "referral: programs member read"
  on public.referral_programs for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'referral'));

create policy "referral: programs admin write"
  on public.referral_programs for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'referral'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'referral'));

create policy "referral: programs superadmin delete"
  on public.referral_programs for delete
  using (public.is_superadmin());

-- --- referral_codes ---------------------------------------------------------
-- Public read by code (referral landing); members see all.
create policy "referral: codes public read"
  on public.referral_codes for select
  using (true);

create policy "referral: codes insert"
  on public.referral_codes for insert
  with check (true);

create policy "referral: codes superadmin delete"
  on public.referral_codes for delete
  using (public.is_superadmin());

-- --- referrals --------------------------------------------------------------
create policy "referral: referrals member read"
  on public.referrals for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'referral'));

-- Public referral-claim flow inserts (app-layer validates).
create policy "referral: referrals public insert"
  on public.referrals for insert
  with check (true);

create policy "referral: referrals superadmin delete"
  on public.referrals for delete
  using (public.is_superadmin());

-- Audit trigger on referrals (point-granting / write-critical).
create trigger audit_referrals
  after insert or update or delete on public.referrals
  for each row execute function public.audit_log_trigger();
