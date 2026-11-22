import Link from "next/link";
import { SlidersHorizontal, Check } from "lucide-react";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatLongDate, greeting } from "@/lib/dates";
import type { Block, Task } from "@/lib/types";
import { PrivacyToggle } from "@/components/Privacy";
import { QuickAdd } from "@/components/task/QuickAdd";
import { TaskItem } from "@/components/task/TaskItem";
import { BlockCard } from "@/components/blocks/BlockCard";
import { AffirmationBlock, pickAffirmation } from "@/components/blocks/AffirmationBlock";
import { GratitudeBlock } from "@/components/blocks/GratitudeBlock";
import { NoteBlock } from "@/components/blocks/NoteBlock";
import { BlockEditor } from "@/components/blocks/BlockEditor";

export const metadata = { title: "Hari Ini" };

const SIZE: Record<string, string> = {
  sm: "basis-[280px] grow",
  md: "basis-[340px] grow-[1.4]",
  lg: "basis-[520px] grow-[2]",
};

const TASK_FIELDS =
  "id,title,notes,due_date,due_time,priority,is_top,energy,estimate_min,labels,someday,recurrence_rule,postpone_count,completed_at,parent_id";

export default async function HariIni({ searchParams }: { searchParams: Promise<{ atur?: string }> }) {
  const { atur } = await searchParams;
  const { supabase, profile } = await requireProfile();
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
  const dayOf = (ts: string) => todayISO(tz, new Date(ts));
  const tasks = ((tasksRes.data ?? []) as Task[]).filter((t) => !t.completed_at || dayOf(t.completed_at) === today);
  const areaName = (r: { life_areas: unknown }) =>
    (Array.isArray(r.life_areas) ? r.life_areas[0]?.name : (r.life_areas as { name?: string } | null)?.name) ?? null;
  const affirmations = (affRes.data ?? []).map((a) => ({ id: a.id, text: a.text, area: areaName(a) }));
  const identities = (idRes.data ?? []).map((i) => ({ id: i.id, text: i.statement, area: areaName(i) }));

  const open = tasks.filter((t) => !t.completed_at).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted">{formatLongDate(today)}</span>
          <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">
            {atur ? "Atur dashboard" : `${greeting(tz)}, ${profile.display_name}`}
          </h1>
        </div>
        <div className="flex gap-2">
          <PrivacyToggle />
          {atur ? (
            <Link href="/" className="btn btn-primary"><Check size={16} aria-hidden />Selesai</Link>
          ) : (
            <Link href="/?atur=1" className="btn"><SlidersHorizontal size={16} aria-hidden />Atur dashboard</Link>
          )}
        </div>
      </header>

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
                    <p className="py-2 text-sm text-muted">Tidak ada task lain hari ini.</p>
                  )}
                </BlockCard>
              );
            } else if (b.type === "gratitude") {
              el = <GratitudeBlock title={title} entries={gratRes.data ?? []} count={Number(cfg.count ?? 3)} today={today} />;
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
