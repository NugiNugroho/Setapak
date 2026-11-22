"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, ListMusic, X, Volume2 } from "lucide-react";
import { useMusic, type MusicItem } from "./MusicProvider";

const GROUPS: MusicItem["group"][] = ["Suara alam", "Pustaka Setapak", "Lagu kamu"];

/**
 * Tombol musik melayang: satu ketukan untuk putar/jeda dari halaman mana pun.
 * Tombol kecil di sampingnya membuka daftar suara + volume.
 */
export function MusicButton() {
  const m = useMusic();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!m.songsLoaded) m.loadSongs();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.closest("[data-music]")?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, m]);

  const title = m.titleOf(m.current);

  return (
    <div
      data-music
      className="fixed right-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-40 flex flex-col items-end gap-2 md:right-6 md:bottom-6"
    >
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Pilih musik"
          className="card flex max-h-[min(70dvh,520px)] w-[min(88vw,320px)] flex-col overflow-hidden p-0 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <span className="text-sm font-bold">Musik & suara</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="flex size-9 items-center justify-center rounded-lg text-muted">
              <X size={18} aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {GROUPS.map((g) => {
              const list = m.items.filter((i) => i.group === g);
              if (!list.length && g !== "Lagu kamu") return null;
              return (
                <div key={g} className="flex flex-col py-1">
                  <span className="px-2 pt-1 pb-1 text-[11px] font-bold tracking-wide text-muted uppercase">{g}</span>
                  {list.map((i) => {
                    const active = m.current === i.choice;
                    return (
                      <button
                        key={i.choice}
                        type="button"
                        aria-pressed={active && m.playing}
                        onClick={() => (active && m.playing ? m.pause() : m.play(i.choice))}
                        className={`flex min-h-11 items-center gap-3 rounded-lg px-2 text-left text-sm ${active ? "bg-accent-soft font-semibold text-accent" : "text-ink-2"}`}
                      >
                        <span className="flex size-7 shrink-0 items-center justify-center">
                          {active && m.playing ? <Bars /> : <Play size={14} aria-hidden />}
                        </span>
                        <span className="truncate">{i.title}</span>
                      </button>
                    );
                  })}
                  {g === "Lagu kamu" && !list.length && (
                    <p className="px-2 py-1 text-xs text-muted">
                      {m.songsLoaded ? (
                        <>Belum ada. <Link href="/pengaturan/personalisasi" onClick={() => setOpen(false)} className="font-semibold text-accent">Unggah lagu</Link></>
                      ) : "Memuat…"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <label className="flex items-center gap-3 border-t border-line-soft px-4 py-3 text-muted">
            <Volume2 size={16} aria-hidden />
            <span className="sr-only">Volume</span>
            <input type="range" min={0} max={1} step={0.05} value={m.volume} onChange={(e) => m.setVolume(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" />
          </label>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Pilih musik"
          className="flex h-11 max-w-[60vw] items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink-2 shadow-md"
        >
          <ListMusic size={16} aria-hidden />
          <span className={`truncate ${m.playing ? "" : "max-md:hidden"}`}>{title}</span>
        </button>
        <button
          type="button"
          onClick={m.toggle}
          aria-label={m.playing ? `Jeda ${title}` : `Putar ${title}`}
          className="flex size-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg shadow-accent/30 active:scale-95"
        >
          {m.playing ? <Pause size={24} fill="currentColor" aria-hidden /> : <Play size={24} fill="currentColor" className="ml-0.5" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

function Bars() {
  return (
    <span className="music-bars flex h-3.5 items-end gap-[2px]" aria-hidden>
      <i /><i /><i />
    </span>
  );
}
