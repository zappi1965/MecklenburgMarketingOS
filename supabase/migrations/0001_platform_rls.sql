-- =============================================================================
-- 0001_platform_rls.sql
-- Row-Level Security, helper functions and audit triggers for MMOS.
--
-- Apply AFTER the drizzle-generated table migration (0000_*.sql).
-- This file is hand-maintained: every new table must be registered here with
-- at least one SELECT policy (see .claude/commands/goal.md → "Neue Tabelle").
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions — the single source of truth for all policies.
-- Never hardcode tenant/role logic inside a policy; call these instead.
-- -----------------------------------------------------------------------------

-- UUID of the caller's first active tenant membership.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.tenant_id
  from public.tenant_memberships m
  where m.user_id = auth.uid()
    and m.is_active = true
  order by m.created_at asc
  limit 1;
$$;

-- True when the caller is a platform superadmin.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_superadmin
       from public.user_profiles p
      where p.id = auth.uid()),
    false
  );
$$;

-- The caller's role within a given tenant, or null.
create or replace function public.tenant_role(t_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role::text
  from public.tenant_memberships m
  where m.user_id = auth.uid()
    and m.tenant_id = t_id
    and m.is_active = true
  limit 1;
$$;

-- True when the caller has any active membership in the tenant.
create or replace function public.is_tenant_member(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin()
      or exists (
        select 1
        from public.tenant_memberships m
        where m.user_id = auth.uid()
          and m.tenant_id = t_id
          and m.is_active = true
      );
$$;

-- True for owner/admin within the tenant (superadmin always passes).
create or replace function public.is_tenant_admin(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_superadmin()
      or public.tenant_role(t_id) in ('owner', 'admin');
$$;

-- True when the tenant has the given tool active or in trial.
create or replace function public.tool_active(t_id uuid, key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_tools tt
    where tt.tenant_id = t_id
      and tt.tool_key = key
      and tt.status in ('active', 'trial')
  );
$$;

-- -----------------------------------------------------------------------------
-- Audit trigger — append-only writer for write-critical tables.
-- -----------------------------------------------------------------------------

create or replace function public.audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_entity_id text;
  v_action public.audit_action;
  v_diff jsonb;
begin
  if (tg_op = 'INSERT') then
    v_tenant_id := new.tenant_id;
    v_entity_id := new.id::text;
    v_action := 'insert';
    v_diff := to_jsonb(new);
  elsif (tg_op = 'UPDATE') then
    v_tenant_id := new.tenant_id;
    v_entity_id := new.id::text;
    v_action := 'update';
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else -- DELETE
    v_tenant_id := old.tenant_id;
    v_entity_id := old.id::text;
    v_action := 'delete';
    v_diff := to_jsonb(old);
  end if;

  insert into public.audit_log (tenant_id, actor_id, action, entity_table, entity_id, diff)
  values (v_tenant_id, auth.uid(), v_action, tg_table_name, v_entity_id, v_diff);

  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

-- =============================================================================
-- Enable RLS on every table.
-- =============================================================================

alter table public.tenants              enable row level security;
alter table public.user_profiles        enable row level security;
alter table public.tenant_memberships   enable row level security;
alter table public.tenant_tools         enable row level security;
alter table public.audit_log            enable row level security;
alter table public.consent_records      enable row level security;

alter table public.loyalty_programs     enable row level security;
alter table public.qr_codes             enable row level security;
alter table public.loyalty_members      enable row level security;
alter table public.qr_scans             enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.loyalty_rewards      enable row level security;
alter table public.loyalty_redemptions  enable row level security;
alter table public.loyalty_campaigns    enable row level security;

alter table public.review_sources       enable row level security;
alter table public.review_invitations   enable row level security;
alter table public.reviews              enable row level security;

-- booking_* tables are created in 0002_booking_tool.sql; their RLS lives in
-- 0003_booking_rls.sql so it applies after the tables exist.

-- =============================================================================
-- PLATFORM POLICIES
-- =============================================================================

-- --- tenants ---------------------------------------------------------------
create policy "tenants: member read"
  on public.tenants for select
  using (public.is_tenant_member(id));

create policy "tenants: admin update"
  on public.tenants for update
  using (public.is_tenant_admin(id))
  with check (public.is_tenant_admin(id));

-- Tenant creation happens via the service role during onboarding.
create policy "tenants: superadmin insert"
  on public.tenants for insert
  with check (public.is_superadmin());

create policy "tenants: superadmin delete"
  on public.tenants for delete
  using (public.is_superadmin());

-- --- user_profiles ---------------------------------------------------------
-- A user can always see/update their own profile; superadmins see all.
create policy "user_profiles: self read"
  on public.user_profiles for select
  using (id = auth.uid() or public.is_superadmin());

create policy "user_profiles: self insert"
  on public.user_profiles for insert
  with check (id = auth.uid());

create policy "user_profiles: self update"
  on public.user_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_superadmin = (
    select p.is_superadmin from public.user_profiles p where p.id = auth.uid()
  ));

create policy "user_profiles: superadmin delete"
  on public.user_profiles for delete
  using (public.is_superadmin());

-- --- tenant_memberships ----------------------------------------------------
create policy "memberships: member read"
  on public.tenant_memberships for select
  using (public.is_tenant_member(tenant_id) or user_id = auth.uid());

create policy "memberships: admin write"
  on public.tenant_memberships for all
  using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- --- tenant_tools ----------------------------------------------------------
create policy "tenant_tools: member read"
  on public.tenant_tools for select
  using (public.is_tenant_member(tenant_id));

-- Tool status is driven by Stripe webhooks via the service role; admins may
-- read but not flip flags by hand.
create policy "tenant_tools: superadmin write"
  on public.tenant_tools for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- --- audit_log -------------------------------------------------------------
-- Append-only: INSERT + SELECT only. No UPDATE/DELETE policy → immutable.
create policy "audit_log: member read"
  on public.audit_log for select
  using (public.is_tenant_member(tenant_id));

create policy "audit_log: member insert"
  on public.audit_log for insert
  with check (public.is_tenant_member(tenant_id));

-- --- consent_records -------------------------------------------------------
-- No UPDATE/DELETE for tenants → 3-year retention. Withdrawal = new row.
create policy "consent_records: member read"
  on public.consent_records for select
  using (public.is_tenant_member(tenant_id));

-- Consent can be recorded by members AND through public flows (the app layer
-- validates the subject); inserts are immutable thereafter.
create policy "consent_records: insert"
  on public.consent_records for insert
  with check (true);

create policy "consent_records: superadmin delete"
  on public.consent_records for delete
  using (public.is_superadmin());

-- =============================================================================
-- TOOL 1: LOYALTY  (gated by tool_active(tenant_id, 'loyalty'))
-- =============================================================================

-- --- loyalty_programs ------------------------------------------------------
create policy "loyalty: programs member read"
  on public.loyalty_programs for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'));

create policy "loyalty: programs admin write"
  on public.loyalty_programs for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'loyalty'));

