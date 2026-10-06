-- Additional hardening found while auditing C3/C4.
--
-- H1 (critical) · handle_new_user() copied raw_user_meta_data->>'role' into
--     profiles.role. raw_user_meta_data is fully client-controlled at signUp
--     (supabase.auth.signUp({ options: { data: { role: 'superadmin' } } })), so
--     anyone with the public anon key could self-register as superadmin.
--     New users are now always 'founder'. Org admins are still created by
--     /api/superadmin/create-org-admin (service_role upserts role/org_id) and by
--     accept_invitation() for admin_org invitations.
--
-- H2 · profiles_insert_own allowed inserting a profile with any role/org_id.
--     Now only role='founder' and org_id IS NULL (the app's register fallback
--     upserts exactly that).
--
-- H3 · profiles_update_own let users change profiles.email. users_read_own_invitations
--     matched invitations by profiles.email, so a user could set someone else's
--     email and read their invitation (incl. token). Email is now locked in the
--     update policy and invitations are matched against the auth JWT email.
--
-- H4 · Several "org admin" policies only checked profiles.org_id, without the
--     admin_org role. Founders get org_id when accepting an invitation or when a
--     cohort request is approved, which would let them manage their org's cohorts
--     and cohort membership, and read peers' startups and tool_data. Write/peer-read
--     policies now require role = 'admin_org'. Org-member read policies used by
--     founders ("Admins read own cohorts", "Admins read cohort startups",
--     org_admins_read_org) are left unchanged.
--
-- H5 · diagnostic_leads (emails/phones from the public landing diagnostic) were
--     readable/updatable by every admin_org platform-wide. Leads have no org, and
--     no admin_org screen reads them: restricted to superadmin.

-- ── H1 ──────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, startup_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'founder',
    COALESCE(NEW.raw_user_meta_data->>'startup_name', NULL),
    now(),
    now()
  );
  RETURN NEW;
END;
$$;

-- ── H2 ──────────────────────────────────────────────────────────────────────
alter policy profiles_insert_own
  on public.profiles
  to authenticated
  with check (
    id = (select auth.uid())
    and role = 'founder'
    and org_id is null
  );

-- ── H3 ──────────────────────────────────────────────────────────────────────
alter policy profiles_update_own
  on public.profiles
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select p.role from public.profiles p where p.id = (select auth.uid()))
    and not (org_id is distinct from (select p.org_id from public.profiles p where p.id = (select auth.uid())))
    and email = (select p.email from public.profiles p where p.id = (select auth.uid()))
  );

alter policy users_read_own_invitations
  on public.invitations
  to authenticated
  using (lower(email) = lower((select auth.jwt() ->> 'email')));

-- ── H4 ──────────────────────────────────────────────────────────────────────
alter policy org_admins_manage_cohorts
  on public.cohorts
  to authenticated
  using (org_id = (select private.my_admin_org_id()))
  with check (org_id = (select private.my_admin_org_id()));

alter policy org_admins_manage_cohort_startups
  on public.cohort_startups
  to authenticated
  using (
    cohort_id in (
      select c.id from public.cohorts c
      where c.org_id = (select private.my_admin_org_id())
    )
  )
  with check (
    cohort_id in (
      select c.id from public.cohorts c
      where c.org_id = (select private.my_admin_org_id())
    )
  );

alter policy org_admins_read_startups
  on public.startups
  to authenticated
  using (
    id in (
      select cs.startup_id
      from public.cohort_startups cs
      join public.cohorts c on c.id = cs.cohort_id
      where c.org_id = (select private.my_admin_org_id())
    )
  );

alter policy org_admins_read_tool_data
  on public.tool_data
  to authenticated
  using (
    user_id in (
      select s.founder_id
      from public.startups s
      join public.cohort_startups cs on cs.startup_id = s.id
      join public.cohorts c on c.id = cs.cohort_id
      where c.org_id = (select private.my_admin_org_id())
    )
  );

-- ── H5 ──────────────────────────────────────────────────────────────────────
alter policy diagnostic_leads_admin_read
  on public.diagnostic_leads
  to authenticated
  using ((select public.is_superadmin()));

alter policy diagnostic_leads_admin_update
  on public.diagnostic_leads
  to authenticated
  using ((select public.is_superadmin()))
  with check ((select public.is_superadmin()));
