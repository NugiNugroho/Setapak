"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Square } from "lucide-react";

type Song = { id: string; title: string; url: string };
type Choice = "rain" | "waves" | "brown" | `song:${string}`;

const AMBIENT: [Choice, string][] = [
  ["rain", "Hujan"],
  ["waves", "Ombak"],
  ["brown", "Brown noise"],
];

/** Membuat buffer noise 4 detik: white → pink/brown. */
function noiseBuffer(ctx: AudioContext, color: "pink" | "brown") {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (color === "brown") {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else {
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
    }
  }
  return buf;
}

export function FocusSound({ songs }: { songs: Song[] }) {
  const [playing, setPlaying] = useState<Choice | null>(null);
  const [volume, setVolume] = useState(0.5);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => stop(), []);
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(null);
  }

  function play(choice: Choice) {
    stop();
    if (choice.startsWith("song:")) {
      const song = songs.find((s) => `song:${s.id}` === choice);
      if (!song) return;
      const a = new Audio(song.url);
      a.loop = true;
      a.volume = volume;
      a.play().catch(() => {});
      audioRef.current = a;
      setPlaying(choice);
      return;
    }
    const ctx = (ctxRef.current ??= new AudioContext());
    ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, choice === "rain" ? "pink" : "brown");
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    gainRef.current = gain;
    const nodes: AudioNode[] = [];
    if (choice === "rain") {
      filter.type = "bandpass";
      filter.frequency.value = 2500;
      filter.Q.value = 0.4;
    } else {
      filter.type = "lowpass";
      filter.frequency.value = choice === "waves" ? 900 : 500;
    }
    src.connect(filter);
    let last: AudioNode = filter;
    if (choice === "waves") {
      // Ombak: volume naik-turun pelan (± 10 detik per gelombang).
      const swell = ctx.createGain();
      swell.gain.value = 0.55;
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 0.1;
      depth.gain.value = 0.45;
      lfo.connect(depth).connect(swell.gain);
      lfo.start();
      filter.connect(swell);
      last = swell;
      nodes.push(lfo);
    }
    last.connect(gain).connect(ctx.destination);
    src.start();
    stopRef.current = () => {
      try { src.stop(); nodes.forEach((n) => (n as OscillatorNode).stop?.()); } catch {}
      gain.disconnect();
    };
    setPlaying(choice);
  }

  const options: [Choice, string][] = [...AMBIENT, ...songs.map((s) => [`song:${s.id}`, s.title] as [Choice, string])];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line-soft p-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Music size={14} aria-hidden />Teman fokus</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([c, l]) => (
          <button
            key={c}
            type="button"
            aria-pressed={playing === c}
            onClick={() => (playing === c ? stop() : play(c))}
            className={`min-h-9 max-w-[180px] truncate rounded-lg px-3 text-[13px] ${playing === c ? "bg-accent font-semibold text-on-accent" : "border border-line text-ink-2"}`}
          >
            {l}
          </button>
        ))}
        {playing && (
          <button type="button" onClick={stop} aria-label="Hentikan suara" className="btn size-9 px-0"><Square size={14} aria-hidden /></button>
        )}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        Volume
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="flex-1 accent-[var(--accent)]" />
      </label>
      {!songs.length && <span className="text-[11px] text-muted">Lagu sendiri bisa diunggah di Pengaturan → Personalisasi.</span>}
    </div>
  );
}