create policy "loyalty: programs superadmin delete"
  on public.loyalty_programs for delete
  using (public.is_superadmin());

-- --- qr_codes --------------------------------------------------------------
-- Publicly readable when active (scan landing); token validated in app layer.
create policy "loyalty: qr public read"
  on public.qr_codes for select
  using (is_active = true or public.is_tenant_member(tenant_id));

create policy "loyalty: qr admin write"
  on public.qr_codes for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'loyalty'));

create policy "loyalty: qr superadmin delete"
  on public.qr_codes for delete
  using (public.is_superadmin());

-- --- loyalty_members -------------------------------------------------------
create policy "loyalty: members member read"
  on public.loyalty_members for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'));

create policy "loyalty: members admin write"
  on public.loyalty_members for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'loyalty'));

-- DSGVO hard-delete only via superadmin (DSAR flow).
create policy "loyalty: members superadmin delete"
  on public.loyalty_members for delete
  using (public.is_superadmin());

-- --- qr_scans --------------------------------------------------------------
-- Immutable scan trail: members read; public scan flow inserts (app-validated).
create policy "loyalty: scans member read"
  on public.qr_scans for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'));

create policy "loyalty: scans public insert"
  on public.qr_scans for insert
  with check (true);

create policy "loyalty: scans superadmin delete"
  on public.qr_scans for delete
  using (public.is_superadmin());

-- --- loyalty_transactions --------------------------------------------------
-- Immutable ledger: members read; writes via service role (scan/redeem flows).
create policy "loyalty: txn member read"
  on public.loyalty_transactions for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'));

