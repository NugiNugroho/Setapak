"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import type { Prefs } from "@/lib/prefs";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };
const HHMM = /^\d{2}:\d{2}$/;

/** Simpan langganan push perangkat ini. */
export async function savePushSubscription(sub: Sub, userAgent?: string) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Belum masuk" };
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { error: "Langganan tidak valid" };
  // Endpoint unik global: hapus dulu bila pernah terdaftar (mis. ganti akun di perangkat yang sama).
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  const { error } = await supabase.from("push_subscriptions").insert({
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: userAgent?.slice(0, 200) ?? null,
  });
  return error ? { error: error.message } : { ok: true };
}

export async function deletePushSubscription(endpoint: string) {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/** Simpan jam pengingat (prefs.reminders). */
export async function saveReminders(r: { enabled: boolean; morning: string; evening: string }) {
  const { supabase, user } = await getUser();
  if (!user) return { error: "Belum masuk" };
  const { data } = await supabase.from("profiles").select("prefs").eq("id", user.id).single();
  const prefs = (data?.prefs ?? {}) as Prefs;
  prefs.reminders = {
    enabled: !!r.enabled,
    morning: HHMM.test(r.morning) ? r.morning : "07:00",
    evening: HHMM.test(r.evening) ? r.evening : "20:30",
  };
  const { error } = await supabase.from("profiles").update({ prefs }).eq("id", user.id);
  revalidatePath("/", "layout");
  return error ? { error: error.message } : { ok: true };
}
