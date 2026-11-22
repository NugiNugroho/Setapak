-- Setapak · skema awal
-- Semua tabel milik user memakai kolom user_id + Row Level Security:
-- setiap akun hanya bisa membaca dan menulis barisnya sendiri.
-- Nominal uang disimpan sebagai bigint (rupiah, tanpa desimal).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- Util
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------
-- Akun
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Makassar',
  currency text not null default 'IDR',
  theme text not null default 'system' check (theme in ('light','dark','system')),
  accent_color text not null default '#2F6B5E',
  density text not null default 'comfortable' check (density in ('comfortable','compact')),
  week_start smallint not null default 1,
  enabled_modules jsonb not null default '{"task":true,"keuangan":true,"life":true,"tracks":true}',
  pin_hash text,
  auto_lock_minutes int not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.privacy_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  section text not null check (section in ('transactions','wallets','savings','assets','debts','net_worth')),
  mode text not null default 'visible' check (mode in ('visible','hidden','pin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, section)
);

-- ---------------------------------------------------------------
-- Dashboard
-- ---------------------------------------------------------------
create table public.dashboard_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null,
  layout text not null default 'default',
  position int not null default 0,
  size text not null default 'md' check (size in ('sm','md','lg')),
  title text,
  config jsonb not null default '{}',
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.dashboard_blocks (user_id, layout, position);

-- ---------------------------------------------------------------
-- Life: area, identitas, afirmasi, visi, goal, jurnal
-- ---------------------------------------------------------------
create table public.life_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text not null default '#2F6B5E',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  area_id uuid references public.life_areas on delete set null,
  statement text not null,
  sort_order int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.affirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  identity_id uuid references public.identities on delete set null,
  area_id uuid references public.life_areas on delete set null,
  text text not null,
  active boolean not null default true,
  weight int not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  area_id uuid references public.life_areas on delete set null,
  identity_id uuid references public.identities on delete set null,
  title text not null,
  why text,
  target_date date,
  metric text,
  status text not null default 'active' check (status in ('active','achieved','released')),
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  goal_id uuid not null references public.goals on delete cascade,
  title text not null,
  sort_order int not null default 0,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vision_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  area_id uuid references public.life_areas on delete set null,
  image_path text,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('gratitude','journal','scripting','realized')),
  entry_date date not null default current_date,
  body text not null,
  goal_id uuid references public.goals on delete set null,
  reopen_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Tracks
