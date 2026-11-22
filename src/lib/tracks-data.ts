import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "./dates";
import {
  DURATION_METRIC, aggregate, heatCells, metricValue, periodStart, streaks, weekStart,
  type Metric, type TrackLog,
} from "./tracks";

export type Track = {
  id: string; name: string; color: string; icon: string | null; area_id: string | null;
  goal_id: string | null; identity_id: string | null; archived: boolean;
};

export function primaryOf(metrics: Metric[]): Metric {
  return metrics.find((m) => m.is_primary) ?? metrics[0] ?? DURATION_METRIC;
}

/** Ringkasan satu track: heatmap, streak, progres periode metrik utama. */
export function summarizeTrack(track: Track, metrics: Metric[], logs: TrackLog[], today: string, weeks: number) {
  const primary = primaryOf(metrics);
  const totals = new Map<string, number>();
  for (const l of logs) {
    const v = metricValue(primary, l);
    totals.set(l.log_date, (totals.get(l.log_date) ?? 0) + (v && v > 0 ? v : 1));
  }
  const dates = new Set(logs.map((l) => l.log_date));
  const from = periodStart(primary.period ?? "week", today);
  const periodValue = aggregate(primary, logs.filter((l) => l.log_date >= from && l.log_date <= today));
  return {
    track,
    primary,
    cells: heatCells(totals, today, weeks),
    ...streaks(dates, today),
    periodValue,
    pct: primary.target ? Math.min(100, Math.round((periodValue / primary.target) * 100)) : null,
    total: aggregate({ ...primary, aggregation: primary.aggregation === "last" ? "last" : "sum" }, logs),
  };
}

export async function loadTracks(supabase: SupabaseClient, today: string, weeks: number, trackId?: string) {
  const since = addDays(weekStart(today), -(weeks - 1) * 7);
  let tq = supabase.from("tracks").select("*").order("created_at");
  if (trackId) tq = tq.eq("id", trackId);
  else tq = tq.eq("archived", false);
  let lq = supabase.from("track_logs").select("*").gte("log_date", trackId ? "1970-01-01" : since).order("log_date", { ascending: false }).order("created_at", { ascending: false });
  if (trackId) lq = lq.eq("track_id", trackId);
  const [t, m, l] = await Promise.all([tq, supabase.from("track_metrics").select("*").order("created_at"), lq]);
  return { tracks: (t.data ?? []) as Track[], metrics: (m.data ?? []) as Metric[], logs: (l.data ?? []) as TrackLog[] };
}
