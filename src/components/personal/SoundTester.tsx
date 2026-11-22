"use client";

import { playSound } from "@/lib/sounds";

export function SoundTester() {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn text-sm" onClick={() => playSound("done")}>Coba: task selesai</button>
      <button type="button" className="btn text-sm" onClick={() => playSound("step")}>Coba: habit dicentang</button>
      <button type="button" className="btn text-sm" onClick={() => playSound("streak")}>Coba: sesi tercatat</button>
    </div>
  );
}
