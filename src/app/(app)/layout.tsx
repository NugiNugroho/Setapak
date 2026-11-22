import { Sidebar, BottomNav } from "@/components/AppNav";
import { PrivacyProvider } from "@/components/Privacy";
import { ThemeSync } from "@/components/ThemeSync";
import { Welcome } from "@/components/Welcome";
import { requireProfile } from "@/lib/profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireProfile();
  return (
    <PrivacyProvider autoLockMinutes={profile.auto_lock_minutes}>
      <ThemeSync theme={profile.theme} accent={profile.accent_color} />
      <div className="flex min-h-dvh">
        <Sidebar name={profile.display_name ?? "Kamu"} modules={profile.enabled_modules} />
        <main className="min-w-0 flex-1 px-4 pt-6 pb-32 md:px-10 md:pt-8 md:pb-12">
          <div className="mx-auto max-w-[1160px]">{children}</div>
        </main>
      </div>
      <BottomNav modules={profile.enabled_modules} />
      <Welcome userId={profile.id} name={profile.display_name ?? "kamu"} />
    </PrivacyProvider>
  );
}
