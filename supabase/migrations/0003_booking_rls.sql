-- =============================================================================
-- 0003_booking_rls.sql
-- RLS for the Booking / POS tool (tables created in 0002_booking_tool.sql).
-- Applied after the table migration so the objects exist.
-- =============================================================================

alter table public.booking_services enable row level security;
alter table public.booking_slots    enable row level security;
alter table public.bookings         enable row level security;

-- --- booking_services -------------------------------------------------------
-- Public read of active services (public booking page); members see all.
create policy "booking: services public read"
  on public.booking_services for select
  using (is_active = true or public.is_tenant_member(tenant_id));

create policy "booking: services admin write"
  on public.booking_services for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'booking'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'booking'));

create policy "booking: services superadmin delete"
  on public.booking_services for delete
  using (public.is_superadmin());

-- --- booking_slots ----------------------------------------------------------
create policy "booking: slots public read"
  on public.booking_slots for select
  using (is_active = true or public.is_tenant_member(tenant_id));

create policy "booking: slots admin write"
  on public.booking_slots for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'booking'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'booking'));

create policy "booking: slots superadmin delete"
  on public.booking_slots for delete
  using (public.is_superadmin());

-- --- bookings ---------------------------------------------------------------
create policy "booking: bookings member read"
  on public.bookings for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'booking'));

-- Public booking flow inserts (app-layer validates the slot + capacity).
create policy "booking: bookings public insert"
  on public.bookings for insert
  with check (true);

create policy "booking: bookings staff update"
  on public.bookings for update
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'booking'))
  with check (public.is_tenant_member(tenant_id)
          and public.tool_active(tenant_id, 'booking'));

-- DSGVO hard-delete only via superadmin.
create policy "booking: bookings superadmin delete"
  on public.bookings for delete
  using (public.is_superadmin());

-- Audit trigger.
create trigger audit_bookings
  after insert or update or delete on public.bookings
  for each row execute function public.audit_log_trigger();
