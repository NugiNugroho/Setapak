import { addDays, weekday } from "./dates";

export type Metric = {
  id: string;
  track_id: string;
  name: string;
  unit: string | null;
  metric_type: "number" | "duration" | "check" | "scale";
  aggregation: "sum" | "avg" | "last";
  target: number | null;
  period: "day" | "week" | "month" | null;
  is_primary: boolean;
};

export type TrackLog = {
  id: string;
  track_id: string;
  log_date: string;
  duration_min: number | null;
  values: Record<string, number>;
  note: string | null;
  mood: number | null;
  created_at?: string;
};

/** Awal minggu (Senin) untuk tanggal ISO. */
export function weekStart(iso: string) {
  return addDays(iso, -((weekday(iso) + 6) % 7));
}

export function periodStart(period: Metric["period"], today: string) {
  if (period === "day") return today;
  if (period === "month") return today.slice(0, 8) + "01";
  return weekStart(today);
}

/** Nilai metrik dari sebuah log. Metrik durasi membaca duration_min. */
export function metricValue(m: Pick<Metric, "id" | "metric_type">, l: TrackLog): number | null {
  if (m.metric_type === "duration") return l.duration_min ?? (l.values?.[m.id] ?? null);
  const v = l.values?.[m.id];
  return v == null ? null : Number(v);
}

export function aggregate(m: Pick<Metric, "id" | "metric_type" | "aggregation">, logs: TrackLog[]): number {
  const vals = logs
    .slice()
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map((l) => metricValue(m, l))
    .filter((v): v is number => v != null);
  if (!vals.length) return 0;
  if (m.aggregation === "avg") return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  if (m.aggregation === "last") return vals[vals.length - 1];
  return vals.reduce((a, b) => a + b, 0);
}

/** Streak saat ini (hari berturut-turut ada log, boleh berakhir kemarin) dan terpanjang. */
export function streaks(dates: Set<string>, today: string) {
  let current = 0;
  let d = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(d)) {
    current++;
    d = addDays(d, -1);
  }
  const sorted = [...dates].sort();
  let longest = 0, run = 0, prev = "";
  for (const x of sorted) {
    run = prev && addDays(prev, 1) === x ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = x;
  }
  return { current, longest };
}

/** Sel heatmap untuk `weeks` minggu terakhir, kolom per minggu (Senin–Minggu). */
export function heatCells(totals: Map<string, number>, today: string, weeks: number) {
  const first = addDays(weekStart(today), -(weeks - 1) * 7);
  const max = Math.max(1, ...totals.values());
  const cells: { date: string; value: number; level: number; future: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(first, i);
    const value = totals.get(date) ?? 0;
    const level = value <= 0 ? 0 : Math.min(4, Math.ceil((value / max) * 4));
    cells.push({ date, value, level, future: date > today });
  }
  return cells;
}

export const HEAT = ["var(--line-soft)", "#C9DDD7", "#93BFB2", "#5A9A88", "#2F6B5E"];

export function formatMetric(v: number, m: Pick<Metric, "metric_type" | "unit">) {
  if (m.metric_type === "duration") {
    const h = Math.floor(v / 60), mm = Math.round(v % 60);
    return h ? (mm ? `${h}j ${mm}m` : `${h}j`) : `${mm}m`;
  }
  if (m.metric_type === "check") return `${v}×`;
  return `${v.toLocaleString("id-ID")}${m.unit ? " " + m.unit : ""}`;
}

/** Metrik bawaan "Durasi" bila track belum punya metrik. */
export const DURATION_METRIC: Metric = {
  id: "duration",
  track_id: "",
  name: "Durasi",
  unit: "menit",
  metric_type: "duration",
  aggregation: "sum",
  target: null,
  period: "week",
  is_primary: true,
};
