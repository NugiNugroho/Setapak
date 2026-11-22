"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

async function ctx() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Belum masuk");
  return supabase;
}
const done = () => revalidatePath("/", "layout");
const s = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const n = (f: FormData, k: string) => {
  const v = s(f, k);
  return v == null ? null : Number(v.replace(",", "."));
};

export async function createTrack(f: FormData) {
  const supabase = await ctx();
  const { data, error } = await supabase
    .from("tracks")
    .insert({
      name: s(f, "name") ?? "Track baru",
      color: s(f, "color") ?? "#2F6B5E",
      area_id: s(f, "area_id"),
      goal_id: s(f, "goal_id"),
      identity_id: s(f, "identity_id"),
    })
    .select("id")
    .single();
  if (error || !data) return;
  const metricType = s(f, "metric_type") ?? "duration";
  await supabase.from("track_metrics").insert({
    track_id: data.id,
    name: s(f, "metric_name") ?? (metricType === "duration" ? "Durasi" : "Jumlah"),
    unit: metricType === "duration" ? "menit" : s(f, "unit"),
    metric_type: metricType,
    aggregation: "sum",
    target: n(f, "target"),
    period: s(f, "period") ?? "week",
    is_primary: true,
  });
  done();
  redirect(`/tracks/${data.id}`);
}

export async function updateTrack(id: string, f: FormData) {
  const supabase = await ctx();
  await supabase
    .from("tracks")
    .update({
      name: s(f, "name") ?? "Track",
      color: s(f, "color") ?? "#2F6B5E",
      area_id: s(f, "area_id"),
      goal_id: s(f, "goal_id"),
      identity_id: s(f, "identity_id"),
    })
    .eq("id", id);
  done();
}

export async function setTrackArchived(id: string, archived: boolean) {
  const supabase = await ctx();
  await supabase.from("tracks").update({ archived }).eq("id", id);
  done();
  if (archived) redirect("/tracks");
}

export async function addMetric(trackId: string, f: FormData) {
  const supabase = await ctx();
  const type = s(f, "metric_type") ?? "number";
  const makePrimary = f.get("is_primary") === "on";
  if (makePrimary) await supabase.from("track_metrics").update({ is_primary: false }).eq("track_id", trackId);
  await supabase.from("track_metrics").insert({
    track_id: trackId,
    name: s(f, "name") ?? "Metrik",
    unit: type === "duration" ? "menit" : s(f, "unit"),
    metric_type: type,
    aggregation: s(f, "aggregation") ?? "sum",
    target: n(f, "target"),
    period: s(f, "period") ?? "week",
    is_primary: makePrimary,
  });
  done();
}

export async function updateMetric(id: string, f: FormData) {
  const supabase = await ctx();
  await supabase.from("track_metrics").update({ target: n(f, "target"), period: s(f, "period") ?? "week" }).eq("id", id);
  done();
}

export async function setPrimaryMetric(trackId: string, metricId: string) {
  const supabase = await ctx();
  await supabase.from("track_metrics").update({ is_primary: false }).eq("track_id", trackId);
  await supabase.from("track_metrics").update({ is_primary: true }).eq("id", metricId);
  done();
}

export async function deleteMetric(id: string) {
  const supabase = await ctx();
  await supabase.from("track_metrics").delete().eq("id", id);
  done();
}

export async function addLog(trackId: string, f: FormData) {
  const supabase = await ctx();
  const values: Record<string, number> = {};
  for (const [k, v] of f.entries()) {
    if (!k.startsWith("m_")) continue;
    const raw = String(v).trim();
    if (raw === "" ) continue;
    values[k.slice(2)] = raw === "on" ? 1 : Number(raw.replace(",", "."));
  }
  const duration = n(f, "duration_min");
  const mood = n(f, "mood");
  if (duration == null && !Object.keys(values).length && !s(f, "note")) return { error: "Isi minimal satu nilai." };
  await supabase.from("track_logs").insert({
    track_id: trackId,
    log_date: s(f, "log_date") ?? undefined,
    duration_min: duration != null ? Math.round(duration) : null,
    values,
    note: s(f, "note"),
    mood: mood && mood >= 1 && mood <= 5 ? mood : null,
  });
  done();
  return { ok: true };
}

export async function deleteLog(id: string) {
  const supabase = await ctx();
  await supabase.from("track_logs").delete().eq("id", id);
  done();
}
