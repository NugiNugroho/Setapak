"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bell, Check, SquareCheck, Wallet, Sprout, Activity } from "lucide-react";
import { finishOnboarding, firstWin, skipOnboarding, type OnboardingData } from "./actions";
import { saveReminders } from "@/lib/push-actions";
import { enablePush, pushSupported, needsInstallOnIOS } from "@/lib/push-client";
import { playSound } from "@/lib/sounds";

type Step = "nama" | "fokus" | "identitas" | "habit" | "menang" | "pengingat";

const FOCUS = [
  { key: "task", label: "Tugas harian", desc: "Biar tidak ada yang terlupa", Icon: SquareCheck },
  { key: "keuangan", label: "Keuangan", desc: "Tahu uang masuk & keluar", Icon: Wallet },
  { key: "life", label: "Kebiasaan & manifestasi", desc: "Jadi versi diri yang kamu mau", Icon: Sprout },
  { key: "tracks", label: "Progres hobi", desc: "Lihat dirimu makin jago", Icon: Activity },
] as const;

const IDENTITY_IDEAS = ["Aku orang yang sehat dan bugar", "Aku pembelajar yang tekun", "Aku orang yang rapi mengatur uang", "Aku orang yang tenang dan bersyukur"];
const HABIT_IDEAS = [
  { name: "Membaca", twoMin: "Baca 1 halaman" },
  { name: "Olahraga", twoMin: "Pakai sepatu & jalan 2 menit" },
  { name: "Menulis jurnal", twoMin: "Tulis 1 kalimat" },
  { name: "Minum air putih", twoMin: "Segelas setelah bangun" },
];
const WIN_IDEAS = ["Minum segelas air", "Rapikan meja", "Tarik napas dalam 1 menit", "Balas satu pesan penting"];

