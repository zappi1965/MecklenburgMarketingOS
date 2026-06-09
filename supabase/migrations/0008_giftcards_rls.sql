-- =============================================================================
-- 0008_giftcards_rls.sql
-- RLS for the Gift Cards tool (tables in 0007_giftcards_tool.sql).
-- Gift card rows hold stored value, so they are NOT publicly readable; the
-- public balance check goes through a server action (service role) that returns
-- only the balance/status.
-- =============================================================================

alter table public.gift_cards             enable row level security;
alter table public.gift_card_transactions enable row level security;

-- --- gift_cards -------------------------------------------------------------
create policy "giftcards: cards member read"
  on public.gift_cards for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'giftcards'));

create policy "giftcards: cards admin write"
  on public.gift_cards for all
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'giftcards'))
  with check (public.is_tenant_member(tenant_id)
          and public.tool_active(tenant_id, 'giftcards'));

create policy "giftcards: cards superadmin delete"
  on public.gift_cards for delete
  using (public.is_superadmin());

-- --- gift_card_transactions (immutable ledger) ------------------------------
create policy "giftcards: txn member read"
  on public.gift_card_transactions for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'giftcards'));

create policy "giftcards: txn insert"
  on public.gift_card_transactions for insert
  with check (public.is_tenant_member(tenant_id)
          and public.tool_active(tenant_id, 'giftcards'));

create policy "giftcards: txn superadmin delete"
  on public.gift_card_transactions for delete
  using (public.is_superadmin());

-- Audit trigger (stored value is write-critical).
create trigger audit_gift_cards
  after insert or update or delete on public.gift_cards
  for each row execute function public.audit_log_trigger();
