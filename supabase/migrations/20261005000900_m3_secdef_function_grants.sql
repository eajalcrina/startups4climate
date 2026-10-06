-- M3 · SECURITY DEFINER functions exposed through /rest/v1/rpc.
-- Note: Postgres grants EXECUTE to PUBLIC by default, so revoking only from
-- `anon` is not enough; PUBLIC is revoked too and the intended roles re-granted.
--
-- * handle_new_user(): trigger function on auth.users, never meant for RPC.
--   Triggers do not need the caller to hold EXECUTE.
-- * regenerate_cohort_share_token / submit_cohort_request_via_token: already
--   reject unauthenticated callers → no anon.
-- * is_superadmin / is_admin_org: after 20261005000800 every RLS policy that
--   calls them is scoped TO authenticated, so anon never evaluates them → no anon.
-- * Kept for anon (public pages): get_public_passport, lookup_invitation,
--   lookup_cohort_by_share_token, calcular_percentil (landing diagnostic),
--   check_ip_rate_limit (rate limiting contract).

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.regenerate_cohort_share_token(uuid) from public, anon;
grant execute on function public.regenerate_cohort_share_token(uuid) to authenticated, service_role;

revoke execute on function public.submit_cohort_request_via_token(text, text) from public, anon;
grant execute on function public.submit_cohort_request_via_token(text, text) to authenticated, service_role;

revoke execute on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated, service_role;

revoke execute on function public.is_admin_org() from public, anon;
grant execute on function public.is_admin_org() to authenticated, service_role;
