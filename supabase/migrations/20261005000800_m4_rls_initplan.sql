-- M4 · RLS performance. No change in access semantics:
--  * auth.uid() / is_superadmin() wrapped in (select ...) so Postgres evaluates
--    them once per statement (initPlan) instead of once per row
--    (advisor lint auth_rls_initplan).
--  * Policies that depend on auth.uid()/is_superadmin() are scoped TO authenticated
--    instead of PUBLIC. For anon, auth.uid() is NULL and is_superadmin() is false,
--    so those policies could never grant anon anything; scoping them avoids
--    evaluating them for anon (and lets anon lose EXECUTE on is_superadmin()).
--    Policies that grant anon access (opportunities, news_items, platform_settings
--    read, public passport, diagnostics/leads anon insert) are untouched.
--  * Exact-duplicate permissive policies: initPlan rewrite in 20261005000850,
--    DROP in 20261005001000.
--  * Covering indexes for the 2 unindexed foreign keys.

-- ── activity_log ────────────────────────────────────────────────────────────
alter policy superadmin_read_log on public.activity_log
  to authenticated using ((select public.is_superadmin()));

-- ── ai_conversations ────────────────────────────────────────────────────────
alter policy "Users insert own conversations" on public.ai_conversations
  to authenticated with check ((select auth.uid()) = user_id);
alter policy "Users read own conversations" on public.ai_conversations
  to authenticated using ((select auth.uid()) = user_id);
alter policy "Users update own conversations" on public.ai_conversations
  to authenticated using ((select auth.uid()) = user_id);

-- ── ai_usage ────────────────────────────────────────────────────────────────
alter policy users_insert_own_usage on public.ai_usage
  to authenticated with check ((select auth.uid()) = user_id);
alter policy users_read_own_usage on public.ai_usage
  to authenticated using ((select auth.uid()) = user_id);

-- ── certificates ────────────────────────────────────────────────────────────
alter policy "Founders read own certificates" on public.certificates
  to authenticated
  using (startup_id in (select s.id from public.startups s where s.founder_id = (select auth.uid())));

-- ── cohort_requests ─────────────────────────────────────────────────────────
alter policy admin_org_update_requests on public.cohort_requests
  to authenticated
  using (cohort_id in (
    select c.id
    from public.cohorts c
    join public.organizations o on c.org_id = o.id
    join public.profiles p on p.org_id = o.id
    where p.id = (select auth.uid()) and p.role = 'admin_org'
  ));
alter policy admin_org_view_requests on public.cohort_requests
  to authenticated
  using (cohort_id in (
    select c.id
    from public.cohorts c
    join public.organizations o on c.org_id = o.id
    join public.profiles p on p.org_id = o.id
    where p.id = (select auth.uid()) and p.role = 'admin_org'
  ));
alter policy founder_create_request on public.cohort_requests
  to authenticated with check (founder_id = (select auth.uid()));
alter policy founder_own_requests on public.cohort_requests
  to authenticated using (founder_id = (select auth.uid()));
alter policy superadmin_all_requests on public.cohort_requests
  to authenticated using ((select public.is_superadmin()));

-- ── cohort_startups ─────────────────────────────────────────────────────────
alter policy "Admins read cohort startups" on public.cohort_startups
  to authenticated
  using (cohort_id in (
    select c.id from public.cohorts c
    where c.org_id = (select p.org_id from public.profiles p where p.id = (select auth.uid()))
  ));
alter policy superadmin_all_cohort_startups on public.cohort_startups
  to authenticated using ((select public.is_superadmin()));

-- ── cohorts ─────────────────────────────────────────────────────────────────
alter policy "Admins read own cohorts" on public.cohorts
  to authenticated
  using (org_id = (select p.org_id from public.profiles p where p.id = (select auth.uid())));
alter policy superadmin_all_cohorts on public.cohorts
  to authenticated using ((select public.is_superadmin()));

-- ── diagnostics ─────────────────────────────────────────────────────────────
alter policy users_read_own_diagnostics on public.diagnostics
  to authenticated using (user_id = (select auth.uid()));

-- ── invitations ─────────────────────────────────────────────────────────────
alter policy org_admins_manage_invitations on public.invitations
  to authenticated
  using (org_id in (
    select p.org_id from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin_org'
  ))
  with check (
    org_id in (
      select p.org_id from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin_org'
    )
    and coalesce(invitation_type, 'founder') = 'founder'
  );
