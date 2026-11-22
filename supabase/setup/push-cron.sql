-- Jalankan SEKALI di Supabase SQL Editor setelah migrasi 20261122000400_onboarding.sql.
-- Ganti dua nilai di bawah:
--   GANTI_TOKEN  → sama persis dengan env CRON_SECRET di Vercel
--   GANTI_URL    → alamat aplikasimu, mis. https://setapak-self.vercel.app

insert into private.app_config (key, value) values ('cron_token', 'GANTI_TOKEN')
on conflict (key) do update set value = excluded.value;

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('setapak-push') where exists (select 1 from cron.job where jobname = 'setapak-push');
select cron.schedule(
  'setapak-push',
  '*/15 * * * *',
  $$ select net.http_post(
       url := 'GANTI_URL/api/push/cron',
       headers := jsonb_build_object('Authorization', 'Bearer GANTI_TOKEN', 'Content-Type', 'application/json'),
       body := '{}'::jsonb
     ); $$
);