-- ---------------------------------------------------------------
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  icon text,
  color text not null default '#2F6B5E',
  area_id uuid references public.life_areas on delete set null,
  goal_id uuid references public.goals on delete set null,
  identity_id uuid references public.identities on delete set null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.track_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  name text not null,
  unit text,
  metric_type text not null default 'number' check (metric_type in ('number','duration','check','scale')),
  aggregation text not null default 'sum' check (aggregation in ('sum','avg','last')),
  target numeric,
  period text check (period in ('day','week','month')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.track_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  track_id uuid not null references public.tracks on delete cascade,
  log_date date not null default current_date,
  duration_min int,
  "values" jsonb not null default '{}',
  note text,
  mood smallint check (mood between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.track_logs (user_id, track_id, log_date);

-- ---------------------------------------------------------------
-- Task
-- ---------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  notes text,
  due_date date,
  due_time time,
  priority smallint not null default 4 check (priority between 1 and 4),
  is_top boolean not null default false,
  energy text check (energy in ('heavy','light')),
  estimate_min int,
  labels text[] not null default '{}',
  goal_id uuid references public.goals on delete set null,
  milestone_id uuid references public.milestones on delete set null,
  track_id uuid references public.tracks on delete set null,
  identity_id uuid references public.identities on delete set null,
  log_to_track boolean not null default false,
  parent_id uuid references public.tasks on delete cascade, -- subtask
  recurrence_rule jsonb,
  recurrence_of uuid references public.tasks on delete set null, -- kemunculan sebelumnya
  postpone_count int not null default 0,
  someday boolean not null default false,
  sort_order int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks (user_id, due_date);
create index on public.tasks (user_id, completed_at);

-- ---------------------------------------------------------------
-- Habit (Life · Atomic Habits)
-- ---------------------------------------------------------------
create table public.habit_stacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  anchor text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  identity_id uuid not null references public.identities on delete cascade,
  kind text not null default 'build' check (kind in ('build','break')),
  name text not null,
  cue_time time,
  cue_location text,
  stack_id uuid references public.habit_stacks on delete set null,
  stack_order int not null default 0,
  environment_note text,
  bundle text,
  two_min_version text,
  full_version text,
  reward text,
  friction_note text,
  frequency jsonb not null default '{"type":"daily"}',
  level int not null default 1,
  track_id uuid references public.tracks on delete set null,
  remind_missed boolean not null default true,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id uuid not null references public.habits on delete cascade,
  log_date date not null default current_date,
  status text not null check (status in ('done','minimal','missed')),
  duration_min int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create table public.scorecard_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  routine text not null,
  rating text not null default '=' check (rating in ('+','-','=')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null,
  summary jsonb not null default '{}',
  answers jsonb not null default '{}',
  priorities text[] not null default '{}',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.annual_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  year int not null,
  answers jsonb not null default '{}',
  "values" text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);

-- ---------------------------------------------------------------
-- Keuangan
-- ---------------------------------------------------------------
create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind text not null default 'cash' check (kind in ('cash','bank','ewallet','other')),
  opening_balance bigint not null default 0,
  icon text,
  color text,
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind text not null check (kind in ('income','expense')),
  parent_id uuid references public.categories on delete set null,
  icon text,
  color text,
  archived boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  field_type text not null check (field_type in ('text','number','select','multiselect','date','checkbox')),
  options jsonb not null default '[]',
  applies_to text not null default 'both' check (applies_to in ('income','expense','both')),
  required boolean not null default false,
  hidden boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  direction text not null check (direction in ('payable','receivable')),
  counterparty text not null,
  principal bigint not null check (principal >= 0),
  installment bigint,
  due_day smallint check (due_day between 1 and 31),
  interest_rate numeric,
  status text not null default 'open' check (status in ('open','closed')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  target_amount bigint not null check (target_amount > 0),
  deadline date,
  wallet_id uuid references public.wallets on delete set null,
  goal_id uuid references public.goals on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  template jsonb not null,
  rule jsonb not null,
  next_run date not null,
  auto_confirm boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('income','expense','transfer')),
  amount bigint not null check (amount > 0),
  tx_date date not null default current_date,
  tx_time time,
  wallet_id uuid not null references public.wallets on delete restrict,
  to_wallet_id uuid references public.wallets on delete restrict,
  category_id uuid references public.categories on delete set null,
  note text,
  labels text[] not null default '{}',
  custom_values jsonb not null default '{}',
  debt_id uuid references public.debts on delete set null,
  savings_goal_id uuid references public.savings_goals on delete set null,
  recurring_id uuid references public.recurring_transactions on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'transfer') = (to_wallet_id is not null))
);
create index on public.transactions (user_id, tx_date);

create table public.transaction_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  defaults jsonb not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category_id uuid not null references public.categories on delete cascade,
  month date not null,
  amount bigint not null check (amount >= 0),
  rollover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  kind text not null default 'other' check (kind in ('investment','gold','vehicle','property','other')),
  purchase_value bigint,
  purchase_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.asset_valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  asset_id uuid not null references public.assets on delete cascade,
  value bigint not null check (value >= 0),
  valued_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  month date not null,
  assets_total bigint not null,
  debts_total bigint not null,
  net_worth bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

