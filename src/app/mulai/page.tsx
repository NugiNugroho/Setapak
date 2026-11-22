import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/profile";
import { todayISO } from "@/lib/dates";
import { Welcome } from "@/components/Welcome";
import { ThemeSync } from "@/components/ThemeSync";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Mulai" };

/** Panduan awal untuk akun baru. Bisa dibuka ulang dari Pengaturan (?ulang=1). */
export default async function MulaiPage({ searchParams }: { searchParams: Promise<{ ulang?: string }> }) {
  const { ulang } = await searchParams;
  const { profile } = await requireProfile();
  if (profile.onboarded && !ulang) redirect("/");
  return (
    <>
      <ThemeSync theme={profile.theme} accent={profile.accent_color} />
      <Onboarding initialName={profile.display_name ?? ""} today={todayISO(profile.timezone)} />
      {!ulang && <Welcome userId={profile.id} name={profile.display_name ?? "kamu"} />}
    </>
  );
}