create policy "loyalty: txn insert"
  on public.loyalty_transactions for insert
  with check (true);

create policy "loyalty: txn superadmin delete"
  on public.loyalty_transactions for delete
  using (public.is_superadmin());

-- --- loyalty_rewards -------------------------------------------------------
-- Public read of active rewards (redeem catalogue); members see all.
create policy "loyalty: rewards public read"
  on public.loyalty_rewards for select
  using (is_active = true or public.is_tenant_member(tenant_id));

create policy "loyalty: rewards admin write"
  on public.loyalty_rewards for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'loyalty'));

create policy "loyalty: rewards superadmin delete"
  on public.loyalty_rewards for delete
  using (public.is_superadmin());

-- --- loyalty_redemptions ---------------------------------------------------
create policy "loyalty: redemptions member read"
  on public.loyalty_redemptions for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'));

-- Public redeem flow creates pending redemptions; staff confirm them.
create policy "loyalty: redemptions insert"
  on public.loyalty_redemptions for insert
  with check (true);

create policy "loyalty: redemptions admin update"
  on public.loyalty_redemptions for update
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'))
  with check (public.is_tenant_member(tenant_id)
          and public.tool_active(tenant_id, 'loyalty'));

create policy "loyalty: redemptions superadmin delete"
  on public.loyalty_redemptions for delete
  using (public.is_superadmin());

-- --- loyalty_campaigns ------------------------------------------------------
-- Public read of active campaigns (scan flow applies the multiplier); members
-- see all. Writes restricted to admins; scan_count bumps run via service role.
create policy "loyalty: campaigns public read"
  on public.loyalty_campaigns for select
  using (is_active = true or public.is_tenant_member(tenant_id));

create policy "loyalty: campaigns admin write"
  on public.loyalty_campaigns for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'loyalty'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'loyalty'));

create policy "loyalty: campaigns superadmin delete"
  on public.loyalty_campaigns for delete
  using (public.is_superadmin());

-- =============================================================================
-- TOOL 2: REVIEWS  (gated by tool_active(tenant_id, 'reviews'))
-- =============================================================================

-- --- review_sources --------------------------------------------------------
create policy "reviews: sources member read"
  on public.review_sources for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'reviews'));

create policy "reviews: sources admin write"
  on public.review_sources for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'reviews'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'reviews'));

create policy "reviews: sources superadmin delete"
  on public.review_sources for delete
  using (public.is_superadmin());

-- --- review_invitations ----------------------------------------------------
-- Public read by token (validated in app layer) so the form can load.
create policy "reviews: invitations public read"
  on public.review_invitations for select
  using (true);

create policy "reviews: invitations admin write"
  on public.review_invitations for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'reviews'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'reviews'));

create policy "reviews: invitations superadmin delete"
  on public.review_invitations for delete
  using (public.is_superadmin());

-- --- reviews ---------------------------------------------------------------
create policy "reviews: member read"
  on public.reviews for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'reviews'));

-- Public submission flow (consent recorded first in the app layer).
create policy "reviews: public insert"
  on public.reviews for insert
  with check (true);

-- Store owner responds to / soft-deletes reviews.
create policy "reviews: admin update"
  on public.reviews for update
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'reviews'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'reviews'));

-- DSGVO hard-delete only via superadmin.
create policy "reviews: superadmin delete"
  on public.reviews for delete
  using (public.is_superadmin());

-- =============================================================================
-- Audit triggers — attach to write-critical tables.
-- =============================================================================

create trigger audit_loyalty_members
  after insert or update or delete on public.loyalty_members
  for each row execute function public.audit_log_trigger();

create trigger audit_loyalty_redemptions
  after insert or update or delete on public.loyalty_redemptions
  for each row execute function public.audit_log_trigger();

create trigger audit_loyalty_rewards
  after insert or update or delete on public.loyalty_rewards
  for each row execute function public.audit_log_trigger();

create trigger audit_reviews
  after insert or update or delete on public.reviews
  for each row execute function public.audit_log_trigger();

create trigger audit_tenant_tools
  after insert or update or delete on public.tenant_tools
  for each row execute function public.audit_log_trigger();

create trigger audit_loyalty_campaigns
  after insert or update or delete on public.loyalty_campaigns
  for each row execute function public.audit_log_trigger();
