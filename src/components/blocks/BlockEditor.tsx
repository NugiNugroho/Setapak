"use client";

import { useTransition } from "react";
import { ArrowUp, ArrowDown, Eye, EyeOff, Trash2, Plus } from "lucide-react";
import { moveBlock, updateBlock, addBlock, deleteBlock } from "@/app/(app)/actions";
import type { Block } from "@/lib/types";

const TYPES: Record<string, string> = {
  affirmation: "Afirmasi / Identitas",
  priorities: "Prioritas utama",
  tasks: "Daftar task",
  gratitude: "Gratitude",
  note: "Catatan bebas",
  finance: "Ringkasan keuangan",
  habits: "Habit hari ini",
  tracks: "Tracks & streak",
  quote: "Kutipan",
  music: "Playlist (Spotify/YouTube)",
};

export function BlockEditor({ blocks }: { blocks: Block[] }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      <p className="text-sm text-muted">Urutkan, sembunyikan, atau ubah isi setiap blok. Perubahan tersimpan otomatis.</p>
      {blocks.map((b, i) => (
        <section key={b.id} aria-label={b.title ?? TYPES[b.type]} className={`card flex flex-col gap-3 p-4 ${b.visible ? "" : "opacity-60"}`}>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 flex-col">
              <span className="text-xs font-semibold tracking-wide text-muted uppercase">{TYPES[b.type] ?? b.type}</span>
              <label>
                <span className="sr-only">Judul blok</span>
                <input
                  defaultValue={b.title ?? ""}
                  onBlur={(e) => e.target.value !== (b.title ?? "") && start(() => updateBlock(b.id, { title: e.target.value }))}
                  className="w-full bg-transparent py-1 font-semibold outline-none focus:underline"
                />
              </label>
            </div>
            <button aria-label="Naikkan" disabled={i === 0} onClick={() => start(() => moveBlock(b.id, -1))} className="btn size-10 px-0"><ArrowUp size={16} aria-hidden /></button>
            <button aria-label="Turunkan" disabled={i === blocks.length - 1} onClick={() => start(() => moveBlock(b.id, 1))} className="btn size-10 px-0"><ArrowDown size={16} aria-hidden /></button>
            <button aria-label={b.visible ? "Sembunyikan" : "Tampilkan"} onClick={() => start(() => updateBlock(b.id, { visible: !b.visible }))} className="btn size-10 px-0">
              {b.visible ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
            </button>
            <button aria-label="Hapus blok" onClick={() => confirm("Hapus blok ini?") && start(() => deleteBlock(b.id))} className="btn size-10 px-0 text-neg"><Trash2 size={16} aria-hidden /></button>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <Choice label="Ukuran" value={b.size} options={[["sm", "Kecil"], ["md", "Sedang"], ["lg", "Lebar"]]} onChange={(v) => start(() => updateBlock(b.id, { size: v }))} />
            {b.type === "affirmation" && (
              <>
                <Choice label="Sumber" value={String(b.config.source ?? "affirmations")} options={[["affirmations", "Afirmasi"], ["identities", "Identitas"]]} onChange={(v) => start(() => updateBlock(b.id, { config: { source: v } }))} />
                <Choice label="Urutan" value={String(b.config.mode ?? "sequential")} options={[["sequential", "Berurutan"], ["random", "Acak"], ["fixed", "Tetap satu"]]} onChange={(v) => start(() => updateBlock(b.id, { config: { mode: v } }))} />
              </>
            )}
            {(b.type === "priorities" || b.type === "gratitude") && (
              <Choice label="Jumlah" value={String(b.config.count ?? 3)} options={[["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]]} onChange={(v) => start(() => updateBlock(b.id, { config: { count: Number(v) } }))} />
            )}
            {b.type === "music" && (
              <label className="flex min-w-[260px] flex-1 flex-col gap-1">
                <span className="text-xs text-muted">Tautan playlist Spotify / YouTube</span>
                <input
                  defaultValue={String(b.config.url ?? "")}
                  placeholder="https://open.spotify.com/playlist/…"
                  onBlur={(e) => e.target.value !== String(b.config.url ?? "") && start(() => updateBlock(b.id, { config: { url: e.target.value.trim() } }))}
                  className="field"
                />
              </label>
            )}
            {b.type === "quote" && (
              <Choice label="Urutan" value={String(b.config.mode ?? "sequential")} options={[["sequential", "Berurutan"], ["random", "Acak"]]} onChange={(v) => start(() => updateBlock(b.id, { config: { mode: v } }))} />
            )}
            {b.type === "tasks" && (
              <Choice label="Yang selesai" value={b.config.showDone === false ? "no" : "yes"} options={[["yes", "Tampilkan"], ["no", "Sembunyikan"]]} onChange={(v) => start(() => updateBlock(b.id, { config: { showDone: v === "yes" } }))} />
            )}
          </div>
        </section>
      ))}

      <div className="flex flex-col gap-2 pt-2">
        <span className="text-xs font-semibold tracking-wide text-muted uppercase">Tambah blok</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TYPES).map(([t, label]) => (
            <button key={t} onClick={() => start(() => addBlock(t))} className="btn rounded-full border-dashed text-sm font-medium">
              <Plus size={14} aria-hidden />{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex gap-1">
        {options.map(([v, l]) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            onClick={() => value !== v && onChange(v)}
            className={`min-h-9 rounded-lg px-3 text-[13px] ${value === v ? "bg-accent font-semibold text-on-accent" : "border border-line text-ink-2"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
