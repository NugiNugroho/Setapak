"use client";

/**
 * Bunyi pencapaian yang disintesis langsung (tanpa file audio):
 * done = "tring" dua nada, step = langkah lembut, streak = arpeggio naik.
 */
let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)());

function tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = "sine") {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + start);
  o.stop(a.currentTime + start + dur + 0.05);
}

export type SoundKind = "done" | "step" | "streak";

export function playSound(kind: SoundKind, volume = 0.6) {
  try {
    const v = Math.max(0.02, Math.min(1, volume)) * 0.25;
    if (ac().state === "suspended") ac().resume();
    if (kind === "done") {
      tone(880, 0, 0.35, v);
      tone(1318.5, 0.09, 0.45, v * 0.8);
    } else if (kind === "step") {
      tone(196, 0, 0.12, v * 0.9, "triangle");
      tone(262, 0.11, 0.12, v * 0.7, "triangle");
    } else {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.08, 0.5, v * 0.8));
    }
  } catch {}
}
