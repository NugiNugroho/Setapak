import Link from "next/link";
import { Plus, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatLongDate } from "@/lib/dates";
import { describeFrequency } from "@/lib/habits";
import { loadHabits, loadVotes, type HabitView } from "@/lib/life-data";
import { PageHeader, Card, Empty } from "@/components/ui";
import { LifeNav } from "@/components/life/LifeNav";
import { HabitToggle } from "@/components/life/HabitToggle";
import { addIdentity, setHabitLevel } from "./actions";

export const metadata = { title: "Life" };

const STRIP = { done: "var(--accent)", minimal: "#93BFB2", missed: "#F3D3CA", none: "#F3D3CA", off: "var(--line-soft)" } as const;

export default async function LifePage() {
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const [{ habits, stacks, identities }, votes, areas] = await Promise.all([
    loadHabits(supabase, today, profile.timezone),
    loadVotes(supabase, today),
    supabase.from("life_areas").select("id,name").order("sort_order"),
  ]);

  const todayHabits = habits.filter((h) => h.scheduledToday);
  const keptToday = todayHabits.filter((h) => h.today === "done" || h.today === "minimal").length;
  const groups: { id: string; name: string; anchor: string | null; items: HabitView[] }[] = [
    ...stacks.map((s) => ({ ...s, items: todayHabits.filter((h) => h.stack_id === s.id) })),
    { id: "none", name: "Tanpa rantai", anchor: null, items: todayHabits.filter((h) => !h.stack_id) },
  ].filter((g) => g.items.length);
  const warnings = habits.filter((h) => h.remind_missed && h.missed >= 1 && h.today == null && h.scheduledToday);
  const advice = habits.filter((h) => h.advice === "up" || h.advice === "down");
  const cum = votes.cumulative;
  const cumMax = Math.max(1, ...cum);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Setiap tindakan adalah suara untuk orang yang ingin kamu jadi"
        title="Life"
        actions={<Link href="/life/habit/baru" className="btn btn-primary"><Plus size={16} aria-hidden />Habit baru</Link>}
      />
      <LifeNav current="ringkasan" />

      {identities.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {identities.map((i) => {
            const days = votes.perDay.get(i.id) ?? Array(7).fill(0);
            const week = days.reduce((a: number, b: number) => a + b, 0);
            const max = Math.max(1, ...days);
            const linked = habits.filter((h) => h.identity_id === i.id).length;
            return (
              <section key={i.id} aria-label={i.statement} className="card flex flex-col gap-3 p-4">
                {i.area && <span className="self-start rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase" style={{ background: `${i.color}1a`, color: i.color }}>{i.area}</span>}
                <p className="text-[17px] leading-snug font-semibold">{i.statement}</p>
                <div className="flex items-end justify-between gap-3">
                  <div className="flex flex-col"><span className="text-2xl font-bold">{week}</span><span className="text-xs text-muted">suara 7 hari terakhir</span></div>
                  <div className="flex h-9 items-end gap-1" aria-hidden>
                    {days.map((d: number, idx: number) => <span key={idx} className="w-2.5 rounded-[3px]" style={{ height: `${Math.max(4, (d / max) * 36)}px`, background: i.color, opacity: idx === 6 ? 1 : 0.5 }} />)}
                  </div>
                </div>
                <span className="border-t border-line-soft pt-2 text-xs text-muted">{linked} habit tertaut</span>
              </section>
            );
          })}
        </div>
      ) : (
        <Card title="Mulai dari identitas">
          <p className="text-sm text-ink-2">Atomic Habits: perubahan yang bertahan dimulai dari <b>siapa yang ingin kamu jadi</b>, bukan dari target. Tulis satu identitas, lalu buat habit kecil sebagai buktinya.</p>
        </Card>
      )}

      <details className="card px-5 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-accent">+ Tambah identitas</summary>
        <form action={addIdentity} className="mt-3 flex flex-wrap gap-2">
          <label className="min-w-[240px] flex-[3]"><span className="sr-only">Pernyataan identitas</span><input name="statement" required placeholder="Aku adalah orang yang menjaga tubuhnya tetap bergerak" className="field" /></label>
          <label className="min-w-[140px] flex-1"><span className="sr-only">Area</span><select name="area_id" className="field"><option value="">Area…</option>{(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          <button className="btn">Tambah</button>
        </form>
      </details>

      <div className="flex flex-wrap gap-5">
        <Card title="Habit hari ini" aside={todayHabits.length ? `${keptToday} dari ${todayHabits.length} · ${formatLongDate(today).split(",")[0]}` : undefined} className="min-w-0 grow-[1.6] basis-[440px]">
          {groups.length ? groups.map((g) => (
            <div key={g.id} className="flex flex-col">
              <div className="flex items-baseline justify-between gap-2 pt-1">
                <span className="text-xs font-bold tracking-wide text-muted uppercase">{g.name}</span>
                {g.anchor && <span className="text-xs text-muted">setelah {g.anchor}</span>}
              </div>
              {g.items.map((h) => (
                <div key={h.id} className="flex min-h-14 items-center gap-2 border-t border-line-soft first:border-t-0">
                  <HabitToggle habitId={h.id} date={today} status={h.today} name={h.name} />
                  <Link href={`/life/habit/${h.id}`} className="flex min-w-0 flex-1 flex-col py-2">
                    <span className={`font-semibold ${h.kind === "break" ? "text-ink-2" : ""}`}>{h.kind === "break" ? `Tidak ${h.name.charAt(0).toLowerCase()}${h.name.slice(1)}` : h.name}</span>
                    <span className="truncate text-xs text-muted">
                      {h.today === "minimal" ? `Versi 2 menit: ${h.two_min_version ?? "—"}` : [h.full_version, h.two_min_version && `minimal: ${h.two_min_version}`].filter(Boolean).join(" · ") || describeFrequency(h.frequency)}
                    </span>
                  </Link>
                  {h.c30 != null && <span className="text-xs font-semibold text-muted">{h.c30}%</span>}
                </div>
              ))}
            </div>
          )) : <Empty>{habits.length ? "Tidak ada habit terjadwal hari ini." : <>Belum ada habit. <Link href="/life/habit/baru" className="font-semibold text-accent">Buat yang pertama</Link></>}</Empty>}
          {todayHabits.length > 0 && <p className="text-xs text-muted">Ketuk kotak: belum → selesai → versi 2 menit → belum.</p>}
        </Card>

        <div className="flex grow basis-[300px] flex-col gap-4">
          {warnings.map((h) => (
            <section key={h.id} aria-label="Jangan bolong dua kali" className={`flex flex-col gap-2 rounded-2xl border p-4 ${h.missed >= 2 ? "border-[#F3D3CA] bg-[#FBF3F1] dark:bg-surface-2" : "border-[#F0DDB8] bg-warn-soft"}`}>
              <span className={`flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase ${h.missed >= 2 ? "text-neg" : "text-warn"}`}><AlertTriangle size={14} aria-hidden />{h.missed >= 2 ? `Terlewat ${h.missed}× berturut-turut` : "Jangan bolong dua kali"}</span>
              <p className="font-semibold">{h.name} terlewat {h.missed >= 2 ? "beberapa hari" : "kemarin"}.</p>
              {h.two_min_version && <p className="text-sm text-ink-2">Versi 2 menitnya cukup untuk menjaga rantai: {h.two_min_version}.</p>}
            </section>
          ))}
          {advice.map((h) => (
            <section key={h.id} aria-label="Saran level" className="card flex flex-col gap-2 p-4">
              <span className={`flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase ${h.advice === "up" ? "text-accent" : "text-warn"}`}>
                {h.advice === "up" ? <><TrendingUp size={14} aria-hidden />Siap naik level</> : <><TrendingDown size={14} aria-hidden />Coba turunkan level</>}
              </span>
              <p className="font-semibold">{h.name}: {h.c21}% konsisten 3 minggu terakhir.</p>
              <p className="text-sm text-muted">{h.advice === "up" ? "Tantangan yang pas menjaga motivasi." : "Lebih kecil tapi rutin lebih baik daripada besar tapi bolong."} Level {h.level} → {h.advice === "up" ? h.level + 1 : Math.max(1, h.level - 1)}</p>
              <form action={setHabitLevel.bind(null, h.id, h.advice === "up" ? h.level + 1 : Math.max(1, h.level - 1))}>
                <button className="btn btn-primary min-h-9 text-sm">{h.advice === "up" ? "Naikkan" : "Turunkan"}</button>
              </form>
            </section>
          ))}
          <Card title="Efek majemuk">
            <span className="text-2xl font-bold">{votes.total} suara</span>
            <span className="-mt-2 text-xs text-muted">dari habit, task, dan sesi track yang tertaut identitas</span>
            <svg viewBox="0 0 300 100" role="img" aria-label="Suara kumulatif 12 minggu" className="h-auto w-full">
              <line x1="0" y1="95" x2="300" y2="95" stroke="var(--line)" />
              <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                points={cum.map((v, i) => `${(i / 11) * 296 + 2},${93 - (v / cumMax) * 85}`).join(" ")} />
            </svg>
            <p className="text-xs text-ink-2">1% lebih baik setiap hari ≈ 37× dalam setahun. Progres terasa lambat di awal itu normal.</p>
          </Card>
        </div>
      </div>

      {habits.length > 0 && (
        <Card title="Konsistensi · 30 hari" aside={<Link href="/life/habit/baru" className="font-semibold text-accent">+ Habit</Link>}>
          {habits.map((h) => (
            <Link key={h.id} href={`/life/habit/${h.id}`} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0">
              <span className="flex min-w-[180px] flex-1 flex-col">
                <span className="font-semibold">{h.name}</span>
                <span className="text-xs text-muted">{identities.find((i) => i.id === h.identity_id)?.statement ?? ""} · Level {h.level} · {describeFrequency(h.frequency)}</span>
              </span>
              <span className="flex gap-[2px]" aria-hidden>
                {h.strip.map((c) => <span key={c.date} className="h-[18px] w-[7px] rounded-[2px]" style={{ background: STRIP[c.status] }} />)}
              </span>
              <b className={`w-11 text-right ${h.c30 == null ? "text-muted" : h.c30 >= 80 ? "text-accent" : h.c30 >= 50 ? "text-warn" : "text-neg"}`}>{h.c30 == null ? "—" : `${h.c30}%`}</b>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
