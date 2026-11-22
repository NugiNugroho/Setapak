"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { addLog } from "@/app/(app)/tracks/actions";
import type { Metric } from "@/lib/tracks";

type TimerState = { startedAt: number | null; accumulated: number };

export function LogForm({ trackId, metrics, today }: { trackId: string; metrics: Metric[]; today: string }) {
  const key = `setapak.timer.${trackId}`;
  const [timer, setTimer] = useState<TimerState>({ startedAt: null, accumulated: 0 });
  const [now, setNow] = useState(() => Date.now());
  const [duration, setDuration] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Timer tetap berjalan walau halaman ditinggal (disimpan di perangkat).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null") as TimerState | null;
      if (saved) setTimer(saved);
    } catch {}
  }, [key]);
  useEffect(() => {
    try {
      if (timer.startedAt || timer.accumulated) localStorage.setItem(key, JSON.stringify(timer));
      else localStorage.removeItem(key);
    } catch {}
  }, [timer, key]);
  useEffect(() => {
    if (!timer.startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timer.startedAt]);

  const elapsed = Math.floor((timer.accumulated + (timer.startedAt ? now - timer.startedAt : 0)) / 1000);
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const running = !!timer.startedAt;

  function toggle() {
    setNow(Date.now());
    setTimer((t) =>
      t.startedAt ? { startedAt: null, accumulated: t.accumulated + (Date.now() - t.startedAt) } : { ...t, startedAt: Date.now() },
    );
  }
  function stopAndUse() {
    const minutes = Math.max(1, Math.round(elapsed / 60));
    setTimer({ startedAt: null, accumulated: 0 });
    setDuration(String(minutes));
    setMsg(`Durasi ${minutes} menit dari timer. Periksa lalu simpan.`);
  }

  const extra = metrics.filter((m) => m.metric_type !== "duration");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3">
        <span className="font-mono text-2xl font-bold tabular-nums" aria-live="off">{hh}:{mm}:{ss}</span>
        <div className="flex gap-2">
          <button type="button" onClick={toggle} className="btn btn-primary">
            {running ? <><Pause size={16} aria-hidden />Jeda</> : <><Play size={16} aria-hidden />{elapsed ? "Lanjut" : "Mulai timer"}</>}
          </button>
          {elapsed > 0 && (
            <>
              <button type="button" onClick={stopAndUse} className="btn">Selesai &amp; pakai</button>
              <button type="button" onClick={() => setTimer({ startedAt: null, accumulated: 0 })} aria-label="Atur ulang timer" className="btn size-10 px-0"><RotateCcw size={16} aria-hidden /></button>
            </>
          )}
        </div>
      </div>

      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            const res = await addLog(trackId, fd);
            if (res?.error) setMsg(res.error);
            else {
              setMsg("Sesi tercatat.");
              setDuration("");
              formRef.current?.reset();
            }
          })
        }
        className="grid grid-cols-2 gap-2"
      >
        <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Tanggal</span>
          <input type="date" name="log_date" defaultValue={today} className="field" /></label>
        <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Durasi (menit)</span>
          <input type="number" min={0} name="duration_min" value={duration} onChange={(e) => setDuration(e.target.value)} className="field" /></label>
        {extra.map((m) => m.metric_type === "check" ? (
          <label key={m.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name={`m_${m.id}`} className="size-5 accent-[var(--accent)]" />{m.name}</label>
        ) : (
          <label key={m.id} className="flex flex-col gap-1.5"><span className="text-xs text-muted">{m.name}{m.unit ? ` (${m.unit})` : ""}{m.metric_type === "scale" ? " 1–5" : ""}</span>
            <input type="number" step="any" min={m.metric_type === "scale" ? 1 : undefined} max={m.metric_type === "scale" ? 5 : undefined} name={`m_${m.id}`} className="field" /></label>
        ))}
        <label className="col-span-2 flex flex-col gap-1.5"><span className="text-xs text-muted">Catatan</span>
          <input name="note" placeholder="Apa yang dikerjakan?" className="field" /></label>
        <fieldset className="col-span-2 flex items-center gap-2">
          <legend className="sr-only">Mood</legend>
          <span aria-hidden className="text-xs text-muted">Rasanya (1 berat – 5 mantap):</span>
          {[1, 2, 3, 4, 5].map((v) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="mood" value={v} aria-label={`Rasanya ${v}`} className="peer sr-only" />
              <span className="flex size-10 items-center justify-center rounded-lg border border-line text-sm font-semibold text-muted peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">{v}</span>
            </label>
          ))}
        </fieldset>
        {msg && <p className="col-span-2 text-sm text-accent" role="status">{msg}</p>}
        <button className="btn btn-primary col-span-2 min-h-12" disabled={pending}>{pending ? "Menyimpan…" : "Catat sesi"}</button>
      </form>
    </div>
  );
}
