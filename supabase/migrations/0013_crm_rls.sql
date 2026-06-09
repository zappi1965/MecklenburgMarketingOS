-- =============================================================================
-- 0013_crm_rls.sql
-- RLS for the CRM & Leads tool (tables in 0012_crm_tool.sql).
-- =============================================================================

alter table public.crm_contacts enable row level security;
alter table public.crm_deals    enable row level security;

-- --- crm_contacts -----------------------------------------------------------
create policy "crm: contacts member read"
  on public.crm_contacts for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'crm'));

create policy "crm: contacts member write"
  on public.crm_contacts for all
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'crm'))
  with check (public.is_tenant_member(tenant_id)
          and public.tool_active(tenant_id, 'crm'));

create policy "crm: contacts superadmin delete"
  on public.crm_contacts for delete
  using (public.is_superadmin());

-- --- crm_deals --------------------------------------------------------------
create policy "crm: deals member read"
  on public.crm_deals for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'crm'));

create policy "crm: deals member write"
  on public.crm_deals for all
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'crm'))
  with check (public.is_tenant_member(tenant_id)
          and public.tool_active(tenant_id, 'crm'));

create policy "crm: deals superadmin delete"
  on public.crm_deals for delete
  using (public.is_superadmin());

-- Audit trigger on contacts (PII / write-critical).
create trigger audit_crm_contacts
  after insert or update or delete on public.crm_contacts
  for each row execute function public.audit_log_trigger();
