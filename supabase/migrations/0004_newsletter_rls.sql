-- =============================================================================
-- 0004_newsletter_rls.sql
-- RLS for the Newsletter / CRM-Mail tool (tables in 0003_newsletter_tool.sql).
-- =============================================================================

alter table public.newsletter_contacts  enable row level security;
alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_sends     enable row level security;

-- --- newsletter_contacts ----------------------------------------------------
create policy "newsletter: contacts member read"
  on public.newsletter_contacts for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'newsletter'));

-- Public subscribe flow inserts a contact (consent recorded separately).
create policy "newsletter: contacts public insert"
  on public.newsletter_contacts for insert
  with check (true);

create policy "newsletter: contacts admin update"
  on public.newsletter_contacts for update
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'newsletter'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'newsletter'));

-- DSGVO hard-delete only via superadmin.
create policy "newsletter: contacts superadmin delete"
  on public.newsletter_contacts for delete
  using (public.is_superadmin());

-- --- newsletter_campaigns ---------------------------------------------------
create policy "newsletter: campaigns member read"
  on public.newsletter_campaigns for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'newsletter'));

create policy "newsletter: campaigns admin write"
  on public.newsletter_campaigns for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'newsletter'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'newsletter'));

create policy "newsletter: campaigns superadmin delete"
  on public.newsletter_campaigns for delete
  using (public.is_superadmin());

-- --- newsletter_sends (immutable delivery log) ------------------------------
create policy "newsletter: sends member read"
  on public.newsletter_sends for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'newsletter'));

create policy "newsletter: sends insert"
  on public.newsletter_sends for insert
  with check (true);

create policy "newsletter: sends superadmin delete"
  on public.newsletter_sends for delete
  using (public.is_superadmin());

-- Audit trigger on contacts (write-critical / PII).
create trigger audit_newsletter_contacts
  after insert or update or delete on public.newsletter_contacts
  for each row execute function public.audit_log_trigger();

create trigger audit_newsletter_campaigns
  after insert or update or delete on public.newsletter_campaigns
  for each row execute function public.audit_log_trigger();
