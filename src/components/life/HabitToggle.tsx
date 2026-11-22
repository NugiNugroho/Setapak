"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { setHabitStatus } from "@/app/(app)/manifestasi/actions";
import type { HabitStatus } from "@/lib/habits";
import { useSound } from "@/components/PrefsProvider";

const NEXT: Record<string, HabitStatus | null> = { none: "done", done: "minimal", minimal: null, missed: "done" };

export function HabitToggle({
  habitId,
  date,
  status,
  name,
  size = 26,
}: {
  habitId: string;
  date: string;
  status: HabitStatus | null;
  name: string;
  size?: number;
}) {
  const [, start] = useTransition();
  const sound = useSound();
  const [cur, setCur] = useOptimistic<HabitStatus | null>(status);
  const label = cur === "done" ? "selesai" : cur === "minimal" ? "versi 2 menit" : "belum";
  return (
    <button
      type="button"
      aria-label={`${name}: ${label}. Ketuk untuk mengganti status`}
      onClick={() =>
        start(async () => {
          const next = NEXT[cur ?? "none"];
          if (next === "done") sound("step");
          setCur(next);
          await setHabitStatus(habitId, date, next);
        })
      }
      className="flex size-11 shrink-0 items-center justify-center"
    >
      <span
        className="flex items-center justify-center rounded-[8px] text-[11px] font-bold"
        style={{
          width: size,
          height: size,
          background: cur === "done" ? "var(--accent)" : cur === "minimal" ? "#93BFB2" : "transparent",
          border: cur ? "none" : "1.5px solid #CFCBC2",
          color: cur === "done" ? "var(--on-accent)" : "#1C1C1A",
        }}
      >
        {cur === "done" ? <Check size={15} strokeWidth={3} aria-hidden /> : cur === "minimal" ? "2m" : null}
      </span>
    </button>
  );
}
