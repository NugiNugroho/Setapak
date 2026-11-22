"use client";

import { useEffect } from "react";
import { Music, Pause } from "lucide-react";
import { useMusic } from "@/components/music/MusicProvider";

/** Pintasan pemutar global di halaman Track: suara tetap jalan saat pindah halaman. */
export function FocusSound() {
  const m = useMusic();
  useEffect(() => {
    if (!m.songsLoaded) m.loadSongs();
  }, [m]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line-soft p-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Music size={14} aria-hidden />Teman fokus</span>
      <div className="flex flex-wrap gap-1.5">
        {m.items.map((i) => {
          const on = m.playing && m.current === i.choice;
          return (
            <button
              key={i.choice}
              type="button"
              aria-pressed={on}
              onClick={() => (on ? m.pause() : m.play(i.choice))}
              className={`min-h-9 max-w-[180px] truncate rounded-lg px-3 text-[13px] ${on ? "bg-accent font-semibold text-on-accent" : "border border-line text-ink-2"}`}
            >
              {i.title}
            </button>
          );
        })}
        {m.playing && (
          <button type="button" onClick={m.pause} aria-label="Jeda" className="btn size-9 px-0"><Pause size={14} aria-hidden /></button>
        )}
      </div>
      <span className="text-[11px] text-muted">Bisa juga diputar dari tombol musik di pojok layar.</span>
    </div>
  );
}
