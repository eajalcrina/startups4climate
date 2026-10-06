-- A6 · public.cohorts_with_counts ran with the owner's rights (SECURITY DEFINER
-- semantics): it bypassed RLS and exposed every cohort of every org, plus
-- counts, to any caller. Switch to security_invoker so the caller's RLS on
-- cohorts / cohort_startups / cohort_requests applies. Definition unchanged.
alter view public.cohorts_with_counts set (security_invoker = true);
