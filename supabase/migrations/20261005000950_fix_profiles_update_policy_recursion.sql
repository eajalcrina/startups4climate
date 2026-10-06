-- Fix: "infinite recursion detected in policy for relation profiles" on
-- UPDATE profiles (founder profile edits).
--
-- profiles_update_own / profiles_update_superadmin used sub-selects on
-- public.profiles inside a profiles policy. That only worked while no SELECT
-- policy on profiles contained a sub-select. After C3 / M4 the SELECT policies
-- use (select ...) sub-links, so Postgres' RLS expansion re-enters profiles and
-- aborts. The self-lookups now go through SECURITY DEFINER STABLE helpers
-- (no RLS re-entry; STABLE → they see the pre-update row of the statement).
-- Semantics unchanged: role, org_id and email cannot be changed by the owner.

create or replace function private.my_profile_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create or replace function private.my_profile_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.org_id from public.profiles p where p.id = auth.uid()
$$;

create or replace function private.my_profile_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.email from public.profiles p where p.id = auth.uid()
$$;

revoke all on function private.my_profile_role() from public, anon;
revoke all on function private.my_profile_org_id() from public, anon;
revoke all on function private.my_profile_email() from public, anon;
grant execute on function private.my_profile_role() to authenticated, service_role;
grant execute on function private.my_profile_org_id() to authenticated, service_role;
grant execute on function private.my_profile_email() to authenticated, service_role;

alter policy profiles_update_own
  on public.profiles
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select private.my_profile_role())
    and not (org_id is distinct from (select private.my_profile_org_id()))
    and email = (select private.my_profile_email())
  );

alter policy profiles_update_superadmin
  on public.profiles
  to authenticated
  using ((select public.is_superadmin()))
  with check ((select public.is_superadmin()));