-- ---------------------------------------------------------------
-- RLS + trigger updated_at untuk semua tabel milik user
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
create policy "profiles_owner" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array[
    'privacy_settings','dashboard_blocks','life_areas','identities','affirmations',
    'goals','milestones','vision_items','journal_entries','tracks','track_metrics',
    'track_logs','tasks','habit_stacks','habits','habit_logs','scorecard_items',
    'weekly_reviews','annual_reviews','wallets','categories','custom_fields','debts',
    'savings_goals','recurring_transactions','transactions','transaction_templates',
    'budgets','assets','asset_valuations','net_worth_snapshots'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "owner_all" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- View (security_invoker → ikut terfilter RLS pemanggil)
-- ---------------------------------------------------------------
create view public.identity_votes with (security_invoker = true) as
  select h.user_id, h.identity_id, l.log_date as vote_date, 'habit'::text as source
    from public.habit_logs l join public.habits h on h.id = l.habit_id
   where l.status in ('done','minimal')
  union all
  select t.user_id, t.identity_id, (t.completed_at at time zone 'UTC')::date, 'task'
    from public.tasks t
   where t.identity_id is not null and t.completed_at is not null
  union all
  select tl.user_id, tr.identity_id, tl.log_date, 'track'
    from public.track_logs tl join public.tracks tr on tr.id = tl.track_id
   where tr.identity_id is not null;

create view public.wallet_balances with (security_invoker = true) as
  select w.id as wallet_id, w.user_id, w.name,
         w.opening_balance
         + coalesce(sum(case when t.kind = 'income' and t.wallet_id = w.id then t.amount end), 0)
         - coalesce(sum(case when t.kind = 'expense' and t.wallet_id = w.id then t.amount end), 0)
         - coalesce(sum(case when t.kind = 'transfer' and t.wallet_id = w.id then t.amount end), 0)
         + coalesce(sum(case when t.kind = 'transfer' and t.to_wallet_id = w.id then t.amount end), 0)
         as balance
    from public.wallets w
    left join public.transactions t on t.wallet_id = w.id or t.to_wallet_id = w.id
   group by w.id;

-- ---------------------------------------------------------------
-- Data awal untuk user baru
-- ---------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := new.id;
begin
  insert into public.profiles (id, display_name)
  values (uid, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  insert into public.life_areas (user_id, name, color, sort_order) values
    (uid, 'Karier', '#5A7FA8', 0),
    (uid, 'Pendidikan', '#2F6B5E', 1),
    (uid, 'Keuangan', '#B08A2E', 2),
    (uid, 'Kesehatan', '#2B5C8A', 3),
    (uid, 'Spiritual', '#7A62A8', 4),
    (uid, 'Relasi', '#C2714F', 5);

  insert into public.dashboard_blocks (user_id, type, position, size, title, config) values
    (uid, 'affirmation', 0, 'lg', 'Afirmasi hari ini', '{"source":"affirmations","mode":"sequential","rotate":"daily"}'),
    (uid, 'priorities', 1, 'md', 'Prioritas utama', '{"count":3}'),
    (uid, 'tasks', 2, 'md', 'Task hari ini', '{"filter":"today","showDone":true}');

  insert into public.privacy_settings (user_id, section, mode) values
    (uid, 'transactions', 'visible'),
    (uid, 'wallets', 'visible'),
    (uid, 'savings', 'hidden'),
    (uid, 'assets', 'hidden'),
    (uid, 'debts', 'hidden'),
    (uid, 'net_worth', 'hidden');

  insert into public.categories (user_id, name, kind, color, sort_order) values
    (uid, 'Makan & minum', 'expense', '#C2714F', 0),
    (uid, 'Rumah & tagihan', 'expense', '#5A7FA8', 1),
    (uid, 'Transportasi', 'expense', '#2F6B5E', 2),
    (uid, 'Belajar & buku', 'expense', '#7A62A8', 3),
    (uid, 'Hiburan', 'expense', '#B08A2E', 4),
    (uid, 'Lainnya', 'expense', '#8C8A84', 5),
    (uid, 'Gaji', 'income', '#2F7D4F', 0),
    (uid, 'Pemasukan lain', 'income', '#2F7D4F', 1);

  insert into public.wallets (user_id, name, kind, sort_order) values
    (uid, 'Tunai', 'cash', 0);

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
