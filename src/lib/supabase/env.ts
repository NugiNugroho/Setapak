/**
 * URL & kunci publik Supabase. Menerima penamaan manual (NEXT_PUBLIC_…) maupun
 * penamaan integrasi Supabase di Vercel (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY).
 * Semua klien Supabase di aplikasi ini berjalan di server, jadi variabel tanpa
 * awalan NEXT_PUBLIC_ tetap terbaca. Kunci secret/service_role sengaja TIDAK dipakai.
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase belum dikonfigurasi: isi SUPABASE_URL dan SUPABASE_PUBLISHABLE_KEY (atau versi NEXT_PUBLIC_-nya).",
    );
  }
  return { url: url.replace(/\/+$/, ""), key };
}
