import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { label } from "@/lib/prefs";
import { todayISO, addDays, formatShortDate } from "@/lib/dates";
import { weekStart, formatMetric, aggregate } from "@/lib/tracks";
import { loadTracks, primaryOf } from "@/lib/tracks-data";
import { loadHabits } from "@/lib/life-data";
import { loadPrivacy, isOperational, monthRange, type Tx, TX_FIELDS } from "@/lib/finance";
import { Money } from "@/components/Privacy";
import { PageHeader, Card, Bar, Empty } from "@/components/ui";
import { saveReview } from "./actions";

export const metadata = { title: "Weekly Review" };

const QUESTIONS = [
  ["baik", "Apa yang berjalan baik minggu ini?"],
  ["ubah", "Apa yang perlu diubah?"],
  ["belajar", "Apa yang aku pelajari?"],
] as const;
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const range = (a: string, b: string) => `${Number(a.slice(8))} ${BULAN[Number(a.slice(5, 7)) - 1]} – ${Number(b.slice(8))} ${BULAN[Number(b.slice(5, 7)) - 1]} ${b.slice(0, 4)}`;

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const tz = profile.timezone;
  const today = todayISO(tz);
  const thisWeek = weekStart(today);
  const ws = w && /^\d{4}-\d{2}-\d{2}$/.test(w) ? weekStart(w) : thisWeek;
  const we = addDays(ws, 6);
  const end = we < today ? we : today;
  const dayOf = (ts: string) => todayISO(tz, new Date(ts));
  const { start: monthStart, next: monthNext } = monthRange(ws.slice(0, 7));

  const [priv, review, past, doneTasks, openTasks, txs, budgets, cats, tracksData, habitsData, goals, ms] = await Promise.all([
    loadPrivacy(supabase),
    supabase.from("weekly_reviews").select("*").eq("week_start", ws).maybeSingle(),
    supabase.from("weekly_reviews").select("week_start,completed_at").order("week_start", { ascending: false }).limit(12),
    supabase.from("tasks").select("id,title,completed_at,is_top").gte("completed_at", addDays(ws, -1)).lte("completed_at", addDays(we, 2)),
    supabase.from("tasks").select("id,title,postpone_count,due_date").is("completed_at", null).is("parent_id", null).lte("due_date", end).order("postpone_count", { ascending: false }),
    supabase.from("transactions").select(TX_FIELDS).gte("tx_date", addDays(ws, -28)).lte("tx_date", we),
    supabase.from("budgets").select("category_id,amount").eq("month", monthStart),
    supabase.from("categories").select("id,name"),
    loadTracks(supabase, today, 6),
    loadHabits(supabase, end, tz),
    supabase.from("goals").select("id,title").eq("status", "active"),
    supabase.from("milestones").select("goal_id,done_at"),
  ]);

  // 1 · Task
  const completed = (doneTasks.data ?? []).filter((t) => t.completed_at && dayOf(t.completed_at) >= ws && dayOf(t.completed_at) <= we);
  const topDone = completed.filter((t) => t.is_top).length;
  const open = openTasks.data ?? [];
  const stuck = open.filter((t) => t.postpone_count >= 2).slice(0, 3);

  // 2 · Keuangan
  const all = (txs.data ?? []) as Tx[];
  const spend = (from: string, to: string) => all.filter((t) => t.kind === "expense" && isOperational(t) && t.tx_date >= from && t.tx_date <= to).reduce((a, t) => a + t.amount, 0);
  const weekSpend = spend(ws, we);
  const avg4 = Math.round([1, 2, 3, 4].reduce((a, i) => a + spend(addDays(ws, -7 * i), addDays(ws, -7 * i + 6)), 0) / 4);
  const monthSpent = new Map<string, number>();
  for (const t of all) if (t.kind === "expense" && isOperational(t) && t.tx_date >= monthStart && t.tx_date < monthNext && t.category_id) monthSpent.set(t.category_id, (monthSpent.get(t.category_id) ?? 0) + t.amount);
  const catName = new Map((cats.data ?? []).map((c) => [c.id, c.name]));
  const over = (budgets.data ?? []).filter((b) => (monthSpent.get(b.category_id) ?? 0) > Number(b.amount));

  // 3 · Tracks
  const trackRows = tracksData.tracks.map((t) => {
    const p = primaryOf(tracksData.metrics.filter((m) => m.track_id === t.id));
    const value = aggregate(p, tracksData.logs.filter((l) => l.track_id === t.id && l.log_date >= ws && l.log_date <= we));
    const target = p.period === "week" ? p.target : p.period === "day" && p.target ? p.target * 7 : null;
    return { t, p, value, target };
  });

  // 4 · Goal
  const goalRows = (goals.data ?? []).map((g) => {
    const list = (ms.data ?? []).filter((m) => m.goal_id === g.id);
    const doneAll = list.filter((m) => m.done_at).length;
    const doneWeek = list.filter((m) => m.done_at && dayOf(m.done_at) >= ws && dayOf(m.done_at) <= we).length;
    return { g, pct: list.length ? Math.round((doneAll / list.length) * 100) : 0, doneWeek };
  });

  // 5 · Habit
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const habitRows = habitsData.habits.map((h) => {
    const cells = days.map((d) => ({ d, s: d > end || d < h.createdDate ? "future" : h.logs.get(d) ?? "none" }));
    const counted = cells.filter((c) => c.s !== "future");
    const kept = counted.filter((c) => c.s === "done" || c.s === "minimal").length;
    return { h, cells, pct: counted.length ? Math.round((kept / counted.length) * 100) : null };
  });

  const summary = { tasksDone: completed.length, topDone, weekSpend, avg4, habits: habitRows.map((r) => ({ id: r.h.id, pct: r.pct })) };
  const r = review.data;
  const answers = (r?.answers ?? {}) as Record<string, string>;
  const priorities: string[] = r?.priorities ?? [];
  const COLOR: Record<string, string> = { done: "var(--accent)", minimal: "#93BFB2", none: "#F3D3CA", missed: "#F3D3CA", future: "var(--line-soft)" };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <PageHeader
        eyebrow={<span className="flex gap-3"><Link href={`/review?w=${addDays(ws, -7)}`} className="font-semibold text-accent">‹ Minggu lalu</Link>{range(ws, we)}{ws < thisWeek && <Link href={`/review?w=${addDays(ws, 7)}`} className="font-semibold text-accent">Berikutnya ›</Link>}</span>}
        title={label(profile.prefs, "review")}
        actions={r?.completed_at ? <span className="flex items-center gap-1.5 text-sm font-semibold text-pos"><CheckCircle2 size={18} aria-hidden />Selesai {formatShortDate(dayOf(r.completed_at), today)}</span> : undefined}
      />
      <p className="-mt-2 text-sm text-ink-2">Sekitar 15 menit. Angkanya sudah disiapkan; kamu cukup membaca, memutuskan, dan menulis.</p>

      <Card title="1 · Task">
        <div className="grid grid-cols-3 gap-3">
          <Num label="Selesai" value={completed.length} />
          <Num label="Prioritas utama selesai" value={topDone} />
          <Num label="Masih terbuka" value={open.length} />
        </div>
        {stuck.length > 0 && (
          <div className="flex flex-col gap-1.5 rounded-xl border border-[#F0DDB8] bg-warn-soft p-3 text-sm">
            <b className="text-warn">Sering ditunda — putuskan sekarang:</b>
            {stuck.map((t) => <span key={t.id}>{t.title} <span className="text-muted">(ditunda {t.postpone_count}×)</span></span>)}
            <span className="text-xs text-muted">Pecah jadi langkah 2 menit, jadwalkan ulang, atau hapus di halaman <Link href="/task" className="font-semibold text-accent">Task</Link>.</span>
          </div>
        )}
      </Card>

      <Card title="2 · Keuangan">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex flex-col"><span className="text-xs text-muted">Pengeluaran minggu ini</span><span className="text-2xl font-bold"><Money amount={weekSpend} sensitive={priv.transactions} /></span>
            {avg4 > 0 && <span className={`text-xs ${weekSpend <= avg4 ? "text-pos" : "text-neg"}`}>{weekSpend <= avg4 ? "Di bawah" : "Di atas"} rata-rata 4 minggu (<Money amount={avg4} sensitive={priv.transactions} />)</span>}
          </div>
          <div className="flex flex-1 flex-col gap-1 text-sm">
            {over.length ? over.map((b) => <span key={b.category_id} className="text-neg">{catName.get(b.category_id)}: lewat budget bulan ini</span>) : <span className="text-muted">Tidak ada kategori yang lewat budget.</span>}
          </div>
        </div>
      </Card>

      <Card title="3 · Tracks vs target">
        {trackRows.length ? trackRows.map(({ t, p, value, target }) => (
          <div key={t.id} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate font-medium">{t.name}</span>
            <div className="flex-1"><Bar pct={target ? (value / target) * 100 : value ? 100 : 0} height={9} color={target && value < target * 0.7 ? "#C9862B" : "var(--accent)"} /></div>
            <span className="w-32 text-right text-sm font-semibold">{formatMetric(value, p)}{target ? ` / ${formatMetric(target, p)}` : ""}</span>
          </div>
        )) : <Empty>Belum ada track.</Empty>}
      </Card>

      <Card title="4 · Goal">
        {goalRows.length ? goalRows.map(({ g, pct, doneWeek }) => (
          <div key={g.id} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm"><span className="font-semibold">{g.title}</span><b>{pct}% {doneWeek ? <span className="text-pos">+{doneWeek} milestone</span> : <span className="font-normal text-muted">tidak bergerak</span>}</b></div>
            <Bar pct={pct} />
          </div>
        )) : <Empty>Belum ada goal aktif.</Empty>}
      </Card>

      <Card title="5 · Konsistensi habit">
        {habitRows.length ? habitRows.map(({ h, cells, pct }) => (
          <div key={h.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2 first:border-t-0">
            <Link href={`/manifestasi/habit/${h.id}`} className="min-w-[160px] flex-1 font-semibold">{h.name}</Link>
            <span className="flex gap-1" aria-hidden>{cells.map((c) => <span key={c.d} className="size-[18px] rounded-[5px]" style={{ background: COLOR[c.s] }} />)}</span>
            <b className="w-11 text-right">{pct == null ? "—" : `${pct}%`}</b>
            <span className={`w-36 rounded-md px-2 py-1 text-center text-xs font-semibold ${h.advice === "up" ? "bg-accent-soft text-accent" : h.advice === "down" ? "bg-warn-soft text-warn" : "bg-sidebar text-ink-2"}`}>
              {h.advice === "up" ? "Siap naik level" : h.advice === "down" ? "Coba turunkan level" : "Pertahankan"}
            </span>
          </div>
        )) : <Empty>Belum ada habit.</Empty>}
      </Card>

      <form action={saveReview.bind(null, ws, summary)} className="flex flex-col gap-5">
        <Card title="6 · Refleksi">
          {QUESTIONS.map(([k, q]) => (
            <label key={k} className="flex flex-col gap-1.5"><span className="font-semibold">{q}</span>
              <textarea name={`q_${k}`} rows={2} defaultValue={answers[k] ?? ""} className="field py-2" /></label>
          ))}
        </Card>
        <Card title="7 · 3 prioritas minggu depan" className="border-accent">
          {[0, 1, 2].map((i) => (
            <label key={i} className="flex items-center gap-3">
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${i < 2 ? "bg-accent text-on-accent" : "bg-line text-ink-2"}`}>{i + 1}</span>
              <span className="sr-only">Prioritas {i + 1}</span>
              <input name="priority" defaultValue={priorities[i] ?? ""} placeholder={i === 0 ? "Hal terpenting minggu depan" : "Prioritas berikutnya"} className="field" />
            </label>
          ))}
          <p className="text-xs text-muted">Saat review diselesaikan, ketiganya otomatis menjadi task prioritas utama untuk Senin, {formatShortDate(addDays(ws, 7))}.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn">Simpan draft</button>
            <button name="finish" value="1" className="btn btn-primary">{r?.completed_at ? "Perbarui review" : "Selesaikan review & buat task"}</button>
          </div>
        </Card>
      </form>

      {(past.data ?? []).length > 0 && (
        <Card title="Arsip review">
          <div className="flex flex-wrap gap-2">
            {(past.data ?? []).map((p) => (
              <Link key={p.week_start} href={`/review?w=${p.week_start}`} className={`rounded-lg border px-3 py-2 text-sm ${p.week_start === ws ? "border-accent bg-accent-soft font-semibold" : "border-line"}`}>
                {range(p.week_start, addDays(p.week_start, 6))}{p.completed_at ? " ✓" : " · draft"}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Num({ label, value }: { label: string; value: number }) {
  return <div className="flex flex-col rounded-xl bg-surface-2 p-3"><span className="text-xs text-muted">{label}</span><span className="text-2xl font-bold">{value}</span></div>;
}
