"use client";

import { useState } from "react";
import { saveHabit } from "@/app/(app)/life/actions";
import { intention, type Habit } from "@/lib/habits";

type Opt = { id: string; label: string };
const DAYS = [
  [1, "Sen"], [2, "Sel"], [3, "Rab"], [4, "Kam"], [5, "Jum"], [6, "Sab"], [0, "Min"],
] as const;

export function HabitForm({
  habit,
  identities,
  stacks,
  tracks,
  areas,
}: {
  habit: Habit | null;
  identities: Opt[];
  stacks: { id: string; name: string; anchor: string | null }[];
  tracks: Opt[];
  areas: Opt[];
}) {
  const [kind, setKind] = useState<"build" | "break">(habit?.kind ?? "build");
  const [name, setName] = useState(habit?.name ?? "");
  const [identity, setIdentity] = useState(habit?.identity_id ?? identities[0]?.id ?? "__new");
  const [stack, setStack] = useState(habit?.stack_id ?? "");
  const [newAnchor, setNewAnchor] = useState("");
  const [cueTime, setCueTime] = useState(habit?.cue_time?.slice(0, 5) ?? "");
  const [cueLoc, setCueLoc] = useState(habit?.cue_location ?? "");
  const [friction, setFriction] = useState(habit?.friction_note ?? "");
  const freqDays = habit?.frequency?.type === "weekly" ? habit.frequency.days : [0, 1, 2, 3, 4, 5, 6];

  const anchor = stack === "__new" ? newAnchor : stacks.find((s) => s.id === stack)?.anchor ?? stacks.find((s) => s.id === stack)?.name ?? null;
  const sentence = intention({ kind, name, cue_time: cueTime || null, cue_location: cueLoc || null, friction_note: friction || null, stackAnchor: anchor });
  const build = kind === "build";

  return (
    <form action={saveHabit} className="flex flex-col gap-4">
      {habit && <input type="hidden" name="id" value={habit.id} />}
      <input type="hidden" name="kind" value={kind} />

      <div role="radiogroup" aria-label="Jenis habit" className="grid grid-cols-2 gap-1 rounded-xl bg-sidebar p-1">
        {([["build", "Bangun kebiasaan"], ["break", "Hentikan kebiasaan"]] as const).map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={`min-h-10 rounded-[9px] text-sm ${kind === k ? "bg-surface font-semibold text-ink shadow-sm" : "text-muted"}`}>{l}</button>
        ))}
      </div>

      <section className="card flex flex-col gap-3 p-4">
        <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">{build ? "Habit" : "Kebiasaan yang ingin dihentikan"}</span>
          <input name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={build ? "Menulis draft paper" : "Scroll HP sebelum tidur"} className="field font-semibold" /></label>
        <label className="flex flex-col gap-1.5"><span className="text-xs font-semibold text-accent">Suara untuk identitas</span>
          <select name="identity_id" value={identity} onChange={(e) => setIdentity(e.target.value)} className="field">
            {identities.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            <option value="__new">+ Identitas baru…</option>
          </select></label>
        {identity === "__new" && (
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-2 flex flex-col gap-1.5"><span className="text-xs text-muted">Aku adalah orang yang…</span>
              <input name="new_identity" required placeholder="Aku adalah peneliti yang menulis setiap hari" className="field" /></label>
            <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Area</span>
              <select name="area_id" className="field"><option value="">—</option>{areas.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          </div>
        )}
      </section>

      <Law n={1} title={build ? "Buat jelas" : "Buat tidak terlihat"} hint={build ? "kapan, di mana, setelah apa" : "singkirkan pemicunya"}>
        {build && (
          <>
            <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Setelah (habit stack)</span>
              <select name="stack_id" value={stack} onChange={(e) => setStack(e.target.value)} className="field">
                <option value="">Tanpa rantai</option>
                {stacks.map((s) => <option key={s.id} value={s.id}>{s.name}{s.anchor ? ` · setelah ${s.anchor}` : ""}</option>)}
                <option value="__new">+ Rantai baru…</option>
              </select></label>
            {stack === "__new" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Nama rantai</span><input name="new_stack" required placeholder="Rutinitas pagi" className="field" /></label>
                <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Setelah…</span><input name="new_anchor" value={newAnchor} onChange={(e) => setNewAnchor(e.target.value)} placeholder="minum kopi pagi" className="field" /></label>
              </div>
            )}
            {stack && <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Urutan dalam rantai</span><input type="number" min={0} name="stack_order" defaultValue={habit?.stack_order ?? 0} className="field w-24" /></label>}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Jam (opsional)</span><input type="time" name="cue_time" value={cueTime} onChange={(e) => setCueTime(e.target.value)} className="field" /></label>
              <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Di mana</span><input name="cue_location" value={cueLoc} onChange={(e) => setCueLoc(e.target.value)} placeholder="meja kerja" className="field" /></label>
            </div>
          </>
        )}
        <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">{build ? "Atur lingkungan" : "Cara menyingkirkan pemicu"}</span>
          <input name="environment_note" defaultValue={habit?.environment_note ?? ""} placeholder={build ? "Draft sudah terbuka di laptop sejak malam" : "HP di-charge di ruang tengah"} className="field" /></label>
        <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-ink-2">“{sentence}”</p>
      </Law>

      <Law n={2} title={build ? "Buat menarik" : "Buat tidak menarik"}>
        <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">{build ? "Pasangkan dengan hal yang disukai (temptation bundling)" : "Ingat dampak buruknya"}</span>
          <input name="bundle" defaultValue={habit?.bundle ?? ""} placeholder={build ? "Hanya boleh putar playlist favorit saat menulis" : "Tidur larut, pagi tidak segar"} className="field" /></label>
      </Law>

      <Law n={3} title={build ? "Buat mudah" : "Buat sulit"}>
        {build ? (
          <>
            <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Versi 2 menit (minimal yang tetap dihitung)</span>
              <input name="two_min_version" defaultValue={habit?.two_min_version ?? ""} placeholder="Buka draft dan tulis 1 kalimat" className="field border-[#93BFB2] bg-accent-soft" /></label>
            <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Versi penuh</span>
              <input name="full_version" defaultValue={habit?.full_version ?? ""} placeholder="Menulis 10 menit" className="field" /></label>
          </>
        ) : null}
        <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">{build ? "Hambatan yang dikurangi" : "Hambatan yang ditambah"}</span>
          <input name="friction_note" value={friction} onChange={(e) => setFriction(e.target.value)} placeholder={build ? "Laptop cukup di-sleep, tidak dimatikan" : "Logout aplikasi media sosial"} className="field" /></label>
        <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Level</span>
          <input type="number" min={1} name="level" defaultValue={habit?.level ?? 1} className="field w-24" /></label>
      </Law>

      <Law n={4} title={build ? "Buat memuaskan" : "Buat tidak memuaskan"}>
        <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">{build ? "Reward langsung" : "Konsekuensi / partner akuntabilitas"}</span>
          <input name="reward" defaultValue={habit?.reward ?? ""} placeholder={build ? "Kopi kedua setelah selesai" : "Lapor ke teman kalau bolong"} className="field" /></label>
        {tracks.length > 0 && (
          <label className="flex flex-col gap-1.5"><span className="text-xs text-muted">Catat juga ke Track</span>
            <select name="track_id" defaultValue={habit?.track_id ?? ""} className="field"><option value="">Tidak</option>{tracks.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
        )}
        <label className="flex items-center justify-between gap-3 text-sm">Ingatkan “jangan bolong dua kali”
          <input type="checkbox" name="remind_missed" defaultChecked={habit?.remind_missed ?? true} className="size-5 accent-[var(--accent)]" /></label>
      </Law>

      <fieldset className="card flex flex-col gap-2 p-4">
        <legend className="sr-only">Jadwal</legend>
        <span className="text-xs text-muted">Jadwal</span>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map(([d, l]) => (
            <label key={d} className="cursor-pointer">
              <input type="checkbox" name="days" value={d} defaultChecked={freqDays.includes(d)} className="peer sr-only" />
              <span className="flex min-h-10 min-w-11 items-center justify-center rounded-lg border border-line px-2 text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-on-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent">{l}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button className="btn btn-primary min-h-12">Simpan habit</button>
    </form>
  );
}

function Law({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-label={`Hukum ${n}: ${title}`} className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-6 items-center justify-center rounded-[7px] bg-accent text-xs font-bold text-on-accent">{n}</span>
        <h2 className="font-semibold">{title}</h2>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
