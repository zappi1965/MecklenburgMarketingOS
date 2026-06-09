-- =============================================================================
-- 0015_sms_rls.sql
-- RLS for the SMS Marketing tool (tables in 0014_sms_tool.sql).
-- =============================================================================

alter table public.sms_contacts  enable row level security;
alter table public.sms_campaigns enable row level security;
alter table public.sms_sends     enable row level security;

-- --- sms_contacts -----------------------------------------------------------
create policy "sms: contacts member read"
  on public.sms_contacts for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'sms'));

create policy "sms: contacts admin write"
  on public.sms_contacts for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'sms'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'sms'));

create policy "sms: contacts superadmin delete"
  on public.sms_contacts for delete
  using (public.is_superadmin());

-- --- sms_campaigns ----------------------------------------------------------
create policy "sms: campaigns member read"
  on public.sms_campaigns for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'sms'));

create policy "sms: campaigns admin write"
  on public.sms_campaigns for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'sms'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'sms'));

create policy "sms: campaigns superadmin delete"
  on public.sms_campaigns for delete
  using (public.is_superadmin());

-- --- sms_sends (immutable log) ----------------------------------------------
create policy "sms: sends member read"
  on public.sms_sends for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'sms'));

create policy "sms: sends insert"
  on public.sms_sends for insert
  with check (true);

create policy "sms: sends superadmin delete"
  on public.sms_sends for delete
  using (public.is_superadmin());

-- Audit triggers (PII / write-critical).
create trigger audit_sms_contacts
  after insert or update or delete on public.sms_contacts
  for each row execute function public.audit_log_trigger();

create trigger audit_sms_campaigns
  after insert or update or delete on public.sms_campaigns
  for each row execute function public.audit_log_trigger();
