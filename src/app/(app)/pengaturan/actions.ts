"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/profile";

const done = () => revalidatePath("/", "layout");

export async function saveProfile(form: FormData) {
  const { supabase, user } = await requireProfile();
  const modules = Object.fromEntries(
    ["task", "keuangan", "life", "tracks"].map((m) => [m, form.get(`mod_${m}`) === "on"]),
  );
  await supabase
    .from("profiles")
    .update({
      display_name: String(form.get("display_name") ?? "").trim() || null,
      timezone: String(form.get("timezone") ?? "Asia/Makassar"),
      auto_lock_minutes: Number(form.get("auto_lock_minutes") ?? 5),
      enabled_modules: modules,
    })
    .eq("id", user.id);
  done();
}

export async function addAffirmation(form: FormData) {
  const text = String(form.get("text") ?? "").trim();
  if (!text) return;
  const { supabase } = await requireProfile();
  await supabase.from("affirmations").insert({
    text,
    area_id: (form.get("area_id") as string) || null,
  });
  done();
}

export async function toggleAffirmation(id: string, active: boolean) {
  const { supabase } = await requireProfile();
  await supabase.from("affirmations").update({ active }).eq("id", id);
  done();
}

export async function deleteAffirmation(id: string) {
  const { supabase } = await requireProfile();
  await supabase.from("affirmations").delete().eq("id", id);
  done();
}

export async function addIdentity(form: FormData) {
  const statement = String(form.get("statement") ?? "").trim();
  if (!statement) return;
  const { supabase } = await requireProfile();
  await supabase.from("identities").insert({
    statement,
    area_id: (form.get("area_id") as string) || null,
  });
  done();
}

export async function deleteIdentity(id: string) {
  const { supabase } = await requireProfile();
  await supabase.from("identities").delete().eq("id", id);
  done();
}

export async function savePrivacy(form: FormData) {
  const { supabase, user } = await requireProfile();
  const sections = ["transactions", "wallets", "savings", "assets", "debts", "net_worth"];
  await supabase.from("privacy_settings").upsert(
    sections.map((section) => ({
      user_id: user.id,
      section,
      mode: form.get(`p_${section}`) === "hidden" ? "hidden" : "visible",
    })),
    { onConflict: "user_id,section" },
  );
  done();
}

// ---------------------------------------------------------------- Personalisasi

async function mergePrefs(patch: Record<string, unknown>) {
  const { supabase, user, profile } = await requireProfile();
  const next = { ...profile.prefs, ...patch };
  await supabase.from("profiles").update({ prefs: next }).eq("id", user.id);
}

export async function saveAppearance(form: FormData) {
  const { supabase, user } = await requireProfile();
  const theme = String(form.get("theme") ?? "system");
  const custom = String(form.get("accent_custom") ?? "");
  const preset = String(form.get("accent_color") ?? "#2F6B5E");
  const accent = /^#[0-9a-f]{6}$/i.test(custom) && form.get("use_custom") === "on" ? custom : preset;
  await supabase
    .from("profiles")
    .update({ theme: ["light", "dark", "system", "time"].includes(theme) ? theme : "system", accent_color: accent })
    .eq("id", user.id);
  await mergePrefs({
    font: String(form.get("font") ?? "jakarta"),
    coverShow: form.get("coverShow") === "on",
    coverRotate: form.get("coverRotate") === "on",
  });
  done();
}

export async function saveWords(form: FormData) {
  const txt = (k: string) => String(form.get(k) ?? "").trim().slice(0, 80);
  await mergePrefs({
    greetings: { pagi: txt("g_pagi"), siang: txt("g_siang"), sore: txt("g_sore"), malam: txt("g_malam") },
    moduleLabels: { task: txt("l_task"), keuangan: txt("l_keuangan"), life: txt("l_life"), tracks: txt("l_tracks"), review: txt("l_review") },
  });
  done();
}

export async function saveSounds(form: FormData) {
  await mergePrefs({
    sounds: { enabled: form.get("sounds") === "on", volume: Math.max(0, Math.min(1, Number(form.get("volume") ?? 60) / 100)) },
  });
  done();
}

export async function addQuote(form: FormData) {
  const text = String(form.get("text") ?? "").trim();
  if (!text) return;
  const { supabase } = await requireProfile();
  await supabase.from("quotes").insert({ text, author: String(form.get("author") ?? "").trim() || null });
  done();
}

export async function toggleQuote(id: string, active: boolean) {
  const { supabase } = await requireProfile();
  await supabase.from("quotes").update({ active }).eq("id", id);
  done();
}

export async function deleteQuote(id: string) {
  const { supabase } = await requireProfile();
  await supabase.from("quotes").delete().eq("id", id);
  done();
}
