"use client";

import { createContext, useCallback, useContext } from "react";
import { playSound, type SoundKind } from "@/lib/sounds";

type Ctx = { sounds: boolean; volume: number };
const PrefsCtx = createContext<Ctx>({ sounds: true, volume: 0.6 });

export function PrefsProvider({ sounds, volume, children }: Ctx & { children: React.ReactNode }) {
  return <PrefsCtx.Provider value={{ sounds, volume }}>{children}</PrefsCtx.Provider>;
}

/** Bunyi pencapaian yang mengikuti pengaturan user. */
export function useSound() {
  const { sounds, volume } = useContext(PrefsCtx);
  return useCallback((kind: SoundKind) => { if (sounds) playSound(kind, volume); }, [sounds, volume]);
}
