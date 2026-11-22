"use client";

import { useEffect, useState } from "react";
import { Lightbulb, X } from "lucide-react";

/**
 * Tips kontekstual yang muncul sekali saat relevan, lalu bisa ditutup.
 * Status "sudah dibaca" disimpan per perangkat.
 */
export function Tip({ id, children }: { id: string; children: React.ReactNode }) {
  const key = `setapak.tip.${id}`;
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { setShow(!localStorage.getItem(key)); } catch {}
  }, [key]);
  if (!show) return null;
  const close = () => {
    try { localStorage.setItem(key, "1"); } catch {}
    setShow(false);
  };
  return (
    <div role="note" className="onb-step flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-ink-2">
      <Lightbulb size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
      <div className="flex-1">{children}</div>
      <button type="button" onClick={close} aria-label="Tutup tips" className="-m-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
