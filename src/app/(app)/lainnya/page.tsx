import Link from "next/link";
import { Sparkles, Activity, CalendarDays, Settings, Images, Gift, Info } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { label } from "@/lib/prefs";

export const metadata = { title: "Lainnya" };

export default async function Lainnya() {
  const { profile } = await requireProfile();
  const p = profile.prefs;
  const year = new Date().getFullYear();
  const ITEMS = [
    { href: "/manifestasi", label: label(p, "life"), desc: "Identitas, habit, visi", icon: Sparkles },
    { href: "/tracks", label: label(p, "tracks"), desc: "Progress hal yang ditekuni", icon: Activity },
    { href: "/review", label: label(p, "review"), desc: "Refleksi mingguan", icon: CalendarDays },
    { href: "/jejak", label: "Galeri Jejak", desc: "Foto & catatan perjalananmu", icon: Images },
    { href: `/rangkuman?tahun=${year}`, label: `Rangkuman ${year}`, desc: "Satu tahun dalam angka", icon: Gift },
    { href: "/pengaturan", label: "Pengaturan", desc: "Profil, tampilan, suara, kata-kata", icon: Settings },
    { href: "/pengaturan/tentang", label: "Tentang", desc: `Versi ${process.env.NEXT_PUBLIC_APP_VERSION}`, icon: Info },
  ];
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">Lainnya</h1>
      <nav aria-label="Menu lainnya" className="card px-4">
        {ITEMS.map(({ href, label: l, desc, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-16 items-center gap-3 border-t border-line-soft first:border-t-0">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={20} aria-hidden /></span>
            <span className="flex flex-col"><span className="font-semibold">{l}</span><span className="text-xs text-muted">{desc}</span></span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
