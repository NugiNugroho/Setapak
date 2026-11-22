"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { badgeOf } from "@/lib/achievements";
import { markAchievementsSeen } from "@/app/(app)/actions";
import { useSound } from "@/components/PrefsProvider";

/** Perayaan kecil saat meraih penanda baru. Muncul sekali per penanda. */
export function AchievementToast({ keys }: { keys: string[] }) {
  const [show, setShow] = useState<string[]>([]);
  const sound = useSound();

  useEffect(() => {
    if (!keys.length) return;
    setShow(keys);
    sound("streak");
    markAchievementsSeen(keys).catch(() => {});
    const t = setTimeout(() => setShow([]), 7000);
    return () => clearTimeout(t);
    // Hanya saat daftar berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(",")]);

  const list = show.map(badgeOf).filter(Boolean).slice(0, 3);
  if (!list.length) return null;

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-sm flex-col gap-2 md:top-6">
      {list.map((b) => (
        <div key={b!.key} className="badge-pop card flex items-center gap-3 px-4 py-3 shadow-xl">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-2xl" aria-hidden>{b!.emoji}</span>
          <div className="flex flex-1 flex-col">
            <span className="text-[11px] font-bold tracking-wide text-accent uppercase">Penanda baru</span>
            <span className="font-bold">{b!.title}</span>
            <span className="text-xs text-muted">{b!.desc}</span>
          </div>
          <button type="button" onClick={() => setShow([])} aria-label="Tutup" className="flex size-8 items-center justify-center rounded-lg text-muted"><X size={16} aria-hidden /></button>
        </div>
      ))}
    </div>
  );
}
