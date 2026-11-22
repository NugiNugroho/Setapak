import Link from "next/link";
import { redirect } from "next/navigation";
import { SlidersHorizontal, Check } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatLongDate } from "@/lib/dates";
import type { Block, Task } from "@/lib/types";
import { PrivacyToggle } from "@/components/Privacy";
import { QuickAdd } from "@/components/task/QuickAdd";
import { TaskItem } from "@/components/task/TaskItem";
import { BlockCard } from "@/components/blocks/BlockCard";
import { AffirmationBlock, pickAffirmation } from "@/components/blocks/AffirmationBlock";
import { GratitudeBlock } from "@/components/blocks/GratitudeBlock";
import { NoteBlock } from "@/components/blocks/NoteBlock";
import { BlockEditor } from "@/components/blocks/BlockEditor";
import { Money } from "@/components/Privacy";
import { Bar } from "@/components/ui";
import { HabitToggle } from "@/components/life/HabitToggle";
import { loadPrivacy, monthRange, summarize, isOperational, TX_FIELDS, type Tx } from "@/lib/finance";
import { loadHabits } from "@/lib/life-data";
import { loadTracks, summarizeTrack } from "@/lib/tracks-data";
import { formatMetric } from "@/lib/tracks";
import { greetingFor, partOfDay } from "@/lib/prefs";
import { addDays } from "@/lib/dates";
import { RitualCard } from "@/components/ritual/RitualCard";
import { TaskExamples } from "@/components/task/TaskExamples";
import { Tip } from "@/components/Tip";
import { AchievementToast } from "@/components/AchievementToast";
import { awardAchievements } from "@/lib/achievements";
import { signedUrls } from "@/lib/media";
import { dayNumber } from "@/lib/dates";
import { CoverHeader } from "@/components/blocks/CoverHeader";
import { MusicBlock } from "@/components/blocks/MusicBlock";
import { QuoteBlock } from "@/components/blocks/QuoteBlock";

export const metadata = { title: "Hari Ini" };

const SIZE: Record<string, string> = {
  sm: "basis-[280px] grow",
  md: "basis-[340px] grow-[1.4]",
  lg: "basis-[520px] grow-[2]",
};

const TASK_FIELDS =
  "id,title,notes,due_date,due_time,priority,is_top,energy,estimate_min,labels,someday,recurrence_rule,postpone_count,completed_at,parent_id";

