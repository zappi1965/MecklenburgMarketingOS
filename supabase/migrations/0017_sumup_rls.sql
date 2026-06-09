-- =============================================================================
-- 0017_sumup_rls.sql
-- RLS for the SumUp tool (tables in 0016_sumup_tool.sql).
-- =============================================================================

alter table public.sumup_transactions enable row level security;

create policy "sumup: txn member read"
  on public.sumup_transactions for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'sumup'));

create policy "sumup: txn member write"
  on public.sumup_transactions for all
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'sumup'))
  with check (public.is_tenant_member(tenant_id)
          and public.tool_active(tenant_id, 'sumup'));

create policy "sumup: txn superadmin delete"
  on public.sumup_transactions for delete
  using (public.is_superadmin());

-- Audit trigger (revenue / write-critical).
create trigger audit_sumup_transactions
  after insert or update or delete on public.sumup_transactions
  for each row execute function public.audit_log_trigger();
