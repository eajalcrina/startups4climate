-- M7 · activity_log.authenticated_insert_log only required a session, so any user
-- could forge log entries attributed to another actor. Require actor_id = caller.
alter policy authenticated_insert_log on public.activity_log
  to authenticated
  with check (actor_id = (select auth.uid()));
