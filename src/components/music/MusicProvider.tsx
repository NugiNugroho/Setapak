"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AMBIENT, LIBRARY } from "@/lib/music-library";
import { listSongs } from "@/app/(app)/media/actions";

export type Song = { id: string; title: string; url: string };
/** amb:<rain|waves|brown> · lib:<id> · song:<id> */
export type Choice = string;
export type MusicItem = { choice: Choice; title: string; group: "Suara alam" | "Pustaka Setapak" | "Lagu kamu" };

type Ctx = {
  current: Choice;
  playing: boolean;
  volume: number;
  items: MusicItem[];
  songsLoaded: boolean;
  titleOf: (c: Choice) => string;
  play: (c?: Choice) => void;
  pause: () => void;
  toggle: () => void;
  setVolume: (v: number) => void;
  loadSongs: () => Promise<void>;
};

const MusicCtx = createContext<Ctx | null>(null);
const KEY = "setapak.music";

export function useMusic() {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error("useMusic harus di dalam MusicProvider");
  return ctx;
}

/** Buffer noise 4 detik: white → pink/brown. */
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

const BASE_ITEMS: MusicItem[] = [
  ...AMBIENT.map((a) => ({ choice: `amb:${a.id}`, title: a.title, group: "Suara alam" as const })),
  ...LIBRARY.map((t) => ({ choice: `lib:${t.id}`, title: t.title, group: "Pustaka Setapak" as const })),
];

/**
 * Mesin musik global: dipasang sekali di layout aplikasi, jadi suara tetap
 * jalan saat pindah halaman. Pilihan terakhir & volume diingat per perangkat.
 */
export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<Choice>("amb:rain");
  const [playing, setPlaying] = useState(false);
  const [volume, setVol] = useState(0.5);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoaded, setSongsLoaded] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volRef = useRef(volume);
  const songsRef = useRef<Song[]>([]);

  // Ambil pilihan terakhir dari perangkat.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      if (typeof saved.current === "string") setCurrent(saved.current);
      if (typeof saved.volume === "number") { setVol(saved.volume); volRef.current = saved.volume; }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ current, volume })); } catch {}
  }, [current, volume]);

  const setVolume = useCallback((v: number) => {
    volRef.current = v;
    setVol(v);
    if (gainRef.current) gainRef.current.gain.value = v;
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const stopAll = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    gainRef.current = null;
  }, []);

  const loadingRef = useRef(false);
  const loadSongs = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const list = await listSongs();
      songsRef.current = list;
      setSongs(list);
    } finally {
      setSongsLoaded(true);
    }
  }, []);

  const playFile = useCallback((url: string) => {
    const a = new Audio(url);
    a.loop = true;
    a.volume = volRef.current;
    audioRef.current = a;
    a.play().catch(() => setPlaying(false));
  }, []);

  const playAmbient = useCallback((kind: string) => {
    const ctx = (ctxRef.current ??= new AudioContext());
    ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx, kind === "rain" ? "pink" : "brown");
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    gain.gain.value = volRef.current;
    gainRef.current = gain;
    const extra: OscillatorNode[] = [];
    if (kind === "rain") {
      filter.type = "bandpass";
      filter.frequency.value = 2500;
      filter.Q.value = 0.4;
    } else {
      filter.type = "lowpass";
      filter.frequency.value = kind === "waves" ? 900 : 500;
    }
    src.connect(filter);
    let last: AudioNode = filter;
    if (kind === "waves") {
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
      extra.push(lfo);
    }
    last.connect(gain).connect(ctx.destination);
    src.start();
    stopRef.current = () => {
      try { src.stop(); extra.forEach((n) => n.stop()); } catch {}
      gain.disconnect();
    };
  }, []);

  const play = useCallback(
    (c?: Choice) => {
      const choice = c ?? current;
      stopAll();
      setCurrent(choice);
      setPlaying(true);
      const [kind, id] = [choice.slice(0, choice.indexOf(":")), choice.slice(choice.indexOf(":") + 1)];
      if (kind === "amb") return playAmbient(id);
      if (kind === "lib") {
        const t = LIBRARY.find((x) => x.id === id);
        return t ? playFile(t.file) : (setCurrent("amb:rain"), playAmbient("rain"));
      }
      if (kind === "song") {
        const s = songsRef.current.find((x) => x.id === id);
        if (s) return playFile(s.url);
        // URL lagu belum dimuat (mis. setelah buka ulang aplikasi): ambil dulu.
        listSongs().then((list) => {
          songsRef.current = list;
          setSongs(list);
          setSongsLoaded(true);
          const found = list.find((x) => x.id === id);
          if (found) playFile(found.url);
          else { setCurrent("amb:rain"); playAmbient("rain"); }
        }).catch(() => setPlaying(false));
        return;
      }
      setCurrent("amb:rain");
      playAmbient("rain");
    },
    [current, stopAll, playAmbient, playFile],
  );

  const pause = useCallback(() => {
    stopAll();
    setPlaying(false);
  }, [stopAll]);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  const items = useMemo<MusicItem[]>(
    () => [...BASE_ITEMS, ...songs.map((s) => ({ choice: `song:${s.id}`, title: s.title, group: "Lagu kamu" as const }))],
    [songs],
  );
  const titleOf = useCallback(
    (c: Choice) => items.find((i) => i.choice === c)?.title ?? (c.startsWith("song:") ? "Lagu kamu" : "Hujan"),
    [items],
  );

  // Kontrol di layar kunci / notifikasi HP.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = playing ? new MediaMetadata({ title: titleOf(current), artist: "Setapak", artwork: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] }) : null;
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
      navigator.mediaSession.setActionHandler("play", () => play());
      navigator.mediaSession.setActionHandler("pause", () => pause());
    } catch {}
  }, [playing, current, titleOf, play, pause]);

  useEffect(() => () => stopAll(), [stopAll]);

  return (
    <MusicCtx.Provider value={{ current, playing, volume, items, songsLoaded, titleOf, play, pause, toggle, setVolume, loadSongs }}>
      {children}
    </MusicCtx.Provider>
  );
}