alter policy superadmin_all_invitations on public.invitations
  to authenticated using ((select public.is_superadmin()));

-- ── opportunity_matches ─────────────────────────────────────────────────────
alter policy "Founders read own matches" on public.opportunity_matches
  to authenticated
  using (startup_id in (select s.id from public.startups s where s.founder_id = (select auth.uid())));
alter policy "Founders update own matches" on public.opportunity_matches
  to authenticated
  using (startup_id in (select s.id from public.startups s where s.founder_id = (select auth.uid())));

-- ── organizations ───────────────────────────────────────────────────────────
alter policy org_admins_read_org on public.organizations
  to authenticated
  using (id = (select p.org_id from public.profiles p where p.id = (select auth.uid())));
alter policy superadmin_all_organizations on public.organizations
  to authenticated using ((select public.is_superadmin()));

-- ── platform_settings ───────────────────────────────────────────────────────
alter policy superadmin_manage_settings on public.platform_settings
  to authenticated using ((select public.is_superadmin()));

-- ── profiles ────────────────────────────────────────────────────────────────
alter policy profiles_select_own on public.profiles
  to authenticated using ((select auth.uid()) = id);
alter policy superadmin_all_profiles on public.profiles
  to authenticated using ((select public.is_superadmin()));

-- ── startups ────────────────────────────────────────────────────────────────
alter policy founders_manage_own_startup on public.startups
  to authenticated using (founder_id = (select auth.uid()));
alter policy superadmin_all_startups on public.startups
  to authenticated using ((select public.is_superadmin()));

-- ── support_tickets ─────────────────────────────────────────────────────────
alter policy admin_org_view_tickets on public.support_tickets
  to authenticated
  using (org_id in (
    select p.org_id from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin_org'
  ));
alter policy reporter_create_ticket on public.support_tickets
  to authenticated with check (reporter_id = (select auth.uid()));
alter policy reporter_own_tickets on public.support_tickets
  to authenticated using (reporter_id = (select auth.uid()));
alter policy superadmin_all_tickets on public.support_tickets
  to authenticated using ((select public.is_superadmin()));

-- ── ticket_messages ─────────────────────────────────────────────────────────
alter policy participants_create_messages on public.ticket_messages
  to authenticated
  with check (
    author_id = (select auth.uid())
    and ticket_id in (select t.id from public.support_tickets t where t.reporter_id = (select auth.uid()))
  );
alter policy participants_view_messages on public.ticket_messages
  to authenticated
  using (
    is_internal = false
    and ticket_id in (select t.id from public.support_tickets t where t.reporter_id = (select auth.uid()))
  );
alter policy superadmin_all_messages on public.ticket_messages
  to authenticated using ((select public.is_superadmin()));

-- ── tool_data ───────────────────────────────────────────────────────────────
alter policy users_manage_own_tool_data on public.tool_data
  to authenticated using (user_id = (select auth.uid()));
alter policy superadmin_all_tool_data on public.tool_data
  to authenticated using ((select public.is_superadmin()));

-- ── weekly_kpis ─────────────────────────────────────────────────────────────
alter policy "Founders manage own startup KPIs" on public.weekly_kpis
  to authenticated
  using (startup_id in (select s.id from public.startups s where s.founder_id = (select auth.uid())))
  with check (startup_id in (select s.id from public.startups s where s.founder_id = (select auth.uid())));
alter policy "Org admins read cohort KPIs" on public.weekly_kpis
  to authenticated
  using (startup_id in (
    select cs.startup_id
    from public.cohort_startups cs
    join public.cohorts c on c.id = cs.cohort_id
    join public.profiles p on p.org_id = c.org_id
    where p.id = (select auth.uid()) and p.role in ('admin_org', 'superadmin')
  ));

-- ── workbook_downloads ──────────────────────────────────────────────────────
alter policy users_insert_own_downloads on public.workbook_downloads
  to authenticated with check (user_id = (select auth.uid()));
alter policy users_read_own_downloads on public.workbook_downloads
  to authenticated using (user_id = (select auth.uid()));

-- ── unindexed foreign keys ──────────────────────────────────────────────────
create index if not exists idx_opportunity_matches_opportunity_id
  on public.opportunity_matches (opportunity_id);
create index if not exists idx_weekly_kpis_created_by
  on public.weekly_kpis (created_by);
