import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO, addDays, weekday } from "@/lib/dates";
import { describeFrequency, intention, isScheduled } from "@/lib/habits";
import { loadHabits } from "@/lib/life-data";
import { monthLabel, shiftMonth } from "@/lib/finance";
import { Card } from "@/components/ui";
import { HabitToggle } from "@/components/life/HabitToggle";
import { setHabitArchived, setHabitLevel } from "../../actions";

export const metadata = { title: "Detail habit" };

export default async function HabitDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const { id } = await params;
  const { m: mp } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const { habits, stacks, identities } = await loadHabits(supabase, today, profile.timezone, { id });
  const h = habits[0];
  if (!h) notFound();
  const { count: votes } = await supabase.from("habit_logs").select("id", { count: "exact", head: true }).eq("habit_id", id).in("status", ["done", "minimal"]);
  const stack = stacks.find((s) => s.id === h.stack_id);
  const identity = identities.find((i) => i.id === h.identity_id);

  const m = mp && /^\d{4}-\d{2}$/.test(mp) ? mp : today.slice(0, 7);
  const first = `${m}-01`;
  const lead = (weekday(first) + 6) % 7;
  const daysInMonth = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate();
  const minimalThisMonth = [...h.logs.entries()].filter(([d, s]) => d.startsWith(m) && s === "minimal").length;

  const laws = [
    ["Jelas", [intention({ ...h, stackAnchor: stack?.anchor ?? stack?.name }), h.environment_note].filter(Boolean).join(" · ")],
    ["Menarik", h.bundle],
    ["Mudah", [h.two_min_version && `minimal: ${h.two_min_version}`, h.full_version && `penuh: ${h.full_version}`, h.friction_note].filter(Boolean).join(" · ")],
    ["Memuaskan", h.reward],
  ] as const;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link href="/life" className="flex items-center gap-1 text-sm font-semibold text-accent"><ChevronLeft size={16} aria-hidden />Life</Link>
        <Link href={`/life/habit/${id}/ubah`} className="btn min-h-9 text-sm"><Pencil size={14} aria-hidden />Ubah</Link>
      </div>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{h.kind === "break" ? `Berhenti: ${h.name}` : h.name}</h1>
        <span className="text-sm text-muted">{[stack && `setelah ${stack.anchor ?? stack.name}`, h.cue_location, describeFrequency(h.frequency), `Level ${h.level}`].filter(Boolean).join(" · ")}</span>
        {identity && <span className="self-start rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">Suara untuk: {identity.statement}</span>}
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Konsistensi 30 hari" value={h.c30 == null ? "—" : `${h.c30}%`} />
        <Stat label="Total suara" value={String(votes ?? 0)} />
        <Stat label="Versi 2 menit" value={`${minimalThisMonth}×`} note="bulan ini" />
      </div>

      {(h.advice === "up" || h.advice === "down") && (
        <section aria-label="Saran level" className="flex flex-col gap-3 rounded-2xl bg-accent p-4 text-on-accent">
          <span className="text-xs font-bold tracking-wide uppercase opacity-80">{h.advice === "up" ? "Siap naik level" : "Coba turunkan level"}</span>
          <p className="font-semibold">{h.advice === "up" ? `${h.c21}% konsisten 3 minggu terakhir. Tantangan yang pas menjaga motivasi.` : `${h.c21}% dalam 3 minggu. Lebih kecil tapi rutin lebih baik.`}</p>
          <div className="flex gap-2">
            <form action={setHabitLevel.bind(null, id, h.advice === "up" ? h.level + 1 : Math.max(1, h.level - 1))}>
              <button className="btn border-0 bg-surface text-accent">{h.advice === "up" ? `Naik ke level ${h.level + 1}` : `Turun ke level ${Math.max(1, h.level - 1)}`}</button>
            </form>
            <Link href={`/life/habit/${id}/ubah`} className="btn border-on-accent/40 bg-transparent text-on-accent">Ubah versi habit</Link>
          </div>
        </section>
      )}

      <Card title={monthLabel(m)} aside={
        <span className="flex gap-2">
          <Link href={`/life/habit/${id}?m=${shiftMonth(m, -1)}`} className="font-semibold text-accent">‹ Sebelumnya</Link>
          {m < today.slice(0, 7) && <Link href={`/life/habit/${id}?m=${shiftMonth(m, 1)}`} className="font-semibold text-accent">Berikutnya ›</Link>}
        </span>
      }>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => <span key={d} className="text-[11px] text-muted">{d}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const date = addDays(first, i);
            const future = date > today;
            const off = !isScheduled(h, date) || date < h.createdDate;
            if (future || off) {
              return <span key={date} className={`flex h-11 items-center justify-center rounded-lg text-xs ${future ? "bg-line-soft text-muted" : "text-muted"}`}>{i + 1}</span>;
            }
            return (
              <div key={date} className="flex flex-col items-center">
                <HabitToggle habitId={id} date={date} status={h.logs.get(date) ?? null} name={`${h.name} ${date}`} size={30} />
                <span className={`-mt-1 text-[10px] ${date === today ? "font-bold text-accent" : "text-muted"}`}>{i + 1}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted">Ketuk hari untuk memperbaiki catatan. Tujuannya bukan sempurna, tapi tidak bolong dua kali.</p>
      </Card>

      <Card title="Empat Hukum">
        {laws.map(([k, v]) => (
          <div key={k} className="flex gap-3 border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
            <span className="w-24 shrink-0 text-xs text-muted">{k}</span>
            <span className="text-sm">{v || <span className="text-muted">—</span>}</span>
          </div>
        ))}
      </Card>

      <form action={setHabitArchived.bind(null, id, !h.archived)}>
        <button className="btn text-sm">{h.archived ? "Aktifkan lagi" : "Arsipkan habit"}</button>
      </form>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card flex flex-col gap-1 px-3.5 py-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xl font-bold">{value}</span>
      {note && <span className="text-[11px] text-muted">{note}</span>}
    </div>
  );
}
