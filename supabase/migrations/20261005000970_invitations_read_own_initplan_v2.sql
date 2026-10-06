-- users_read_own_invitations: wrap auth.jwt() itself in (select ...) so the
-- auth_rls_initplan lint recognises it. Same semantics as 20261005000700.
alter policy users_read_own_invitations
  on public.invitations
  to authenticated
  using (lower(email) = lower((select auth.jwt()) ->> 'email'));
