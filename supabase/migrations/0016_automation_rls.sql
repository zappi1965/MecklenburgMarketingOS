-- =============================================================================
-- 0016_automation_rls.sql
-- RLS for the Automation tool (tables in 0015_automation_tool.sql).
-- =============================================================================

alter table public.automation_flows enable row level security;
alter table public.automation_runs  enable row level security;

-- --- automation_flows -------------------------------------------------------
create policy "automation: flows member read"
  on public.automation_flows for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'automation'));

create policy "automation: flows admin write"
  on public.automation_flows for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'automation'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'automation'));

create policy "automation: flows superadmin delete"
  on public.automation_flows for delete
  using (public.is_superadmin());

-- --- automation_runs (immutable log) ----------------------------------------
create policy "automation: runs member read"
  on public.automation_runs for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'automation'));

create policy "automation: runs insert"
  on public.automation_runs for insert
  with check (true);

create policy "automation: runs superadmin delete"
  on public.automation_runs for delete
  using (public.is_superadmin());

-- Audit trigger on flows.
create trigger audit_automation_flows
  after insert or update or delete on public.automation_flows
  for each row execute function public.audit_log_trigger();
