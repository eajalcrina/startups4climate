-- users_read_own_invitations: evaluate the JWT email once per statement
-- (auth_rls_initplan lint). Same semantics as 20261005000700.
-- (Superseded by 20261005000970, whose form the advisor lint recognises.)
alter policy users_read_own_invitations
  on public.invitations
  to authenticated
  using (lower(email) = (select lower(auth.jwt() ->> 'email')));
