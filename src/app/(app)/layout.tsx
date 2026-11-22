import { Sidebar, BottomNav } from "@/components/AppNav";
import { PrivacyProvider } from "@/components/Privacy";
import { ThemeSync } from "@/components/ThemeSync";
import { Welcome } from "@/components/Welcome";
import { PrefsProvider } from "@/components/PrefsProvider";
import { MusicProvider } from "@/components/music/MusicProvider";
import { MusicButton } from "@/components/music/MusicButton";
import { requireProfile } from "@/lib/profile";
import { FONTS, label, type ModuleKey } from "@/lib/prefs";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  const prefs = profile.prefs;
  const font = FONTS[prefs.font ?? "jakarta"] ?? FONTS.jakarta;
  const labels = Object.fromEntries(
    (["task", "keuangan", "life", "tracks", "review"] as ModuleKey[]).map((k) => [k, label(prefs, k)]),
  ) as Record<ModuleKey, string>;

  return (
    <PrivacyProvider autoLockMinutes={profile.auto_lock_minutes}>
      <PrefsProvider sounds={prefs.sounds?.enabled !== false} volume={prefs.sounds?.volume ?? 0.6}>
        <MusicProvider>
        {font.css && <link rel="stylesheet" href={font.css} precedence="default" />}
        <ThemeSync theme={profile.theme} accent={profile.accent_color} />
        <div className="flex min-h-dvh" style={{ fontFamily: font.family }}>
          <Sidebar name={profile.display_name ?? "Kamu"} modules={profile.enabled_modules} labels={labels} />
          <main className="min-w-0 flex-1 px-4 pt-6 pb-44 md:px-10 md:pt-8 md:pb-24">
            <div className="mx-auto max-w-[1160px]">{children}</div>
          </main>
        </div>
        <BottomNav modules={profile.enabled_modules} labels={labels} />
        <MusicButton />
        <Welcome userId={profile.id} name={profile.display_name ?? "kamu"} />
        </MusicProvider>
      </PrefsProvider>
    </PrivacyProvider>
  );
}
