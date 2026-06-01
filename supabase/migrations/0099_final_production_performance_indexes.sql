-- MMOS Final Production Performance Index Pack
-- Safe to run multiple times.

create index if not exists idx_mmos_v33_records_customer_resource
  on public.v33_functional_records (customer_id, resource);

create index if not exists idx_mmos_v33_records_resource_local
  on public.v33_functional_records (resource, local_id);

create index if not exists idx_mmos_v33_records_customer_resource_local
  on public.v33_functional_records (customer_id, resource, local_id);

create index if not exists idx_mmos_v33_records_resource_status_created
  on public.v33_functional_records (resource, status, created_at desc);

create index if not exists idx_mmos_qr_campaigns_customer_slug
  on public.qr_campaigns (customer_id, slug);

create index if not exists idx_mmos_qr_campaigns_active_slug
  on public.qr_campaigns (active, slug);

create index if not exists idx_mmos_loyalty_programs_customer_slug
  on public.loyalty_programs (customer_id, slug);

create index if not exists idx_mmos_loyalty_transactions_member_action_created
  on public.loyalty_transactions (loyalty_customer_id, action, created_at desc);

create index if not exists idx_mmos_loyalty_transactions_customer_created
  on public.loyalty_transactions (customer_id, created_at desc);

create index if not exists idx_mmos_review_feedback_customer_created
  on public.review_feedback (customer_id, created_at desc);

create index if not exists idx_mmos_tool_access_customer_tool
  on public.customer_tool_access (customer_id, tool_key);

create index if not exists idx_mmos_activity_logs_customer_created
  on public.activity_logs (customer_id, created_at desc);

create index if not exists idx_mmos_customer_files_customer_created
  on public.customer_files (customer_id, created_at desc);

create index if not exists idx_mmos_invoices_customer_status
  on public.invoices (customer_id, status);
