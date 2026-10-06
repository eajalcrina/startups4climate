-- A5 · diagnostics.auth_users_insert_diagnostics only checked auth.uid() IS NOT NULL,
-- so any signed-in user could insert diagnostics attributed to another user_id.
-- Now user_id must be the caller, or NULL: DiagnosticForm inserts user_id NULL
-- when a session exists but the profile row is not found. NULL rows carry no
-- identity (anon can already insert them via anon_insert_diagnostics).

alter policy auth_users_insert_diagnostics
  on public.diagnostics
  to authenticated
  with check (user_id is null or user_id = (select auth.uid()));
