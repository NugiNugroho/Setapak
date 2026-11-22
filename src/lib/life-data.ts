import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "./dates";
import { consistency, isScheduled, levelAdvice, missedStreak, type Habit, type HabitStatus } from "./habits";

export type HabitView = Habit & {
  logs: Map<string, HabitStatus>;
  today: HabitStatus | null;
  scheduledToday: boolean;
  c30: number | null;
  c21: number | null;
  missed: number;
  advice: ReturnType<typeof levelAdvice>;
  strip: { date: string; status: HabitStatus | "none" | "off" }[];
  createdDate: string;
};

export async function loadHabits(supabase: SupabaseClient, today: string, tz: string, opts: { includeArchived?: boolean; id?: string } = {}) {
  let hq = supabase.from("habits").select("*").order("stack_order").order("created_at");
  if (opts.id) hq = hq.eq("id", opts.id);
  else if (!opts.includeArchived) hq = hq.eq("archived", false);
  let lq = supabase.from("habit_logs").select("habit_id,log_date,status").gte("log_date", addDays(today, -90));
  if (opts.id) lq = lq.eq("habit_id", opts.id);
  const [h, l, st, ids] = await Promise.all([
    hq,
    lq,
    supabase.from("habit_stacks").select("*").order("sort_order").order("created_at"),
    supabase.from("identities").select("id,statement,area_id,life_areas(name,color)").eq("archived", false).order("sort_order").order("created_at"),
  ]);
  const byHabit = new Map<string, Map<string, HabitStatus>>();
  for (const r of l.data ?? []) {
    if (!byHabit.has(r.habit_id)) byHabit.set(r.habit_id, new Map());
    byHabit.get(r.habit_id)!.set(r.log_date, r.status as HabitStatus);
  }
  const dayOf = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(ts));

  const habits: HabitView[] = ((h.data ?? []) as Habit[]).map((hb) => {
    const logs = byHabit.get(hb.id) ?? new Map();
    const createdDate = dayOf(hb.created_at);
    const c21 = consistency(hb, logs, today, 21, createdDate);
    const age = Math.round((Date.parse(today) - Date.parse(createdDate)) / 864e5);
    return {
      ...hb,
      frequency: hb.frequency ?? { type: "daily" },
      logs,
      createdDate,
      today: logs.get(today) ?? null,
      scheduledToday: isScheduled(hb, today),
      c30: consistency(hb, logs, today, 30, createdDate),
      c21,
      missed: missedStreak(hb, logs, today, createdDate),
      advice: levelAdvice(c21, age),
      strip: Array.from({ length: 30 }, (_, i) => {
        const date = addDays(today, i - 29);
        if (date < createdDate || !isScheduled(hb, date)) return { date, status: "off" as const };
        return { date, status: logs.get(date) ?? ("none" as const) };
      }),
    };
  });

  const identities = (ids.data ?? []).map((i) => {
    const area = Array.isArray(i.life_areas) ? i.life_areas[0] : (i.life_areas as { name?: string; color?: string } | null);
    return { id: i.id as string, statement: i.statement as string, area_id: i.area_id as string | null, area: area?.name ?? null, color: area?.color ?? "#2F6B5E" };
  });

  return { habits, stacks: (st.data ?? []) as { id: string; name: string; anchor: string | null }[], identities };
}

/** Suara per identitas: 7 hari terakhir (per hari) dan total. */
export async function loadVotes(supabase: SupabaseClient, today: string) {
  const since = addDays(today, -6);
  const [week, total] = await Promise.all([
    supabase.from("identity_votes").select("identity_id,vote_date").gte("vote_date", since),
    supabase.from("identity_votes").select("identity_id,vote_date"),
  ]);
  const perDay = new Map<string, number[]>();
  for (const v of week.data ?? []) {
    if (!v.identity_id) continue;
    const arr = perDay.get(v.identity_id) ?? Array(7).fill(0);
    const idx = Math.round((Date.parse(v.vote_date) - Date.parse(since)) / 864e5);
    if (idx >= 0 && idx < 7) arr[idx]++;
    perDay.set(v.identity_id, arr);
  }
  const all = (total.data ?? []).filter((v) => v.identity_id);
  // Kumulatif per minggu (12 minggu) untuk grafik efek majemuk.
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(today, -(11 - i) * 7));
  let running = all.filter((v) => v.vote_date < addDays(weeks[0], -6)).length;
  const cumulative = weeks.map((w) => {
    running += all.filter((v) => v.vote_date > addDays(w, -7) && v.vote_date <= w).length;
    return running;
  });
  return { perDay, total: all.length, cumulative };
}
