import type { SupabaseClient } from "@supabase/supabase-js";

/** Penanda pencapaian. Urutan = urutan tampil di Galeri Jejak. */
export const BADGES = [
  { key: "langkah-pertama", emoji: "👣", title: "Langkah pertama", desc: "Menyelesaikan task pertama" },
  { key: "minggu-pertama", emoji: "🌱", title: "7 hari pertama", desc: "Seminggu bersama Setapak" },
  { key: "tugas-10", emoji: "✅", title: "10 langkah", desc: "10 task selesai" },
  { key: "tugas-100", emoji: "🏔️", title: "100 langkah", desc: "100 task selesai" },
  { key: "habit-7", emoji: "🔥", title: "Seminggu konsisten", desc: "Streak habit 7 hari" },
  { key: "habit-21", emoji: "🌿", title: "21 hari", desc: "Streak habit 21 hari" },
  { key: "habit-66", emoji: "🌳", title: "Kebiasaan mengakar", desc: "Streak habit 66 hari" },
  { key: "transaksi-pertama", emoji: "💰", title: "Catatan uang pertama", desc: "Mencatat transaksi pertama" },
  { key: "syukur-30", emoji: "🙏", title: "30 syukur", desc: "Menulis 30 hal yang disyukuri" },
  { key: "track-pertama", emoji: "🎯", title: "Sesi pertama", desc: "Mencatat sesi track pertama" },
  { key: "review-pertama", emoji: "🗺️", title: "Review pertama", desc: "Menyelesaikan Weekly Review pertama" },
] as const;

export type BadgeKey = (typeof BADGES)[number]["key"];
export const badgeOf = (key: string) => BADGES.find((b) => b.key === key);

/**
 * Hitung penanda yang sudah layak didapat, simpan yang baru, dan kembalikan
 * yang baru saja diraih (untuk dirayakan). Gagal diam-diam bila tabel belum ada.
 */
export async function awardAchievements(supabase: SupabaseClient, opts: { createdAt: string; bestHabitStreak: number | null }) {
  try {
    const head = { count: "exact" as const, head: true };
    const [have, done, tx, grat, logs, reviews] = await Promise.all([
      supabase.from("achievements").select("key,seen"),
      supabase.from("tasks").select("id", head).not("completed_at", "is", null),
      supabase.from("transactions").select("id", head),
      supabase.from("journal_entries").select("id", head).eq("kind", "gratitude"),
      supabase.from("track_logs").select("id", head),
      supabase.from("weekly_reviews").select("id", head).not("completed_at", "is", null),
    ]);
    if (have.error) return [];
    const owned = new Set((have.data ?? []).map((a) => a.key as string));
    const n = (r: { count: number | null }) => r.count ?? 0;
    const ageDays = (Date.now() - Date.parse(opts.createdAt)) / 864e5;
    const s = opts.bestHabitStreak;

    const earned: BadgeKey[] = [];
    if (n(done) >= 1) earned.push("langkah-pertama");
    if (ageDays >= 7) earned.push("minggu-pertama");
    if (n(done) >= 10) earned.push("tugas-10");
    if (n(done) >= 100) earned.push("tugas-100");
    if (s != null && s >= 7) earned.push("habit-7");
    if (s != null && s >= 21) earned.push("habit-21");
    if (s != null && s >= 66) earned.push("habit-66");
    if (n(tx) >= 1) earned.push("transaksi-pertama");
    if (n(grat) >= 30) earned.push("syukur-30");
    if (n(logs) >= 1) earned.push("track-pertama");
    if (n(reviews) >= 1) earned.push("review-pertama");

    const fresh = earned.filter((k) => !owned.has(k));
    if (fresh.length) {
      await supabase.from("achievements").upsert(fresh.map((key) => ({ key })), { onConflict: "user_id,key", ignoreDuplicates: true });
    }
    // Yang belum "dilihat" (baru diraih) dirayakan sekali.
    const unseen = [...fresh, ...(have.data ?? []).filter((a) => !a.seen).map((a) => a.key as string)];
    return Array.from(new Set(unseen));
  } catch {
    return [];
  }
}