export default async function HariIni({ searchParams }: { searchParams: Promise<{ atur?: string; ritual?: string }> }) {
  const { atur, ritual } = await searchParams;
  const { supabase, profile } = await requireProfile();
  if (!profile.onboarded) redirect("/mulai");
  const tz = profile.timezone;
  const today = todayISO(tz);

  // Semua query jalan paralel. Carry-over task terlewat ikut berjalan bersamaan;
  // query task sudah memakai due_date <= hari ini, jadi task terlewat tetap tampil.
  const [, blocksRes, tasksRes, affRes, idRes, gratRes] = await Promise.all([
    supabase.rpc("rollover_tasks", { p_today: today }),
    supabase.from("dashboard_blocks").select("*").order("position"),
    supabase
      .from("tasks")
      .select(TASK_FIELDS)
      .is("parent_id", null)
      .eq("someday", false)
      .lte("due_date", today)
      .order("priority")
      .order("due_time", { nullsFirst: false }),
    supabase.from("affirmations").select("id,text,sort_order,life_areas(name)").eq("active", true).order("sort_order").order("created_at"),
    supabase.from("identities").select("id,statement,sort_order,life_areas(name)").eq("archived", false).order("sort_order").order("created_at"),
    supabase.from("journal_entries").select("id,body").eq("kind", "gratitude").eq("entry_date", today).order("created_at"),
  ]);

  const blocks = (blocksRes.data ?? []) as Block[];
  const want = new Set(blocks.filter((b) => b.visible).map((b) => b.type));
  const { start: mStart, next: mNext } = monthRange(today.slice(0, 7));
  const showCover = !atur && profile.prefs.coverShow !== false;
  // Ritual pagi (04–11) / malam (19–04); bisa dipaksa lewat ?ritual= dari notifikasi.
  const part = partOfDay(tz);
  const ritualKind: "pagi" | "malam" | null = atur
    ? null
    : ritual === "pagi" || ritual === "malam"
      ? ritual
      : part === "pagi" || part === "malam" ? part : null;
  const lifeOn = profile.enabled_modules.life !== false;
  const tomorrow = addDays(today, 1);
  const [fin, hab, trk, quotesRes, coversRes, tomorrowRes] = await Promise.all([
    want.has("finance")
      ? Promise.all([
          loadPrivacy(supabase),
          supabase.from("transactions").select(TX_FIELDS).gte("tx_date", mStart).lt("tx_date", mNext),
          supabase.from("budgets").select("category_id,amount").eq("month", mStart),
        ])
      : null,
    want.has("habits") || (ritualKind && lifeOn) ? loadHabits(supabase, today, tz) : null,
    want.has("tracks") ? loadTracks(supabase, today, 4) : null,
    want.has("quote") ? supabase.from("quotes").select("id,text,author").eq("active", true).order("created_at") : null,
    showCover ? supabase.from("media").select("path").eq("kind", "cover").order("sort_order").order("created_at") : null,
    ritualKind === "malam"
      ? supabase.from("tasks").select("id", { count: "exact", head: true }).is("completed_at", null).eq("due_date", tomorrow)
      : null,
  ]);
  const coverPaths = (coversRes?.data ?? []).map((c) => c.path as string);
  const coverPath = coverPaths.length
    ? coverPaths[profile.prefs.coverRotate === false ? 0 : dayNumber(today) % coverPaths.length]
    : null;
  const bestStreak = hab ? Math.max(0, ...hab.habits.map((h) => h.streak)) : null;
  const [coverMap, newBadges] = await Promise.all([
    coverPath ? signedUrls(supabase, [coverPath]) : null,
    atur ? [] : awardAchievements(supabase, { createdAt: profile.created_at, bestHabitStreak: bestStreak }),
  ]);
  const coverUrl = coverPath ? coverMap?.get(coverPath) : undefined;
  const ageDays = (Date.now() - Date.parse(profile.created_at)) / 864e5;
  const greet = greetingFor(profile.prefs, tz, profile.display_name ?? "kamu");
  const dayOf = (ts: string) => todayISO(tz, new Date(ts));
  const tasks = ((tasksRes.data ?? []) as Task[]).filter((t) => !t.completed_at || dayOf(t.completed_at) === today);
  const areaName = (r: { life_areas: unknown }) =>
    (Array.isArray(r.life_areas) ? r.life_areas[0]?.name : (r.life_areas as { name?: string } | null)?.name) ?? null;
  const affirmations = (affRes.data ?? []).map((a) => ({ id: a.id, text: a.text, area: areaName(a) }));
  const identities = (idRes.data ?? []).map((i) => ({ id: i.id, text: i.statement, area: areaName(i) }));

  const open = tasks.filter((t) => !t.completed_at).length;

  return (
    <div className="flex flex-col gap-5">
      {(() => {
        const actions = (
          <>
            <PrivacyToggle />
            {atur ? (
              <Link href="/" className="btn btn-primary"><Check size={16} aria-hidden />Selesai</Link>
            ) : (
              <Link href="/?atur=1" className="btn"><SlidersHorizontal size={16} aria-hidden /><span className="hidden sm:inline">Atur dashboard</span></Link>
            )}
          </>
        );
        if (coverUrl && !atur) return <CoverHeader src={coverUrl} date={formatLongDate(today)} greeting={greet} actions={actions} />;
        return (
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-muted">{formatLongDate(today)}</span>
              <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{atur ? "Atur dashboard" : greet}</h1>
            </div>
            <div className="flex gap-2">{actions}</div>
          </header>
        );
      })()}

      {ritualKind && (
        <RitualCard
          kind={ritualKind}
          today={today}
          forced={ritual === ritualKind}
          identity={identities[0]?.text ?? null}
          topCount={tasks.filter((t) => t.is_top).length}
          habits={(hab?.habits ?? []).filter((h) => h.scheduledToday).map((h) => ({ id: h.id, name: h.name, icon: h.icon ?? null, today: h.today }))}
          gratitudeCount={(gratRes.data ?? []).length}
          tomorrowCount={tomorrowRes?.count ?? 0}
        />
      )}

      <AchievementToast keys={newBadges} />

      {!atur && ageDays >= 6 && ageDays < 21 && (
        <Tip id="first-week-review">
          Seminggu sudah kamu lewati. <Link href="/review" className="font-semibold text-accent">Buka Weekly Review pertamamu</Link> dan lihat sejauh apa jejakmu.
        </Tip>
      )}

      {!atur && ageDays > 2 && (
        <Tip id="dashboard-atur">Dashboard ini bisa kamu susun sendiri: ketuk <b>Atur dashboard</b> untuk menambah blok musik, kutipan, catatan, atau mengubah urutannya.</Tip>
      )}

      {atur ? (
        <BlockEditor blocks={blocks} />
      ) : (
        <div className="flex flex-wrap gap-5">
          {blocks.filter((b) => b.visible).map((b) => {
            const title = b.title ?? "";
            const cfg = b.config as Record<string, string | number | boolean | undefined>;
            let el: React.ReactNode = null;

            if (b.type === "affirmation") {
              const source = cfg.source === "identities" ? identities : affirmations;
              const item = pickAffirmation(source, String(cfg.mode ?? "sequential"), today, cfg.fixedId as string | undefined);
              el = (
                <AffirmationBlock
                  title={title}
                  item={item}
                  index={item ? source.findIndex((s) => s.id === item.id) : 0}
                  total={source.length}
                  sourceLabel={cfg.source === "identities" ? "identitas" : "afirmasi"}
                />
              );
            } else if (b.type === "priorities") {
              const count = Number(cfg.count ?? 3);
              const top = tasks.filter((t) => t.is_top).slice(0, count);
              const done = top.filter((t) => t.completed_at).length;
              el = (
                <BlockCard title={title} aside={top.length ? `${done} dari ${top.length} selesai` : undefined}>
                  {top.length ? (
                    <div>{top.map((t) => <TaskItem key={t.id} task={t} today={today} />)}</div>
                  ) : (
                    <p className="text-sm text-muted">Ketuk ★ pada task untuk menjadikannya prioritas, atau tambahkan langsung:</p>
                  )}
                  {top.length < count && <QuickAdd today={today} defaultToday top placeholder="Tambah prioritas…" />}
                </BlockCard>
              );
            } else if (b.type === "tasks") {
              const list = tasks.filter((t) => !t.is_top && (cfg.showDone !== false || !t.completed_at));
              el = (
                <BlockCard title={title} aside={`${open} tersisa`}>
                  <QuickAdd today={today} defaultToday />
                  {list.length ? (
                    <div>{list.map((t) => <TaskItem key={t.id} task={t} today={today} />)}</div>
                  ) : (
                    tasks.length ? <p className="py-2 text-sm text-muted">Tidak ada task lain hari ini.</p> : <div className="py-2"><TaskExamples today={today} examples={["Minum segelas air", "Baca 10 halaman 20.00", "Rapikan meja kerja"]} /></div>
                  )}
                </BlockCard>
              );
            } else if (b.type === "gratitude") {
              el = <GratitudeBlock title={title} entries={gratRes.data ?? []} count={Number(cfg.count ?? 3)} today={today} />;
            } else if (b.type === "finance" && fin) {
              const [priv, txRes, budRes] = fin;
              const txs = (txRes.data ?? []) as Tx[];
              const sum = summarize(txs);
              const budgeted = new Set((budRes.data ?? []).map((x) => x.category_id));
              const totalBudget = (budRes.data ?? []).reduce((a, x) => a + Number(x.amount), 0);
              const spentBudget = txs.filter((t) => t.kind === "expense" && isOperational(t) && t.category_id && budgeted.has(t.category_id)).reduce((a, t) => a + t.amount, 0);
              el = (
                <BlockCard title={title} aside={<Link href="/keuangan" className="font-semibold text-accent">Buka</Link>}>
                  {totalBudget > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted">Sisa budget</span>
                      <span className="text-2xl font-bold tracking-tight"><Money amount={totalBudget - spentBudget} sensitive={priv.transactions} /></span>
                      <Bar pct={(spentBudget / totalBudget) * 100} color={spentBudget > totalBudget ? "var(--neg)" : "var(--accent)"} height={8} />
                      <span className="text-xs text-muted">{Math.round((spentBudget / totalBudget) * 100)}% terpakai</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1"><span className="text-xs text-muted">Selisih bulan ini</span><span className="text-2xl font-bold"><Money amount={sum.net} sensitive={priv.transactions} sign /></span></div>
                  )}
                  <div className="flex justify-between border-t border-line-soft pt-2 text-sm">
                    <span>Masuk <b className="text-pos"><Money amount={sum.income} sensitive={priv.transactions} /></b></span>
                    <span>Keluar <b><Money amount={sum.expense} sensitive={priv.transactions} /></b></span>
                  </div>
                  <Link href="/keuangan/transaksi/baru?back=/" className="btn min-h-10 text-sm">+ Catat transaksi</Link>
                </BlockCard>
              );
            } else if (b.type === "habits" && hab) {
              const list = hab.habits.filter((h) => h.scheduledToday);
              const kept = list.filter((h) => h.today).length;
              el = (
                <BlockCard title={title} aside={list.length ? `${kept}/${list.length}` : undefined}>
                  {list.length ? list.map((h) => (
                    <div key={h.id} className="flex min-h-12 items-center gap-2 border-t border-line-soft first:border-t-0">
                      <HabitToggle habitId={h.id} date={today} status={h.today} name={h.name} />
                      <Link href={`/manifestasi/habit/${h.id}`} className="flex min-w-0 flex-1 flex-col">
                        <span className="font-medium">{h.icon ? `${h.icon} ` : ""}{h.name}</span>
                        {h.missed >= 1 && !h.today ? <span className="text-xs font-semibold text-warn">Jangan bolong dua kali{h.streak > 0 ? ` · centang hari ini, ${h.streak} langkah tetap aman` : ""}</span> : h.two_min_version ? <span className="truncate text-xs text-muted">minimal: {h.two_min_version}</span> : null}
                      </Link>
                      {h.streak > 1 && <span className="flex items-center gap-0.5 text-xs font-semibold text-[#9a4a1e]" title="Streak (satu kali bolong masih aman)">🔥{h.streak}</span>}
                    </div>
                  )) : <p className="text-sm text-muted">Belum ada habit hari ini. <Link href="/manifestasi/habit/baru" className="font-semibold text-accent">Buat habit</Link></p>}
                </BlockCard>
              );
            } else if (b.type === "tracks" && trk) {
              const rows = trk.tracks.map((t) => summarizeTrack(t, trk.metrics.filter((m) => m.track_id === t.id), trk.logs.filter((l) => l.track_id === t.id), today, 4));
              el = (
                <BlockCard title={title} aside={<Link href="/tracks" className="font-semibold text-accent">Semua</Link>}>
                  {rows.length ? rows.map((s) => (
                    <Link key={s.track.id} href={`/tracks/${s.track.id}`} className="flex flex-col gap-1.5 border-t border-line-soft pt-2.5 first:border-t-0 first:pt-0">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium">{s.track.icon ? <span aria-hidden>{s.track.icon}</span> : <span className="size-2.5 rounded-full" style={{ background: s.track.color }} />}{s.track.name}</span>
                        <span className="text-xs text-muted">{s.current ? `${s.current} hari · ` : ""}{formatMetric(s.periodValue, s.primary)}{s.primary.target ? ` / ${formatMetric(s.primary.target, s.primary)}` : ""}</span>
                      </div>
                      {s.pct != null && <Bar pct={s.pct} />}
                    </Link>
                  )) : <p className="text-sm text-muted">Belum ada track. <Link href="/tracks" className="font-semibold text-accent">Buat track</Link></p>}
                </BlockCard>
              );
            } else if (b.type === "quote") {
              const qs = quotesRes?.data ?? [];
              const n = dayNumber(today);
              const q = qs.length ? qs[cfg.mode === "random" ? Math.floor(Math.abs(Math.sin(n * 7919)) * 1e6) % qs.length : n % qs.length] : null;
              el = <QuoteBlock title={title} quote={q ? { text: q.text, author: q.author } : null} />;
            } else if (b.type === "music") {
              el = <MusicBlock title={title} url={String(cfg.url ?? "")} />;
            } else if (b.type === "note") {
              el = <NoteBlock id={b.id} title={title} text={String(cfg.text ?? "")} />;
            }

            return el ? <div key={b.id} className={`min-w-0 ${SIZE[b.size] ?? SIZE.md}`}>{el}</div> : null;
          })}
        </div>
      )}
    </div>
  );
}
