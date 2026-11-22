"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { quickAddTask } from "@/app/(app)/actions";
import { parseTaskInput } from "@/lib/parse-task";
import { formatShortDate } from "@/lib/dates";
import { describeRecurrence } from "@/lib/recurrence";

export function QuickAdd({
  today,
  autoFocus = false,
  defaultToday = false,
  top = false,
  placeholder = "Tambah task… contoh: Revisi essay besok 10.00 #lpdp !1",
}: {
  today: string;
  autoFocus?: boolean;
  defaultToday?: boolean;
  top?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => (value.trim() ? parseTaskInput(value, today) : null), [value, today]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const v = value;
    setValue("");
    start(async () => {
      const res = await quickAddTask(v, { defaultToday, top });
      if (res?.error) {
        setError(res.error);
        setValue(v);
      } else setError(null);
      ref.current?.focus();
    });
  }

  const chips: { text: string; cls: string }[] = [];
  if (parsed) {
    if (parsed.due_date) chips.push({ text: formatShortDate(parsed.due_date, today) + (parsed.due_time ? ` ${parsed.due_time}` : ""), cls: "bg-[#e7f1fb] text-[#2b5c8a]" });
    else if (parsed.due_time) chips.push({ text: parsed.due_time, cls: "bg-[#e7f1fb] text-[#2b5c8a]" });
    parsed.labels.forEach((l) => chips.push({ text: `#${l}`, cls: "bg-accent-soft text-accent" }));
    if (parsed.priority < 4) chips.push({ text: `Prioritas ${parsed.priority}`, cls: "bg-[#fbebeb] text-[#9b3226]" });
    const r = describeRecurrence(parsed.recurrence);
    if (r) chips.push({ text: r, cls: "bg-sidebar text-ink-2" });
    if (parsed.someday) chips.push({ text: "Someday", cls: "bg-sidebar text-ink-2" });
  }

  return (
    <form
      onSubmit={submit}
      className="card flex flex-col gap-2 px-3.5 py-2.5 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft"
    >
      <label className="flex items-center gap-2.5">
        <Plus size={18} className="shrink-0 text-accent" aria-hidden />
        <span className="sr-only">Tambah task cepat</span>
        <input
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="min-h-10 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          disabled={pending}
        />
        {value && (
          <button className="btn btn-primary min-h-9 px-3 text-sm" disabled={pending}>
            Simpan
          </button>
        )}
      </label>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted">Terbaca:</span>
          {chips.map((c) => (
            <span key={c.text} className={`rounded-md px-2 py-0.5 font-semibold ${c.cls}`}>{c.text}</span>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-neg">{error}</p>}
    </form>
  );
}