export function Onboarding({ initialName, today }: { initialName: string; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [focus, setFocus] = useState<OnboardingData["focus"]>({ task: true, keuangan: false, life: true, tracks: false });
  const [identity, setIdentity] = useState("");
  const [habit, setHabit] = useState({ name: "", twoMin: "", time: "" });
  const [win, setWin] = useState("");
  const [winState, setWinState] = useState<"idle" | "added" | "done">("idle");
  const [remind, setRemind] = useState({ enabled: true, morning: "07:00", evening: "20:30" });

  const steps: Step[] = ["nama", "fokus", ...(focus.life ? (["identitas", "habit"] as Step[]) : []), "menang", "pengingat"];
  const [i, setI] = useState(0);
  const step = steps[Math.min(i, steps.length - 1)];
  const next = () => { setError(null); setI((n) => Math.min(n + 1, steps.length - 1)); };
  const back = () => { setError(null); setI((n) => Math.max(n - 1, 0)); };

  function completeWin() {
    if (winState !== "added") return;
    setWinState("done");
    playSound("done", 0.6);
    start(async () => {
      const r = await firstWin(win, today);
      if (r?.error) setError(r.error);
    });
  }

  function finish() {
    start(async () => {
      setError(null);
      if (remind.enabled) {
        const err = await enablePush();
        if (err) {
          setError(err);
          setRemind((r) => ({ ...r, enabled: false }));
          return;
        }
      }
      await saveReminders(remind);
      const r = await finishOnboarding({ name, focus, identity, habit });
      if (r?.error) return setError(r.error);
      playSound("streak", 0.6);
      router.replace("/");
      router.refresh();
    });
  }

  const [canPush, setCanPush] = useState(true);
  useEffect(() => setCanPush(pushSupported() || needsInstallOnIOS()), []);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="card flex w-full max-w-md flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Langkah ${i + 1} dari ${steps.length}`}>
            {steps.map((s, n) => (
              <span key={s} className={`h-1.5 rounded-full transition-all ${n <= i ? "w-6 bg-accent" : "w-3 bg-line"}`} />
            ))}
          </div>
          <button type="button" onClick={() => start(async () => { await skipOnboarding(); router.replace("/"); })} className="text-xs font-semibold text-muted">
            Lewati
          </button>
        </div>

        {step === "nama" && (
          <Section title="Halo! Mau dipanggil apa?" desc="Nama ini dipakai untuk menyapamu setiap hari.">
            <input className="field text-lg" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Nama panggilan" autoFocus />
          </Section>
        )}

        {step === "fokus" && (
          <Section title="Apa yang paling ingin kamu rapikan?" desc="Pilih satu atau lebih. Yang lain bisa dinyalakan nanti di Pengaturan.">
            <div className="flex flex-col gap-2">
              {FOCUS.map(({ key, label, desc, Icon }) => {
                const on = focus[key];
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFocus((f) => ({ ...f, [key]: !f[key] }))}
                    className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 text-left transition ${on ? "border-accent bg-accent-soft" : "border-line"}`}
                  >
                    <Icon size={22} className={on ? "text-accent" : "text-muted"} aria-hidden />
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold">{label}</span>
                      <span className="text-xs text-muted">{desc}</span>
                    </span>
                    <span className={`flex size-6 items-center justify-center rounded-full border ${on ? "border-accent bg-accent text-on-accent" : "border-line"}`}>
                      {on && <Check size={14} aria-hidden />}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {step === "identitas" && (
          <Section title="Siapa yang ingin kamu jadi?" desc="Kebiasaan bertahan lama kalau berangkat dari identitas, bukan sekadar target.">
            <textarea className="field min-h-20 py-2" value={identity} onChange={(e) => setIdentity(e.target.value)} maxLength={160} placeholder="Aku orang yang…" />
            <Chips items={IDENTITY_IDEAS} onPick={setIdentity} />
          </Section>
        )}

        {step === "habit" && (
          <Section title="Satu kebiasaan kecil untuk mulai besok" desc="Buat sekecil mungkin. Versi 2 menit adalah versi yang tetap bisa kamu lakukan di hari terburuk.">
            <input className="field" value={habit.name} onChange={(e) => setHabit({ ...habit, name: e.target.value })} maxLength={80} placeholder="Nama kebiasaan, mis. Membaca" />
            <input className="field" value={habit.twoMin} onChange={(e) => setHabit({ ...habit, twoMin: e.target.value })} maxLength={80} placeholder="Versi 2 menit, mis. Baca 1 halaman" />
            <label className="flex items-center gap-3 text-sm text-muted">
              Jam (opsional)
              <input type="time" className="field w-auto" value={habit.time} onChange={(e) => setHabit({ ...habit, time: e.target.value })} />
            </label>
            <Chips items={HABIT_IDEAS.map((h) => h.name)} onPick={(n) => setHabit({ ...habit, ...HABIT_IDEAS.find((h) => h.name === n)! })} />
          </Section>
        )}

        {step === "menang" && (
          <Section title="Ayo ambil langkah pertamamu" desc="Tulis satu hal kecil yang bisa kamu lakukan sekarang juga, lalu centang.">
            {winState === "idle" ? (
              <>
                <form
                  onSubmit={(e) => { e.preventDefault(); if (win.trim()) setWinState("added"); }}
                  className="flex gap-2"
                >
                  <input className="field flex-1" value={win} onChange={(e) => setWin(e.target.value)} maxLength={120} placeholder="Satu hal kecil…" autoFocus />
                  <button className="btn btn-primary" disabled={!win.trim()}>Tambah</button>
                </form>
                <Chips items={WIN_IDEAS} onPick={(w) => { setWin(w); setWinState("added"); }} />
              </>
            ) : (
              <button
                type="button"
                onClick={completeWin}
                disabled={winState === "done"}
                className={`flex min-h-16 items-center gap-4 rounded-xl border px-4 text-left transition ${winState === "done" ? "border-accent bg-accent-soft" : "border-line"}`}
              >
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition ${winState === "done" ? "first-win border-accent bg-accent text-on-accent" : "border-accent"}`}>
                  {winState === "done" && <Check size={20} strokeWidth={3} aria-hidden />}
                </span>
                <span className="flex flex-col">
                  <span className={`font-semibold ${winState === "done" ? "text-muted line-through" : ""}`}>{win}</span>
                  <span className="text-xs text-muted">{winState === "done" ? "" : "Ketuk lingkaran setelah selesai"}</span>
                </span>
              </button>
            )}
            {winState === "done" && (
              <p className="first-win-text rounded-xl bg-accent-soft px-4 py-3 text-center font-semibold text-accent">
                Langkah pertama tercatat! Jejakmu dimulai hari ini.
              </p>
            )}
          </Section>
        )}

        {step === "pengingat" && (
          <Section title="Mau diingatkan setiap hari?" desc="Dua sapaan singkat: pagi untuk memilih prioritas, malam untuk menutup hari. Bisa diubah kapan saja.">
            <button
              type="button"
              aria-pressed={remind.enabled}
              onClick={() => setRemind((r) => ({ ...r, enabled: !r.enabled }))}
              className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 text-left ${remind.enabled ? "border-accent bg-accent-soft" : "border-line"}`}
            >
              <Bell size={22} className={remind.enabled ? "text-accent" : "text-muted"} aria-hidden />
              <span className="flex-1 font-semibold">{remind.enabled ? "Ya, ingatkan aku" : "Tidak sekarang"}</span>
            </button>
            {remind.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">Pagi
                  <input type="time" className="field" value={remind.morning} onChange={(e) => setRemind({ ...remind, morning: e.target.value })} />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">Malam
                  <input type="time" className="field" value={remind.evening} onChange={(e) => setRemind({ ...remind, evening: e.target.value })} />
                </label>
              </div>
            )}
            {!canPush && <p className="text-xs text-muted">Browser ini belum mendukung notifikasi. Ritual tetap muncul di halaman Hari Ini.</p>}
            {canPush && <p className="text-xs text-muted">Setelah menekan tombol di bawah, browser akan meminta izin notifikasi.</p>}
          </Section>
        )}

        {error && <p role="alert" className="text-sm font-medium text-neg">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          {i > 0 ? (
            <button type="button" onClick={back} className="btn"><ArrowLeft size={16} aria-hidden />Kembali</button>
          ) : <span />}
          {step === "pengingat" ? (
            <button type="button" onClick={finish} disabled={pending} className="btn btn-primary">{pending ? "Menyiapkan…" : "Mulai melangkah"}</button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={(step === "menang" && winState === "added") || (step === "fokus" && !Object.values(focus).some(Boolean))}
              className="btn btn-primary"
            >
              {step === "menang" && winState === "idle" ? "Nanti saja" : "Lanjut"}<ArrowRight size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="onb-step flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted">{desc}</p>
      </div>
      {children}
    </section>
  );
}

function Chips({ items, onPick }: { items: string[]; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <button key={t} type="button" onClick={() => onPick(t)} className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-2">
          {t}
        </button>
      ))}
    </div>
  );
}
