import Link from "next/link";
import { SquareCheck } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { TaskExamples } from "@/components/task/TaskExamples";
import { Tip } from "@/components/Tip";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatShortDate } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { QuickAdd } from "@/components/task/QuickAdd";
import { TaskItem } from "@/components/task/TaskItem";

export const metadata = { title: "Task" };

const VIEWS = [
  { key: "hari-ini", label: "Hari ini" },
  { key: "inbox", label: "Inbox" },
  { key: "mendatang", label: "Mendatang" },
  { key: "someday", label: "Someday" },
  { key: "selesai", label: "Selesai" },
] as const;

const FIELDS =
  "id,title,notes,due_date,due_time,priority,is_top,energy,estimate_min,labels,someday,recurrence_rule,postpone_count,completed_at,parent_id";

export default async function TaskPage({ searchParams }: { searchParams: Promise<{ v?: string; baru?: string; label?: string }> }) {
  const { v = "hari-ini", baru, label } = await searchParams;
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const rollover = supabase.rpc("rollover_tasks", { p_today: today });

  let q = supabase.from("tasks").select(FIELDS).is("parent_id", null);
  if (v === "selesai") q = q.not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(50);
  else {
    q = q.is("completed_at", null);
    if (v === "inbox") q = q.is("due_date", null).eq("someday", false);
    else if (v === "mendatang") q = q.gt("due_date", today).order("due_date");
    else if (v === "someday") q = q.eq("someday", true);
    else q = q.lte("due_date", today).eq("someday", false);
    q = q.order("priority").order("due_time", { nullsFirst: false }).order("created_at");
  }
  if (label) q = q.contains("labels", [label]);

  const [, { data }, counts] = await Promise.all([
    rollover,
    q,
    Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).is("completed_at", null).is("parent_id", null).lte("due_date", today).eq("someday", false),
      supabase.from("tasks").select("id", { count: "exact", head: true }).is("completed_at", null).is("parent_id", null).is("due_date", null).eq("someday", false),
    ]),
  ]);
  const tasks = (data ?? []) as Task[];
  const countFor: Record<string, number | null> = { "hari-ini": counts[0].count, inbox: counts[1].count };

  // Kelompokkan "Mendatang" per tanggal.
  const groups: [string, Task[]][] = [];
  if (v === "mendatang") {
    for (const t of tasks) {
      const key = t.due_date ?? "";
      const g = groups.find(([k]) => k === key);
      if (g) g[1].push(t);
      else groups.push([key, [t]]);
    }
  }
  const allLabels = Array.from(new Set(tasks.flatMap((t) => t.labels))).sort();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">{tasks.length} task{label ? ` · #${label}` : ""}</span>
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{VIEWS.find((x) => x.key === v)?.label ?? "Task"}</h1>
      </header>

      <nav aria-label="Tampilan task" className="-mx-1 flex gap-1.5 overflow-x-auto px-1">
        {VIEWS.map((x) => (
          <Link
            key={x.key}
            href={`/task?v=${x.key}`}
            aria-current={v === x.key ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm ${
              v === x.key ? "bg-ink font-semibold text-bg" : "border border-line bg-surface text-ink-2"
            }`}
          >
            {x.label}
            {countFor[x.key] ? <span className="ml-1.5 opacity-70">{countFor[x.key]}</span> : null}
          </Link>
        ))}
      </nav>

      {v !== "selesai" && (
        <QuickAdd today={today} autoFocus={!!baru} defaultToday={v === "hari-ini"} />
      )}
      {v !== "selesai" && (
        <Tip id="task-parser">
          Tulis seperti bicara: <b>Revisi essay besok 10.00 #lpdp !1</b>. Tanggal, jam, label, dan prioritas terisi otomatis.
        </Tip>
      )}

      {allLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-xs text-muted">Label:</span>
          {label && <Link href={`/task?v=${v}`} className="rounded-md px-2 py-1 text-xs font-semibold text-neg">× hapus filter</Link>}
          {allLabels.map((l) => (
            <Link key={l} href={`/task?v=${v}&label=${encodeURIComponent(l)}`} className={`rounded-md px-2 py-1 text-xs font-semibold ${l === label ? "bg-accent text-on-accent" : "bg-accent-soft text-accent"}`}>
              #{l}
            </Link>
          ))}
        </div>
      )}

      {v === "mendatang" ? (
        groups.length ? (
          groups.map(([date, list]) => (
            <section key={date} aria-label={date} className="flex flex-col gap-1.5">
              <h2 className="text-xs font-bold tracking-wide text-muted uppercase">{formatShortDate(date, today)}</h2>
              <div className="card px-4">{list.map((t) => <TaskItem key={t.id} task={t} today={today} />)}</div>
            </section>
          ))
        ) : (
          <Empty text="Belum ada task terjadwal di depan." />
        )
      ) : tasks.length ? (
        <div className="card px-4">
          {tasks.map((t) => <TaskItem key={t.id} task={t} today={today} showDate={v !== "hari-ini"} />)}
        </div>
      ) : (
        v === "hari-ini" ? (
          <EmptyState icon={<SquareCheck size={24} aria-hidden />} title="Hari ini masih bersih" desc="Tambahkan satu langkah kecil. Tidak perlu banyak, yang penting jalan.">
            <TaskExamples today={today} examples={["Minum segelas air", "Baca 10 halaman 20.00", "Jalan kaki 15 menit #sehat"]} />
          </EmptyState>
        ) : (
          <Empty text={v === "selesai" ? "Belum ada yang selesai. Langkah pertama selalu paling berharga." : "Kosong."} />
        )
      )}

      <p className="text-xs text-muted">
        Tips input cepat: <b>besok</b>, <b>lusa</b>, <b>senin</b>, <b>tgl 25</b>, <b>10.00</b>, <b>#label</b>, <b>!1</b>–<b>!4</b>, <b>setiap hari</b>, <b>setiap senin</b>, <b>someday</b>.
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="card px-5 py-8 text-center text-sm text-muted">{text}</div>;
}
