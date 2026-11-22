"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff } from "lucide-react";
import { saveReminders } from "@/lib/push-actions";
import { disablePush, enablePush, isPushOn, needsInstallOnIOS, pushSupported } from "@/lib/push-client";

/** Pengaturan pengingat pagi/malam + status notifikasi di perangkat ini. */
export function ReminderSettings({ initial }: { initial: { enabled?: boolean; morning?: string; evening?: string } | undefined }) {
  const [r, setR] = useState({ enabled: !!initial?.enabled, morning: initial?.morning ?? "07:00", evening: initial?.evening ?? "20:30" });
  const [deviceOn, setDeviceOn] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    isPushOn().then(setDeviceOn).catch(() => setDeviceOn(false));
    if (!pushSupported()) setNote(needsInstallOnIOS() ? "Di iPhone, pasang Setapak ke layar utama dulu agar notifikasi bisa muncul." : "Browser ini belum mendukung notifikasi.");
  }, []);

  const save = (next: typeof r) => start(async () => {
    setMsg(null);
    if (next.enabled && !deviceOn) {
      const err = await enablePush();
      if (err) { setMsg(err); return; }
      setDeviceOn(true);
    }
    const res = await saveReminders(next);
    setR(next);
    setMsg(res?.error ?? "Tersimpan.");
  });

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-pressed={r.enabled}
        disabled={pending}
        onClick={() => save({ ...r, enabled: !r.enabled })}
        className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left ${r.enabled ? "border-accent bg-accent-soft" : "border-line"}`}
      >
        {r.enabled ? <Bell size={20} className="text-accent" aria-hidden /> : <BellOff size={20} className="text-muted" aria-hidden />}
        <span className="flex-1 font-semibold">{r.enabled ? "Pengingat aktif" : "Pengingat mati"}</span>
      </button>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">Ritual pagi
          <input type="time" className="field" value={r.morning} onChange={(e) => setR({ ...r, morning: e.target.value })} onBlur={() => r.enabled && save(r)} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">Ritual malam
          <input type="time" className="field" value={r.evening} onChange={(e) => setR({ ...r, evening: e.target.value })} onBlur={() => r.enabled && save(r)} />
        </label>
      </div>
      {r.enabled && deviceOn === false && (
        <button type="button" className="btn self-start text-sm" onClick={() => save(r)} disabled={pending}>Aktifkan juga di perangkat ini</button>
      )}
      {deviceOn && (
        <button type="button" className="self-start text-xs font-semibold text-muted" onClick={() => start(async () => { await disablePush(); setDeviceOn(false); })}>
          Matikan notifikasi di perangkat ini
        </button>
      )}
      {note && <p className="text-xs text-muted">{note}</p>}
      {msg && <p className="text-xs text-muted" role="status">{msg}</p>}
    </div>
  );
}
