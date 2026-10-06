-- M4 · Drop exact-duplicate permissive policies (no change in access semantics).
-- STATUS: NOT YET APPLIED to production (DROP needs interactive confirmation in
-- the Supabase MCP tooling). Apply with `supabase db push` or the SQL editor.
--
--  startups: "Founders read/insert/update own startup" ((select auth.uid()) = founder_id)
--            are fully covered by founders_manage_own_startup
--            (FOR ALL, founder_id = (select auth.uid()), WITH CHECK defaults to USING).
--  profiles: profiles_update_superadmin (UPDATE, caller is superadmin) is fully
--            covered by superadmin_all_profiles (FOR ALL, is_superadmin()).
drop policy if exists "Founders read own startup" on public.startups;
drop policy if exists "Founders insert own startup" on public.startups;
drop policy if exists "Founders update own startup" on public.startups;
drop policy if exists profiles_update_superadmin on public.profiles;
