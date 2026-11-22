# Setapak

> Rintik menjadi hujan, setapak menjadi jalan.

Aplikasi produktivitas pribadi (web + PWA untuk smartphone): task harian, keuangan, Life (identitas & habit ala *Atomic Habits*), dan Tracks. Setiap akun punya data sendiri yang terisolasi di level database (Supabase Row Level Security).

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth) · Vercel

## Status

| Modul | Isi |
| --- | --- |
| Hari Ini | Dashboard blok yang bisa diatur: afirmasi/identitas, prioritas, task, gratitude, catatan, keuangan, habit, tracks |
| Task | Input cepat berbahasa Indonesia, berulang, carry-over, label, prioritas utama |
| Keuangan | Ringkasan bulanan, transaksi + field kustom + template, dompet, kategori, budget, tabungan, aset, hutang/piutang, net worth, mode privasi, ekspor CSV |
| Tracks | Metrik kustom, log sesi, timer fokus, heatmap, streak, target |
| Manifestasi | Identitas & suara, habit Empat Hukum, habit stack, never miss twice, level, goal & milestone, scorecard, refleksi, Annual Review |
| Weekly Review | Ringkasan otomatis mingguan, refleksi, 3 prioritas jadi task, arsip |

Rencana berikutnya: PIN untuk nominal tersembunyi, notifikasi push, vision board bergambar, mode offline penuh.

## Menjalankan

### 1. Buat project Supabase
1. Daftar di [supabase.com](https://supabase.com) → **New project** (region terdekat: Singapore).
2. Buka **SQL Editor**, jalankan isi file berikut **berurutan**:
   - `supabase/migrations/20261122000000_init.sql`
   - `supabase/migrations/20261122000100_task_rollover.sql`
   - `supabase/migrations/20261122000200_finance_views.sql`

   (Atau dengan Supabase CLI: `supabase link --project-ref <ref>` lalu `supabase db push`.)
3. **Authentication → URL Configuration**
   - Site URL: URL aplikasi (mis. `https://setapak.vercel.app`; saat lokal `http://localhost:3000`)
   - Redirect URLs: tambahkan `https://<domain-kamu>/auth/callback` dan `http://localhost:3000/auth/callback`
4. (Opsional) **Authentication → Providers → Google**: aktifkan dan isi Client ID/Secret dari Google Cloud Console.
5. **Project Settings → API**: salin *Project URL* dan *anon/publishable key*.

### 2. Lokal
```bash
cp .env.example .env.local   # isi URL & key dari langkah 1.5
npm install
npm run dev                  # http://localhost:3000
```

### 3. Deploy ke Vercel
1. [vercel.com](https://vercel.com) → **Add New → Project** → import repo `NugiNugroho/Setapak`.
2. Isi Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (URL Vercel-mu).
3. Deploy. Setiap push ke `main` otomatis ter-deploy.

### 4. Pasang di HP
Buka URL aplikasi di Chrome (Android) → menu ⋮ → **Tambahkan ke layar utama**. Di iPhone: Safari → Bagikan → **Tambah ke Layar Utama**.

## Struktur

```
src/
  app/
    (app)/            halaman setelah login: Hari Ini, task, keuangan, life, tracks, review, pengaturan
    login/, auth/     masuk, daftar, callback OAuth, keluar
  components/         navigasi, mode privasi, blok dashboard, task
  lib/                klien Supabase, parser input task, tanggal, task berulang
supabase/migrations/  skema database + RLS
public/               manifest PWA, service worker, ikon
```

## Input cepat task

`Revisi essay besok 10.00 #lpdp !1` → besok jam 10.00, label `lpdp`, prioritas 1.
Kata yang dikenali: `hari ini`, `besok`, `lusa`, `senin`…`minggu`, `tgl 25`, `10.00`, `#label`, `!1`–`!4`, `setiap hari`, `setiap senin`, `setiap bulan`, `setiap 3 hari`, `someday`.

## Keamanan data
Semua tabel memakai kebijakan `user_id = auth.uid()`; akun lain tidak bisa membaca atau menulis datamu meski memakai aplikasi yang sama. Mode privasi (ikon mata) hanya menyembunyikan tampilan nominal.
