"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { parseTaskInput } from "@/lib/parse-task";
import { nextDue, type Recurrence } from "@/lib/recurrence";
import { todayISO } from "@/lib/dates";

function refresh() {
  revalidatePath("/", "layout");
}

/** Konteks ringan untuk aksi: cukup klien + cek login (tanpa query profil). */
async function ctx() {
  const { supabase, user } = await getUser();
  if (!user) throw new Error("Belum masuk");
  return supabase;
}

const isISODate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// ---------------------------------------------------------------- Task

export async function quickAddTask(
  input: string,
  opts: { top?: boolean; defaultToday?: boolean; today?: string } = {},
) {
  const text = input.trim();
  if (!text) return { error: "Task kosong" };
  const supabase = await ctx();
  const today = isISODate(opts.today) ? opts.today : todayISO();
  const p = parseTaskInput(text, today);
  const { error } = await supabase.from("tasks").insert({
    title: p.title,
    due_date: p.someday ? null : p.due_date ?? (opts.defaultToday ? today : null),
    due_time: p.due_time,
    labels: p.labels,
    priority: p.priority,
    someday: p.someday,
    recurrence_rule: p.recurrence,
    is_top: opts.top ?? false,
  });
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function toggleTask(id: string, done: boolean, clientToday?: string) {
  const supabase = await ctx();
  const today = isISODate(clientToday) ? clientToday : todayISO();
  const { data: task, error } = await supabase
    .from("tasks")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { error: error.message };

  // Task berulang: buat kemunculan berikutnya saat diselesaikan.
  if (done && task.recurrence_rule) {
    const rule = task.recurrence_rule as Recurrence;
    const base = rule.type === "interval" ? today : task.due_date ?? today;
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("recurrence_of", task.id)
      .limit(1);
    if (!existing?.length) {
      await supabase.from("tasks").insert({
        title: task.title,
        notes: task.notes,
        due_date: nextDue(rule, base),
        due_time: task.due_time,
        priority: task.priority,
        energy: task.energy,
        estimate_min: task.estimate_min,
        labels: task.labels,
        goal_id: task.goal_id,
        track_id: task.track_id,
        identity_id: task.identity_id,
        recurrence_rule: task.recurrence_rule,
        recurrence_of: task.id,
      });
    }
  }
  refresh();
  return { ok: true };
}

export async function setTaskTop(id: string, top: boolean) {
  const supabase = await ctx();
  await supabase.from("tasks").update({ is_top: top }).eq("id", id);
  refresh();
}

export async function updateTask(id: string, form: FormData) {
  const supabase = await ctx();
  const str = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v === "" ? null : v;
  };
  const labels = String(form.get("labels") ?? "")
    .split(",")
    .map((l) => l.trim().replace(/^#/, "").toLowerCase())
    .filter(Boolean);
  const recurrenceRaw = str("recurrence");
  let recurrence: Recurrence | null = null;
  if (recurrenceRaw === "daily") recurrence = { type: "daily" };
  else if (recurrenceRaw?.startsWith("weekly:")) recurrence = { type: "weekly", days: [Number(recurrenceRaw.slice(7))] };
  else if (recurrenceRaw?.startsWith("monthly:")) recurrence = { type: "monthly", day: Number(recurrenceRaw.slice(8)) };
  else if (recurrenceRaw?.startsWith("interval:")) recurrence = { type: "interval", every: Number(recurrenceRaw.slice(9)) };

  const someday = form.get("someday") === "on";
  const { error } = await supabase
    .from("tasks")
    .update({
      title: str("title") ?? "Tanpa judul",
      notes: str("notes"),
      due_date: someday ? null : str("due_date"),
      due_time: str("due_time"),
      priority: Number(form.get("priority") ?? 4),
      energy: str("energy"),
      estimate_min: str("estimate_min") ? Number(str("estimate_min")) : null,
      labels,
      someday,
      is_top: form.get("is_top") === "on",
      recurrence_rule: recurrence,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteTask(id: string) {
  const supabase = await ctx();
  await supabase.from("tasks").delete().eq("id", id);
  refresh();
}

export async function postponeTask(id: string, clientToday?: string) {
  const supabase = await ctx();
  const { data } = await supabase.from("tasks").select("postpone_count").eq("id", id).single();
  const today = isISODate(clientToday) ? clientToday : todayISO();
  const tomorrow = new Date(Date.parse(today + "T00:00:00Z") + 864e5).toISOString().slice(0, 10);
  await supabase
    .from("tasks")
    .update({ due_date: tomorrow, postpone_count: (data?.postpone_count ?? 0) + 1 })
    .eq("id", id);
  refresh();
}

// ---------------------------------------------------------------- Dashboard

export async function moveBlock(id: string, dir: -1 | 1) {
  const supabase = await ctx();
  const { data: blocks } = await supabase
    .from("dashboard_blocks")
    .select("id, position")
    .order("position");
  if (!blocks) return;
  const i = blocks.findIndex((b) => b.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= blocks.length) return;
  const reordered = [...blocks];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  await Promise.all(
    reordered.map((b, idx) => supabase.from("dashboard_blocks").update({ position: idx }).eq("id", b.id)),
  );
  refresh();
}

export async function updateBlock(id: string, patch: { title?: string; visible?: boolean; size?: string; config?: Record<string, unknown> }) {
  const supabase = await ctx();
  if (patch.config) {
    const { data } = await supabase.from("dashboard_blocks").select("config").eq("id", id).single();
    patch.config = { ...(data?.config ?? {}), ...patch.config };
  }
  await supabase.from("dashboard_blocks").update(patch).eq("id", id);
  refresh();
}

export async function addBlock(type: string) {
  const supabase = await ctx();
  const defaults: Record<string, { title: string; config: Record<string, unknown>; size: string }> = {
    affirmation: { title: "Afirmasi hari ini", config: { source: "affirmations", mode: "sequential", rotate: "daily" }, size: "lg" },
    priorities: { title: "Prioritas utama", config: { count: 3 }, size: "md" },
    tasks: { title: "Task hari ini", config: { filter: "today", showDone: true }, size: "md" },
    gratitude: { title: "Yang aku syukuri hari ini", config: { count: 3 }, size: "md" },
    note: { title: "Catatan", config: { text: "" }, size: "md" },
    finance: { title: "Keuangan bulan ini", config: {}, size: "sm" },
    habits: { title: "Habit hari ini", config: {}, size: "md" },
    tracks: { title: "Tracks minggu ini", config: {}, size: "md" },
    quote: { title: "Kutipan hari ini", config: { mode: "sequential" }, size: "md" },
    music: { title: "Teman fokus", config: { url: "" }, size: "md" },
  };
  const d = defaults[type];
  if (!d) return;
  const { count } = await supabase.from("dashboard_blocks").select("id", { count: "exact", head: true });
  await supabase.from("dashboard_blocks").insert({ type, title: d.title, config: d.config, size: d.size, position: count ?? 0 });
  refresh();
}

export async function deleteBlock(id: string) {
  const supabase = await ctx();
  await supabase.from("dashboard_blocks").delete().eq("id", id);
  refresh();
}

// ---------------------------------------------------------------- Gratitude

export async function addGratitude(body: string, clientToday?: string) {
  const text = body.trim();
  if (!text) return;
  const supabase = await ctx();
  await supabase
    .from("journal_entries")
    .insert({ kind: "gratitude", body: text, entry_date: isISODate(clientToday) ? clientToday : todayISO() });
  refresh();
}

export async function deleteJournal(id: string) {
  const supabase = await ctx();
  await supabase.from("journal_entries").delete().eq("id", id);
  refresh();
}

// ---------------------------------------------------------------- Pencapaian

/** Tandai penanda pencapaian sudah dirayakan. */
export async function markAchievementsSeen(keys: string[]) {
  const supabase = await ctx();
  if (!keys.length) return;
  await supabase.from("achievements").update({ seen: true }).in("key", keys.slice(0, 20));
}
