-- Rate limiting for anonymous endpoints (fixed window counter).
-- Contract: public.check_ip_rate_limit(p_key text, p_limit int, p_window_seconds int) returns boolean
--   true  → request allowed (count after increment <= p_limit)
--   false → limit exceeded
-- Table has RLS enabled and no policies: only reachable through the function.

create table if not exists public.ip_rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        int         not null default 0,
  primary key (key, window_start)
);

alter table public.ip_rate_limits enable row level security;
revoke all on table public.ip_rate_limits from anon, authenticated;

create index if not exists idx_ip_rate_limits_window_start
  on public.ip_rate_limits (window_start);

create or replace function public.check_ip_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 256
     or p_limit is null or p_limit < 0
     or p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'check_ip_rate_limit: argumentos inválidos' using errcode = '22023';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.ip_rate_limits as r (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = r.count + 1
  returning r.count into v_count;

  -- Opportunistic cleanup (~2% of calls) of rows older than 1 day.
  if random() < 0.02 then
    delete from public.ip_rate_limits
    where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_ip_rate_limit(text, int, int) from public;
grant execute on function public.check_ip_rate_limit(text, int, int) to anon, authenticated, service_role;
