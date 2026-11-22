import Link from "next/link";
import { ComingSoon } from "@/components/ComingSoon";
export const metadata = { title: "Life" };
export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <ComingSoon title="Life" phase="Fase 3" items={["Identitas & suara (votes)", "Habit dengan Empat Hukum, habit stack, versi 2 menit", "Never miss twice, level, efek majemuk", "Visi & Goal, scorecard, refleksi tahunan"]} />
      <p className="text-sm text-muted">Sementara ini, identitas dan afirmasi bisa diisi di <Link href="/pengaturan#identitas" className="font-semibold text-accent">Pengaturan</Link>.</p>
    </div>
  );
}
