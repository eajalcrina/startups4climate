-- C3 · Cross-tenant leak: admin_org could read ALL founder profiles and ALL
-- diagnostics platform-wide (profiles_select_founders_for_admins used
-- is_admin_org() with no org scope; admins_read_all_diagnostics likewise).
--
-- New rule: an admin_org may see a founder (profile + diagnostics) only when
-- that founder is linked to the admin's organization by:
--   (a) profiles.org_id = admin org
--   (b) owning a startup that is in a cohort of the admin org
--   (c) having a cohort_request to a cohort of the admin org (founder-initiated)
--   (d) having ACCEPTED an invitation from the admin org (matched by auth email).
--       Pending invitations are deliberately excluded: otherwise an admin could
--       "invite" any email to gain read access to that person's profile.
-- Superadmin keeps full access (superadmin_all_profiles / superadmin_read_diagnostics).
--
-- Helpers live in a non-exposed schema `private` (not reachable via PostgREST),
-- are SECURITY DEFINER with a fixed empty search_path (avoids RLS recursion on
-- profiles and search_path hijacking) and are executable only by `authenticated`.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- org_id of the caller when the caller is an admin_org (NULL otherwise)
create or replace function private.my_admin_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.org_id
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin_org'
$$;

-- founder ids visible to the calling admin_org (empty set for anyone else)
create or replace function private.admin_visible_founder_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select private.my_admin_org_id() as org_id
  ),
  linked as (
    -- (a) founder belongs to the org
    select f.id
    from public.profiles f
    join me on f.org_id = me.org_id
    union
    -- (b) founder owns a startup in one of the org's cohorts
    select s.founder_id
    from public.startups s
    join public.cohort_startups cs on cs.startup_id = s.id
    join public.cohorts c on c.id = cs.cohort_id
    join me on c.org_id = me.org_id
    union
    -- (c) founder requested to join one of the org's cohorts
    select cr.founder_id
    from public.cohort_requests cr
    join public.cohorts c on c.id = cr.cohort_id
    join me on c.org_id = me.org_id
    union
    -- (d) founder accepted an invitation from the org (auth email, not the
    --     user-editable profile email)
    select u.id
    from public.invitations i
    join auth.users u on lower(u.email) = lower(i.email)
    join me on i.org_id = me.org_id
    where i.status = 'accepted'
  )
  select l.id
  from linked l
  join public.profiles p on p.id = l.id and p.role = 'founder'
$$;

create or replace function private.admin_can_see_founder(p_founder_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.admin_visible_founder_ids() v(id) where v.id = p_founder_id
  )
$$;

revoke all on function private.my_admin_org_id() from public, anon;
revoke all on function private.admin_visible_founder_ids() from public, anon;
revoke all on function private.admin_can_see_founder(uuid) from public, anon;
grant execute on function private.my_admin_org_id() to authenticated, service_role;
grant execute on function private.admin_visible_founder_ids() to authenticated, service_role;
grant execute on function private.admin_can_see_founder(uuid) to authenticated, service_role;

-- ── profiles ────────────────────────────────────────────────────────────────
-- (policies are altered in place rather than dropped/recreated)
alter policy profiles_select_founders_for_admins
  on public.profiles
  to authenticated
  using (
    role = 'founder'
    and id in (select private.admin_visible_founder_ids())
  );

-- ── diagnostics ─────────────────────────────────────────────────────────────
alter policy admins_read_all_diagnostics on public.diagnostics
  rename to admins_read_scoped_diagnostics;
alter policy admins_read_scoped_diagnostics
  on public.diagnostics
  to authenticated
  using (user_id in (select private.admin_visible_founder_ids()));

create policy superadmin_read_diagnostics
  on public.diagnostics
  for select
  to authenticated
  using ((select public.is_superadmin()));
