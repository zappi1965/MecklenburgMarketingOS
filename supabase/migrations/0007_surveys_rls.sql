-- =============================================================================
-- 0007_surveys_rls.sql
-- RLS for the Feedback & Surveys tool (tables in 0006_surveys_tool.sql).
-- =============================================================================

alter table public.surveys           enable row level security;
alter table public.survey_questions  enable row level security;
alter table public.survey_responses  enable row level security;
alter table public.survey_answers    enable row level security;

-- --- surveys ----------------------------------------------------------------
-- Public read of active surveys (the public form); members see all.
create policy "surveys: public read"
  on public.surveys for select
  using (is_active = true or public.is_tenant_member(tenant_id));

create policy "surveys: admin write"
  on public.surveys for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'surveys'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'surveys'));

create policy "surveys: superadmin delete"
  on public.surveys for delete
  using (public.is_superadmin());

-- --- survey_questions -------------------------------------------------------
create policy "surveys: questions public read"
  on public.survey_questions for select
  using (true);

create policy "surveys: questions admin write"
  on public.survey_questions for all
  using (public.is_tenant_admin(tenant_id)
     and public.tool_active(tenant_id, 'surveys'))
  with check (public.is_tenant_admin(tenant_id)
          and public.tool_active(tenant_id, 'surveys'));

create policy "surveys: questions superadmin delete"
  on public.survey_questions for delete
  using (public.is_superadmin());

-- --- survey_responses -------------------------------------------------------
create policy "surveys: responses member read"
  on public.survey_responses for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'surveys'));

create policy "surveys: responses public insert"
  on public.survey_responses for insert
  with check (true);

create policy "surveys: responses superadmin delete"
  on public.survey_responses for delete
  using (public.is_superadmin());

-- --- survey_answers ---------------------------------------------------------
create policy "surveys: answers member read"
  on public.survey_answers for select
  using (public.is_tenant_member(tenant_id)
     and public.tool_active(tenant_id, 'surveys'));

create policy "surveys: answers public insert"
  on public.survey_answers for insert
  with check (true);

create policy "surveys: answers superadmin delete"
  on public.survey_answers for delete
  using (public.is_superadmin());
