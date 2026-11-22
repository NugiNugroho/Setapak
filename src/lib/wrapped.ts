import type { SupabaseClient } from "@supabase/supabase-js";
import { streaks } from "./tracks";
import { summarize, TX_FIELDS, type Tx } from "./finance";

/** Rangkuman satu tahun dari semua modul. */
export async function yearSummary(supabase: SupabaseClient, year: number, tz: string) {
  const from = `${year}-01-01`, to = `${year}-12-31`;
  const dayOf = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(ts));
  const [tasks, logs, tracks, hlogs, habits, goals, journal, txs, votes] = await Promise.all([
    supabase.from("tasks").select("completed_at,labels,is_top").gte("completed_at", `${year - 1}-12-31`).lte("completed_at", `${year + 1}-01-01`),
    supabase.from("track_logs").select("track_id,log_date,duration_min").gte("log_date", from).lte("log_date", to),
    supabase.from("tracks").select("id,name,icon"),
    supabase.from("habit_logs").select("habit_id,log_date,status").gte("log_date", from).lte("log_date", to).in("status", ["done", "minimal"]),
    supabase.from("habits").select("id,name,icon"),
    supabase.from("goals").select("title,achieved_at").eq("status", "achieved"),
    supabase.from("journal_entries").select("kind,image_path,entry_date").gte("entry_date", from).lte("entry_date", to),
    supabase.from("transactions").select(TX_FIELDS).gte("tx_date", from).lte("tx_date", to),
    supabase.from("identity_votes").select("vote_date").gte("vote_date", from).lte("vote_date", to),
  ]);

  const done = (tasks.data ?? []).filter((t) => t.completed_at && dayOf(t.completed_at).startsWith(String(year)));
  const labelCount = new Map<string, number>();
  for (const t of done) for (const l of t.labels ?? []) labelCount.set(l, (labelCount.get(l) ?? 0) + 1);
  const topLabel = [...labelCount.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const L = logs.data ?? [];
  const minutes = L.reduce((a, l) => a + (l.duration_min ?? 0), 0);
  const perTrack = new Map<string, number>();
  for (const l of L) perTrack.set(l.track_id, (perTrack.get(l.track_id) ?? 0) + (l.duration_min ?? 0) + 0.001);
  const topTrackId = [...perTrack.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topTrack = (tracks.data ?? []).find((t) => t.id === topTrackId) ?? null;
  const activeDays = new Set([...L.map((l) => l.log_date), ...(hlogs.data ?? []).map((h) => h.log_date)]);
  const longest = streaks(activeDays, to).longest;

  const perHabit = new Map<string, number>();
  for (const h of hlogs.data ?? []) perHabit.set(h.habit_id, (perHabit.get(h.habit_id) ?? 0) + 1);
  const topHabitEntry = [...perHabit.entries()].sort((a, b) => b[1] - a[1])[0];
  const topHabit = topHabitEntry ? { ...(habits.data ?? []).find((h) => h.id === topHabitEntry[0]), count: topHabitEntry[1] } : null;

  const J = journal.data ?? [];
  const fin = summarize((txs.data ?? []) as Tx[]);

  return {
    year,
    tasksDone: done.length,
    topDone: done.filter((t) => t.is_top).length,
    topLabel,
    minutes,
    sessions: L.length,
    topTrack: topTrack ? { name: topTrack.name, icon: topTrack.icon, minutes: Math.round(perTrack.get(topTrack.id) ?? 0) } : null,
    activeDays: activeDays.size,
    longest,
    habitDays: (hlogs.data ?? []).length,
    topHabit: topHabit?.name ? { name: topHabit.name, icon: topHabit.icon ?? null, count: topHabit.count } : null,
    votes: (votes.data ?? []).length,
    goals: (goals.data ?? []).filter((g) => g.achieved_at && dayOf(g.achieved_at).startsWith(String(year))).map((g) => g.title),
    gratitude: J.filter((j) => j.kind === "gratitude").length,
    photos: J.filter((j) => j.image_path).length,
    journals: J.filter((j) => j.kind !== "gratitude").length,
    finance: fin,
  };
}
