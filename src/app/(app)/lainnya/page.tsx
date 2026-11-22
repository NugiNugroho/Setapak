import Link from "next/link";
import { Sparkles, Activity, CalendarDays, Settings } from "lucide-react";
export const metadata = { title: "Lainnya" };
const ITEMS = [
  { href: "/manifestasi", label: "Manifestasi", desc: "Identitas, habit, visi", icon: Sparkles },
  { href: "/tracks", label: "Tracks", desc: "Progress hal yang ditekuni", icon: Activity },
  { href: "/review", label: "Weekly Review", desc: "Refleksi mingguan", icon: CalendarDays },
  { href: "/pengaturan", label: "Pengaturan", desc: "Profil, tema, modul, afirmasi", icon: Settings },
];
export default function Lainnya() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">Lainnya</h1>
      <nav aria-label="Menu lainnya" className="card px-4">
        {ITEMS.map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href} className="flex min-h-16 items-center gap-3 border-t border-line-soft first:border-t-0">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={20} aria-hidden /></span>
            <span className="flex flex-col"><span className="font-semibold">{label}</span><span className="text-xs text-muted">{desc}</span></span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
