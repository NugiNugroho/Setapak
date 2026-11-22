-- Onboarding, penanda pencapaian, dan notifikasi push.
-- Aman dijalankan ulang (idempotent).

-- 1) Onboarding -----------------------------------------------------------
alter table public.profiles add column if not exists onboarded_at timestamptz;
-- Akun yang sudah ada dianggap sudah melewati panduan awal.
update public.profiles set onboarded_at = coalesce(onboarded_at, created_at) where onboarded_at is null and created_at < now() - interval '1 minute';

-- 2) Penanda pencapaian ---------------------------------------------------
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null,
  achieved_at timestamptz not null default now(),
  seen boolean not null default false,
  unique (user_id, key)
);
alter table public.achievements enable row level security;
drop policy if exists achievements_own on public.achievements;
create policy achievements_own on public.achievements for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) Langganan notifikasi push -------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Catatan pengiriman supaya satu pengingat hanya terkirim sekali per hari.
create table if not exists public.push_log (
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  local_date date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, local_date)
);
alter table public.push_log enable row level security;
drop policy if exists push_log_read_own on public.push_log;
create policy push_log_read_own on public.push_log for select using (user_id = auth.uid());

-- Konfigurasi rahasia (tidak terekspos lewat API karena skema "private").
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.app_config (key text primary key, value text not null);
revoke all on private.app_config from public, anon, authenticated;

/**
 * Dipanggil server pengirim (endpoint cron) dengan token rahasia.
 * Mengembalikan langganan yang pengingatnya jatuh tempo di jendela waktu ini,
 * lalu mencatatnya di push_log supaya tidak terkirim dua kali.
 * Pengaturan per user ada di profiles.prefs->'reminders':
 *   {"enabled": true, "morning": "07:00", "evening": "20:30"}
 */
create or replace function public.push_due(p_token text, p_window_min int default 15)
returns table (user_id uuid, endpoint text, p256dh text, auth text, kind text, name text, open_tasks int, habits_left int)
language plpgsql security definer set search_path = public, private as $$
declare
  v_secret text;
begin
  select value into v_secret from private.app_config where key = 'cron_token';
  if v_secret is null or p_token is distinct from v_secret then
    raise exception 'unauthorized';
  end if;

  return query
  with prof as (
    select p.id, coalesce(nullif(p.display_name, ''), 'kamu') as name,
           (now() at time zone p.timezone) as local_ts,
           (now() at time zone p.timezone)::date as local_date,
           p.prefs -> 'reminders' as r
    from profiles p
    where coalesce((p.prefs -> 'reminders' ->> 'enabled')::boolean, false)
  ),
  due as (
    select pr.id, pr.name, pr.local_date, k.kind
    from prof pr
    cross join lateral (values ('morning'), ('evening')) as k(kind)
    where pr.r ->> k.kind ~ '^\d{2}:\d{2}$'
      and pr.local_ts::time >= (pr.r ->> k.kind)::time
      and pr.local_ts::time <  (pr.r ->> k.kind)::time + make_interval(mins => p_window_min)
      and not exists (select 1 from push_log l where l.user_id = pr.id and l.kind = k.kind and l.local_date = pr.local_date)
  ),
  logged as (
    insert into push_log (user_id, kind, local_date)
    select d.id, d.kind, d.local_date from due d
    on conflict do nothing
    returning push_log.user_id, push_log.kind, push_log.local_date
  )
  select s.user_id, s.endpoint, s.p256dh, s.auth, lg.kind, d.name,
    (select count(*)::int from tasks t where t.user_id = s.user_id and t.completed_at is null
       and t.parent_id is null and t.someday = false and t.due_date <= lg.local_date),
    (select count(*)::int from habits h where h.user_id = s.user_id and h.archived = false
       and (h.frequency ->> 'type' = 'daily' or (h.frequency -> 'days') @> to_jsonb(extract(dow from lg.local_date)::int))
       and not exists (select 1 from habit_logs hl where hl.habit_id = h.id and hl.log_date = lg.local_date and hl.status in ('done','minimal')))
  from logged lg
  join due d on d.id = lg.user_id and d.kind = lg.kind
  join push_subscriptions s on s.user_id = lg.user_id;
end $$;

/** Menghapus langganan yang sudah tidak berlaku (HTTP 404/410 dari layanan push). */
create or replace function public.push_gone(p_token text, p_endpoint text)
returns void language plpgsql security definer set search_path = public, private as $$
begin
  if p_token is distinct from (select value from private.app_config where key = 'cron_token') then
    raise exception 'unauthorized';
  end if;
  delete from push_subscriptions where endpoint = p_endpoint;
end $$;

revoke all on function public.push_due(text, int) from public;
revoke all on function public.push_gone(text, text) from public;
grant execute on function public.push_due(text, int) to anon, authenticated;
grant execute on function public.push_gone(text, text) to anon, authenticated;
