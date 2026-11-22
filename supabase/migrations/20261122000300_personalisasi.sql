-- Personalisasi: preferensi tampilan, media (foto & audio), kutipan, ikon habit,
-- foto di jurnal, dan tema yang mengikuti waktu.

-- Preferensi bebas per user (sapaan, nama modul, font, suara, playlist, dll.)
alter table public.profiles add column if not exists prefs jsonb not null default '{}';

-- Tema baru: 'time' = terang di siang hari, gelap di malam hari.
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check
  check (theme in ('light', 'dark', 'system', 'time'));

-- Ikon/emoji untuk habit (kategori & track sudah punya kolom icon).
alter table public.habits add column if not exists icon text;

-- Foto pada catatan jurnal/gratitude.
alter table public.journal_entries add column if not exists image_path text;

-- Daftar media milik user: foto sampul, lagu fokus, dll.
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('cover', 'audio')),
  path text not null,
  title text,
  mime text,
  size_bytes bigint,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kutipan favorit.
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  text text not null,
  author text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['media', 'quotes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner_all" on public.%I', t);
    execute format(
      'create policy "owner_all" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- Supabase Storage: bucket privat "media", tiap user hanya bisa
-- mengakses folder miliknya sendiri: media/<user_id>/...
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 26214400) -- 25 MB per file
on conflict (id) do nothing;

drop policy if exists "media_select_own" on storage.objects;
drop policy if exists "media_insert_own" on storage.objects;
drop policy if exists "media_update_own" on storage.objects;
drop policy if exists "media_delete_own" on storage.objects;

create policy "media_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
