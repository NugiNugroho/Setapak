"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Check, Star, Repeat, CalendarClock, Trash2, ChevronDown } from "lucide-react";
import { toggleTask, setTaskTop, postponeTask, deleteTask, updateTask } from "@/app/(app)/actions";
import type { Task } from "@/lib/types";
import { formatShortDate } from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";

const FLAG = { 1: "#B5473A", 2: "#C9862B", 3: "#5A7FA8", 4: "#CFCBC2" } as const;

export function TaskItem({ task, today, showDate = false }: { task: Task; today: string; showDate?: boolean }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useOptimistic(!!task.completed_at);
  const [top, setTop] = useOptimistic(task.is_top);
  const overdue = !done && task.due_date && task.due_date < today;
  const recur = describeRecurrence(task.recurrence_rule);

  return (
    <div className="border-t border-line-soft first:border-t-0">
      <div className="flex min-h-14 items-center gap-3">
        <button
          type="button"
          aria-label={done ? `Tandai belum selesai: ${task.title}` : `Selesaikan: ${task.title}`}
          onClick={() => start(async () => { setDone(!done); await toggleTask(task.id, !done); })}
          className="-ml-2 flex size-11 shrink-0 items-center justify-center"
        >
          <span
            className="flex size-[20px] items-center justify-center rounded-[6px] border-[1.5px]"
            style={{ borderColor: done ? "var(--accent)" : FLAG[task.priority], background: done ? "var(--accent)" : "transparent" }}
          >
            {done && <Check size={13} strokeWidth={3} className="text-on-accent" aria-hidden />}
          </span>
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 flex-col items-start gap-0.5 py-2 text-left">
          <span className={`font-medium ${done ? "text-muted line-through" : ""}`}>{task.title}</span>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted">
            {(showDate || overdue) && task.due_date && (
              <span className={overdue ? "font-semibold text-neg" : ""}>{formatShortDate(task.due_date, today)}</span>
            )}
            {task.due_time && <span>{task.due_time.slice(0, 5)}</span>}
            {recur && <span className="flex items-center gap-1"><Repeat size={11} aria-hidden />{recur}</span>}
            {task.labels.map((l) => <span key={l} className="text-accent">#{l}</span>)}
          </span>
        </button>
        {task.postpone_count >= 3 && !done && (
          <span className="hidden rounded-md bg-[#f9ece7] px-2 py-0.5 text-[11px] font-semibold text-[#9a4a1e] sm:inline">
            ditunda {task.postpone_count}x
          </span>
        )}
        <button
          type="button"
          aria-pressed={top}
          aria-label={top ? "Lepas dari prioritas utama" : "Jadikan prioritas utama"}
          onClick={() => start(async () => { setTop(!top); await setTaskTop(task.id, !top); })}
          className="flex size-10 shrink-0 items-center justify-center text-muted hover:text-accent"
        >
          <Star size={17} fill={top ? "currentColor" : "none"} className={top ? "text-[#C9862B]" : ""} aria-hidden />
        </button>
      </div>

      {open && (
        <form
          action={async (fd) => { await updateTask(task.id, fd); setOpen(false); }}
          className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-3 text-sm"
        >
          <label className="col-span-2 flex flex-col gap-1"><span className="text-xs text-muted">Judul</span>
            <input name="title" defaultValue={task.title} className="field" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">Tanggal</span>
            <input type="date" name="due_date" defaultValue={task.due_date ?? ""} className="field" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">Jam</span>
            <input type="time" name="due_time" defaultValue={task.due_time?.slice(0, 5) ?? ""} className="field" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">Prioritas</span>
            <select name="priority" defaultValue={task.priority} className="field">
              <option value="1">P1 · penting</option><option value="2">P2</option><option value="3">P3</option><option value="4">P4 · biasa</option>
            </select></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">Energi</span>
            <select name="energy" defaultValue={task.energy ?? ""} className="field">
              <option value="">—</option><option value="heavy">Fokus berat</option><option value="light">Ringan</option>
            </select></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">Estimasi (menit)</span>
            <input type="number" min={0} name="estimate_min" defaultValue={task.estimate_min ?? ""} className="field" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs text-muted">Berulang</span>
            <select name="recurrence" defaultValue={recurrenceValue(task)} className="field">
              <option value="">Tidak</option>
              <option value="daily">Setiap hari</option>
              {task.recurrence_rule?.type === "interval" && <option value={`interval:${task.recurrence_rule.every}`}>Setiap {task.recurrence_rule.every} hari</option>}
              {task.due_date && <option value={`weekly:${new Date(task.due_date + "T00:00:00Z").getUTCDay()}`}>Setiap minggu (hari yang sama)</option>}
              {task.due_date && <option value={`monthly:${Number(task.due_date.slice(8))}`}>Setiap bulan (tgl {Number(task.due_date.slice(8))})</option>}
            </select></label>
          <label className="col-span-2 flex flex-col gap-1"><span className="text-xs text-muted">Label (pisahkan koma)</span>
            <input name="labels" defaultValue={task.labels.join(", ")} className="field" /></label>
          <label className="col-span-2 flex flex-col gap-1"><span className="text-xs text-muted">Catatan</span>
            <textarea name="notes" defaultValue={task.notes ?? ""} rows={2} className="field py-2" /></label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_top" defaultChecked={task.is_top} className="size-4 accent-[var(--accent)]" />Prioritas utama</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="someday" defaultChecked={task.someday} className="size-4 accent-[var(--accent)]" />Someday</label>
          <div className="col-span-2 mt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button type="button" className="btn min-h-9 text-sm" disabled={pending} onClick={() => start(async () => { await postponeTask(task.id); setOpen(false); })}>
                <CalendarClock size={15} aria-hidden />Tunda ke besok
              </button>
              <button type="button" className="btn min-h-9 text-sm text-neg" disabled={pending} onClick={() => start(() => deleteTask(task.id))}>
                <Trash2 size={15} aria-hidden />Hapus
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn min-h-9 text-sm" onClick={() => setOpen(false)}><ChevronDown size={15} className="rotate-180" aria-hidden />Tutup</button>
              <button className="btn btn-primary min-h-9 text-sm">Simpan</button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function recurrenceValue(task: Task) {
  const r = task.recurrence_rule;
  if (!r) return "";
  if (r.type === "daily") return "daily";
  if (r.type === "weekly") return `weekly:${r.days[0]}`;
  if (r.type === "monthly") return `monthly:${r.day}`;
  return `interval:${r.every}`;
}
