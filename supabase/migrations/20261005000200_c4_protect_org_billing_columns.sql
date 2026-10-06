-- C4 · Billing escalation: org_admins_update_org let any user whose
-- profiles.org_id matched (admin_org AND founders with org_id) update every
-- column of their organization, including plan / max_startups / contract dates.
--
-- 1) UPDATE policy now requires role = 'admin_org' for that org.
-- 2) BEFORE UPDATE trigger rejects changes to protected columns unless the
--    caller is superadmin or a backend context (auth.uid() IS NULL: service_role,
--    postgres, cron). Columns the admin UI legitimately edits
--    (/admin/configuracion: name, website, logo_url, billing_email, meta) plus
--    type/country/updated_at remain editable.
--    Protected: id, plan, max_startups, is_active, contract_start, contract_end, created_at.

alter policy org_admins_update_org
  on public.organizations
  to authenticated
  using (id = (select private.my_admin_org_id()))
  with check (id = (select private.my_admin_org_id()));

create or replace function private.organizations_guard_protected_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Backend contexts (service_role, postgres, cron) have no JWT subject.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_superadmin() then
    return new;
  end if;

  if new.id             is distinct from old.id
  or new.plan           is distinct from old.plan
  or new.max_startups   is distinct from old.max_startups
  or new.is_active      is distinct from old.is_active
  or new.contract_start is distinct from old.contract_start
  or new.contract_end   is distinct from old.contract_end
  or new.created_at     is distinct from old.created_at
  then
    raise exception 'Solo un superadmin puede modificar plan, límites, estado o contrato de la organización'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.organizations_guard_protected_columns() from public, anon, authenticated;

create trigger organizations_guard_protected_columns
  before update on public.organizations
  for each row
  execute function private.organizations_guard_protected_columns();
