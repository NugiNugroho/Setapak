import { cache } from "react";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { DEFAULT_TZ } from "@/lib/dates";

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  theme: "light" | "dark" | "system";
  accent_color: string;
  enabled_modules: Record<string, boolean>;
  auto_lock_minutes: number;
};

/** Sesi + profil user; redirect ke /login bila belum masuk. Di-cache per request. */
export const requireProfile = cache(async () => {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile: Profile = {
    id: user.id,
    display_name: data?.display_name ?? user.email?.split("@")[0] ?? "Kamu",
    timezone: data?.timezone ?? DEFAULT_TZ,
    theme: data?.theme ?? "system",
    accent_color: data?.accent_color ?? "#2F6B5E",
    enabled_modules: data?.enabled_modules ?? { task: true, keuangan: true, life: true, tracks: true },
    auto_lock_minutes: data?.auto_lock_minutes ?? 5,
  };
  return { supabase, user, profile };
});
