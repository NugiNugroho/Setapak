import Link from "next/link";
import { Download } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO } from "@/lib/dates";
import { loadPrivacy } from "@/lib/finance";
import { formatMetric, DURATION_METRIC } from "@/lib/tracks";
import { yearSummary } from "@/lib/wrapped";
import { Money } from "@/components/Privacy";

export const metadata = { title: "Rangkuman Tahunan" };

export default async function Rangkuman({ searchParams }: { searchParams: Promise<{ tahun?: string }> }) {
  const { tahun } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const thisYear = Number(todayISO(profile.timezone).slice(0, 4));
  const year = Number(tahun) >= 2000 && Number(tahun) <= thisYear ? Number(tahun) : thisYear;
  const [s, priv] = await Promise.all([yearSummary(supabase, year, profile.timezone), loadPrivacy(supabase)]);
  const hours = formatMetric(s.minutes, DURATION_METRIC);

  const slides: { big: React.ReactNode; label: string; note?: React.ReactNode; tone: string }[] = [
    { big: s.tasksDone, label: "task selesai", note: s.topLabel ? `paling sering: #${s.topLabel[0]} (${s.topLabel[1]}×)` : `${s.topDone} di antaranya prioritas utama`, tone: "bg-[#0B5A3C] text-white" },
    { big: hours, label: "waktu fokus tercatat", note: s.topTrack ? `paling banyak di ${s.topTrack.icon ?? ""} ${s.topTrack.name}` : `${s.sessions} sesi`, tone: "bg-[#F28C1B] text-white" },
    { big: s.longest, label: "hari berturut-turut terpanjang", note: `${s.activeDays} hari aktif sepanjang tahun`, tone: "bg-[#E9F3E6] text-[#0B5A3C]" },
    { big: s.votes, label: "suara untuk dirimu", note: s.topHabit ? `habit terkuat: ${s.topHabit.icon ?? ""} ${s.topHabit.name} (${s.topHabit.count}×)` : "dari habit, task & track yang tertaut identitas", tone: "bg-[#1F2A27] text-white" },
    { big: s.goals.length, label: "goal tercapai", note: s.goals.slice(0, 3).join(" · ") || "tahun depan giliranmu", tone: "bg-[#FCEBD6] text-[#7A3E05]" },
    { big: s.gratitude, label: "hal yang kamu syukuri", note: `${s.photos} foto · ${s.journals} catatan`, tone: "bg-surface text-ink border border-line" },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="text-sm font-semibold tracking-widest text-muted uppercase">Rangkuman Setapak</span>
        <h1 className="text-5xl font-extrabold tracking-tight text-[#0B5A3C] dark:text-accent">{year}</h1>
        <p className="text-muted">Langkah kecil, jejak panjang. Ini jejakmu tahun ini, {profile.display_name}.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {[thisYear - 1, thisYear].filter((y) => y !== year).map((y) => <Link key={y} href={`/rangkuman?tahun=${y}`} className="btn text-sm">Lihat {y}</Link>)}
          <a href={`/rangkuman/kartu?tahun=${year}`} download={`setapak-${year}.png`} className="btn btn-primary text-sm"><Download size={15} aria-hidden />Unduh kartu</a>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {slides.map((sl, i) => (
          <section key={i} className={`flex min-h-44 flex-col justify-between gap-3 rounded-3xl p-6 ${sl.tone}`}>
            <span className="text-5xl font-extrabold tracking-tight">{sl.big}</span>
            <span className="flex flex-col gap-1">
              <span className="text-lg font-bold">{sl.label}</span>
              {sl.note && <span className="text-sm opacity-80">{sl.note}</span>}
            </span>
          </section>
        ))}
      </div>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="font-bold">Keuangan {year}</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex flex-col"><span className="text-muted">Pemasukan</span><b className="text-lg text-pos"><Money amount={s.finance.income} sensitive={priv.transactions} /></b></div>
          <div className="flex flex-col"><span className="text-muted">Pengeluaran</span><b className="text-lg"><Money amount={s.finance.expense} sensitive={priv.transactions} /></b></div>
          <div className="flex flex-col"><span className="text-muted">Savings rate</span><b className="text-lg">{s.finance.income ? `${s.finance.savingsRate}%` : "—"}</b></div>
        </div>
        <p className="text-xs text-muted">Angka keuangan tidak dimasukkan ke kartu yang bisa diunduh.</p>
      </section>
    </div>
  );
}
