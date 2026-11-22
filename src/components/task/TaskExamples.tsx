"use client";

import { useState, useTransition } from "react";
import { quickAddTask } from "@/app/(app)/actions";

/** Contoh task yang bisa ditambahkan sekali ketuk (untuk layar kosong). */
export function TaskExamples({ today, examples }: { today: string; examples: string[] }) {
  const [added, setAdded] = useState<string[]>([]);
  const [, start] = useTransition();
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-muted">Coba salah satu:</span>
      <div className="flex flex-wrap justify-center gap-1.5">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={added.includes(ex)}
            onClick={() => { setAdded((a) => [...a, ex]); start(async () => { await quickAddTask(ex, { defaultToday: true, today }); }); }}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-2 disabled:opacity-50"
          >
            {added.includes(ex) ? "✓ " : "+ "}{ex}
          </button>
        ))}
      </div>
    </div>
  );
}
