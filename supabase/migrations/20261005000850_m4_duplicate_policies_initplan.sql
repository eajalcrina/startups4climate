-- M4 · initPlan rewrite for the 4 duplicate policies that 20261005001000 drops.
-- Applied first so the auth_rls_initplan lint is cleared even while the DROP
-- migration is pending (DROP statements need interactive confirmation in the
-- Supabase MCP tooling). No change in access semantics.
alter policy "Founders read own startup" on public.startups
  to authenticated using ((select auth.uid()) = founder_id);
alter policy "Founders insert own startup" on public.startups
  to authenticated with check ((select auth.uid()) = founder_id);
alter policy "Founders update own startup" on public.startups
  to authenticated using ((select auth.uid()) = founder_id);
alter policy profiles_update_superadmin on public.profiles
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'superadmin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'superadmin'
  ));
