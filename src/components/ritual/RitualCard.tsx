"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Sunrise, Moon } from "lucide-react";
import { QuickAdd } from "@/components/task/QuickAdd";
import { HabitToggle } from "@/components/life/HabitToggle";
import { addGratitude } from "@/app/(app)/actions";
import { useSound } from "@/components/PrefsProvider";
import type { HabitStatus } from "@/lib/habits";

type HabitLite = { id: string; name: string; icon: string | null; today: HabitStatus | null };

export type RitualProps = {
  kind: "pagi" | "malam";
  today: string;
  identity: string | null;
  topCount: number;
  habits: HabitLite[];
  gratitudeCount: number;
  tomorrowCount: number;
  forced?: boolean;
};

/**
 * Ritual 30 detik di halaman Hari Ini.
 * Pagi: pilih 3 prioritas. Malam: centang habit, satu syukur, satu langkah untuk besok.
 */
export function RitualCard(p: RitualProps) {
  const key = `setapak.ritual.${p.kind}.${p.today}`;
  const [hidden, setHidden] = useState(true);
  const [closing, setClosing] = useState(false);
  const sound = useSound();

  useEffect(() => {
    try { setHidden(!p.forced && !!localStorage.getItem(key)); } catch { setHidden(false); }
  }, [key, p.forced]);

  if (hidden) return null;

  const close = () => {
    try { localStorage.setItem(key, "1"); } catch {}
    sound("streak");
    setClosing(true);
    setTimeout(() => setHidden(true), 900);
  };

  const habitsLeft = p.habits.filter((h) => !h.today);
  const steps =
    p.kind === "pagi"
      ? [p.topCount >= 3]
      : [habitsLeft.length === 0, p.gratitudeCount > 0, p.tomorrowCount > 0];
  const done = steps.filter(Boolean).length;

  return (
    <section
      aria-label={p.kind === "pagi" ? "Ritual pagi" : "Ritual malam"}
      className={`onb-step flex flex-col gap-4 rounded-2xl border p-5 transition-opacity duration-700 ${closing ? "opacity-0" : ""} ${
        p.kind === "pagi" ? "border-[#F0DDB8] bg-[#FFF8EC] dark:bg-surface-2" : "border-[#D6D9F0] bg-[#F3F4FB] dark:bg-surface-2"
      }`}
    >
      <header className="flex items-center gap-3">
        <span className={`flex size-10 items-center justify-center rounded-xl ${p.kind === "pagi" ? "bg-[#F28C1B]/15 text-[#C46A0B]" : "bg-[#4B53A8]/15 text-[#4B53A8] dark:text-[#AEB3F0]"}`}>
          {p.kind === "pagi" ? <Sunrise size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
        </span>
        <div className="flex flex-1 flex-col">
          <h2 className="font-bold">{p.kind === "pagi" ? "Ritual pagi" : "Ritual malam"}</h2>
          <span className="text-xs text-muted">30 detik · {done}/{steps.length} langkah</span>
        </div>
      </header>

      {p.kind === "pagi" ? (
        <>
          {p.identity && (
            <p className="text-sm text-ink-2">Hari ini, jadilah: <b>{p.identity}</b></p>
          )}
          <Step done={p.topCount >= 3} title={`Pilih 3 langkah utama hari ini (${Math.min(p.topCount, 3)}/3)`}>
            {p.topCount < 3 && <QuickAdd today={p.today} defaultToday top placeholder="Langkah utama, mis. Kirim draf ke dosen 10.00" />}
          </Step>
          {p.habits.length > 0 && (
            <p className="text-sm text-muted">Ada {p.habits.length} habit menunggu hari ini. Mulai dari versi 2 menitnya.</p>
          )}
        </>
      ) : (
        <>
          {p.habits.length > 0 && (
            <Step done={habitsLeft.length === 0} title={habitsLeft.length ? `Centang habit hari ini (${habitsLeft.length} tersisa)` : "Semua habit hari ini tercentang"}>
              {habitsLeft.map((h) => (
                <div key={h.id} className="flex min-h-11 items-center gap-2">
                  <HabitToggle habitId={h.id} date={p.today} status={h.today} name={h.name} />
                  <span className="text-sm">{h.icon ? `${h.icon} ` : ""}{h.name}</span>
                </div>
              ))}
            </Step>
          )}
          <Step done={p.gratitudeCount > 0} title="Satu hal yang kamu syukuri hari ini">
            {p.gratitudeCount === 0 && <Gratitude today={p.today} />}
          </Step>
          <Step done={p.tomorrowCount > 0} title={p.tomorrowCount ? `${p.tomorrowCount} langkah sudah menunggu besok` : "Satu langkah untuk besok"}>
            {p.tomorrowCount === 0 && <QuickAdd today={p.today} suffix="besok" placeholder="Langkah pertama besok…" />}
          </Step>
        </>
      )}

      <div className="flex items-center justify-between gap-3">
        <Link href={p.kind === "pagi" ? "/task" : "/review"} className="text-xs font-semibold text-muted">
          {p.kind === "pagi" ? "Lihat semua task" : "Buka Weekly Review"}
        </Link>
        <button type="button" onClick={close} className="btn btn-primary">
          {p.kind === "pagi" ? "Siap melangkah" : "Tutup hari"}
        </button>
      </div>
    </section>
  );
}

function Step({ done, title, children }: { done: boolean; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${done ? "border-accent bg-accent text-on-accent" : "border-line bg-surface"}`}>
          {done && <Check size={12} strokeWidth={3} aria-hidden />}
        </span>
        <span className={`text-sm font-semibold ${done ? "text-muted" : ""}`}>{title}</span>
      </div>
      {children && <div className="pl-7">{children}</div>}
    </div>
  );
}

function Gratitude({ today }: { today: string }) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        const v = value;
        setValue("");
        start(() => addGratitude(v, today));
      }}
      className="flex gap-2"
    >
      <input value={value} onChange={(e) => setValue(e.target.value)} disabled={pending} placeholder="Hari ini aku bersyukur karena…" className="field flex-1" aria-label="Hal yang disyukuri" />
      {value && <button className="btn btn-primary">Simpan</button>}
    </form>
  );
}
