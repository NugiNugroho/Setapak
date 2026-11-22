"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";

export type OnboardingData = {
  name: string;
  focus: { task: boolean; keuangan: boolean; life: boolean; tracks: boolean };
  identity: string;
  habit: { name: string; twoMin: string; time: string };
};

const clean = (s: unknown, max = 160) => (typeof s === "string" ? s.trim().slice(0, max) : "");

/** Simpan hasil panduan awal: nama, modul, identitas & habit pertama. */
export async function finishOnboarding(d: OnboardingData) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Belum masuk" };

  const focus = d.focus ?? { task: true, keuangan: true, life: true, tracks: true };
  // Minimal satu modul tetap aktif.
  const modules = Object.values(focus).some(Boolean) ? focus : { task: true, keuangan: false, life: false, tracks: false };

  const name = clean(d.name, 40);
  const { error } = await supabase
    .from("profiles")
    .update({ ...(name ? { display_name: name } : {}), enabled_modules: modules, onboarded_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { error: error.message };

  const statement = clean(d.identity);
  const habitName = clean(d.habit?.name, 80);
  let identityId: string | null = null;
  if (statement || habitName) {
    const { data } = await supabase
      .from("identities")
      .insert({ statement: statement || "Aku orang yang terus melangkah, sedikit demi sedikit." })
      .select("id")
      .single();
    identityId = data?.id ?? null;
  }
  if (habitName && identityId) {
    const time = /^\d{2}:\d{2}$/.test(d.habit.time) ? d.habit.time : null;
    await supabase.from("habits").insert({
      identity_id: identityId,
      name: habitName,
      two_min_version: clean(d.habit.twoMin, 80) || null,
      cue_time: time,
    });
  }

  // Tampilkan blok sesuai fokus di dashboard.
  const { data: blocks } = await supabase.from("dashboard_blocks").select("type,position");
  const have = new Set((blocks ?? []).map((b) => b.type));
  let pos = Math.max(-1, ...(blocks ?? []).map((b) => b.position as number)) + 1;
  const add: { type: string; title: string; size: string; config: object }[] = [];
  if (modules.life && !have.has("habits")) add.push({ type: "habits", title: "Habit hari ini", size: "md", config: {} });
  if (modules.keuangan && !have.has("finance")) add.push({ type: "finance", title: "Keuangan bulan ini", size: "sm", config: {} });
  if (modules.tracks && !have.has("tracks")) add.push({ type: "tracks", title: "Tracks", size: "sm", config: {} });
  if (!have.has("gratitude")) add.push({ type: "gratitude", title: "Syukur hari ini", size: "sm", config: { count: 3 } });
  if (add.length) await supabase.from("dashboard_blocks").insert(add.map((b) => ({ ...b, position: pos++ })));

  revalidatePath("/", "layout");
  return { ok: true };
}

/** "Kemenangan pertama": task kecil yang langsung dicentang selesai. */
export async function firstWin(title: string, today: string) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Belum masuk" };
  const t = clean(title, 120);
  if (!t) return { error: "Tulis satu hal kecil dulu" };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : null;
  const { error } = await supabase.from("tasks").insert({ title: t, due_date: date, completed_at: new Date().toISOString() });
  return error ? { error: error.message } : { ok: true };
}

/** Lewati panduan awal. */
export async function skipOnboarding() {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/", "layout");
}
