import { addDays, weekday } from "./dates";

export type Frequency = { type: "daily" } | { type: "weekly"; days: number[] };

export type Habit = {
  id: string;
  identity_id: string;
  kind: "build" | "break";
  name: string;
  cue_time: string | null;
  cue_location: string | null;
  stack_id: string | null;
  stack_order: number;
  environment_note: string | null;
  bundle: string | null;
  two_min_version: string | null;
  full_version: string | null;
  reward: string | null;
  friction_note: string | null;
  frequency: Frequency;
  level: number;
  track_id: string | null;
  remind_missed: boolean;
  icon?: string | null;
  archived: boolean;
  created_at: string;
};

export type HabitStatus = "done" | "minimal" | "missed";
export type HabitLog = { habit_id: string; log_date: string; status: HabitStatus };

export function isScheduled(h: Pick<Habit, "frequency">, date: string) {
  const f = h.frequency ?? { type: "daily" };
  return f.type === "daily" || f.days.includes(weekday(date));
}

const kept = (s?: HabitStatus) => s === "done" || s === "minimal";

/** Hari terjadwal dalam rentang [from, to], tidak sebelum habit dibuat. */
export function scheduledDays(h: Habit, from: string, to: string, createdDate: string) {
  const days: string[] = [];
  for (let d = from < createdDate ? createdDate : from; d <= to; d = addDays(d, 1)) if (isScheduled(h, d)) days.push(d);
  return days;
}

/**
 * Konsistensi (%) dalam N hari terakhir. Hari ini hanya dihitung bila sudah dikerjakan,
 * supaya pagi hari tidak langsung menurunkan angka.
 */
export function consistency(h: Habit, logs: Map<string, HabitStatus>, today: string, days: number, createdDate: string) {
  const from = addDays(today, -(days - 1));
  const sched = scheduledDays(h, from, today, createdDate).filter((d) => d !== today || kept(logs.get(d)));
  if (!sched.length) return null;
  const ok = sched.filter((d) => kept(logs.get(d))).length;
  return Math.round((ok / sched.length) * 100);
}

/** Jumlah hari terjadwal berturut-turut yang terlewat, dihitung mundur dari kemarin. */
export function missedStreak(h: Habit, logs: Map<string, HabitStatus>, today: string, createdDate: string) {
  let n = 0;
  let d = addDays(today, -1);
  for (let i = 0; i < 14 && d >= createdDate; i++, d = addDays(d, -1)) {
    if (!isScheduled(h, d)) continue;
    if (kept(logs.get(d))) break;
    n++;
  }
  return n;
}

/** Saran level ala Goldilocks Rule: dari konsistensi 21 hari. */
export function levelAdvice(c21: number | null, ageDays: number): "up" | "down" | "keep" | null {
  if (c21 == null || ageDays < 14) return null;
  if (c21 >= 85) return "up";
  if (c21 < 50) return "down";
  return "keep";
}

export const STATUS_NEXT: Record<string, HabitStatus | null> = { none: "done", done: "minimal", minimal: null, missed: "done" };

export function describeFrequency(f: Frequency) {
  if (!f || f.type === "daily") return "setiap hari";
  const H = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  return f.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => H[d]).join(", ");
}

/** Kalimat implementation intention dari isian habit. */
export function intention(h: Partial<Habit> & { stackAnchor?: string | null }) {
  const name = (h.name ?? "").trim() || "…";
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  if (h.kind === "break") return `Aku berhenti ${lower}${h.friction_note ? `; caranya: ${h.friction_note}` : ""}.`;
  const after = h.stackAnchor ? `Setelah ${h.stackAnchor.charAt(0).toLowerCase() + h.stackAnchor.slice(1)}, aku akan ${lower}` : `Aku akan ${lower}`;
  const when = h.cue_time ? ` pukul ${h.cue_time.slice(0, 5)}` : "";
  const where = h.cue_location ? ` di ${h.cue_location}` : "";
  return `${after}${when}${where}.`;
}
