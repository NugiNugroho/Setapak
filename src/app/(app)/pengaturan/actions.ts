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
      theme: String(form.get("theme") ?? "system"),
      accent_color: String(form.get("accent_color") ?? "#2F6B5E"),
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
