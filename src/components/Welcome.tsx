"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";

const KEY = (id: string) => `setapak.welcomed.${id}`;
export const REPLAY_KEY = "setapak.welcome.replay";

/**
 * Animasi sambutan saat pertama kali masuk (sekali per akun per perangkat).
 * Ketuk di mana saja untuk melewati. Menghormati pengaturan "kurangi gerakan".
 */
export function Welcome({ userId, name }: { userId: string; name: string }) {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      const replay = sessionStorage.getItem(REPLAY_KEY);
      if (replay || !localStorage.getItem(KEY(userId))) {
        sessionStorage.removeItem(REPLAY_KEY);
        localStorage.setItem(KEY(userId), new Date().toISOString());
        setShow(true);
      }
    } catch {}
  }, [userId]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setLeaving(true), 4200);
    return () => clearTimeout(t);
  }, [show]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setShow(false), 600);
    return () => clearTimeout(t);
  }, [leaving]);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Selamat datang di Setapak, ${name}`}
      onClick={() => setLeaving(true)}
      className={`welcome fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center gap-8 bg-[#F7F7EE] px-6 ${leaving ? "welcome-out" : ""}`}
    >
      <div className="flex items-center gap-3 sm:gap-5">
        <img src="/icons/icon-512.png" alt="" className="welcome-icon size-16 sm:size-24" />
        <span className="welcome-word block overflow-hidden">
          <img src="/brand/wordmark.png" alt="Setapak" className="h-12 w-auto sm:h-[72px]" />
        </span>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="welcome-line1 text-xl font-bold tracking-tight text-[#0B5A3C] sm:text-2xl">Selamat datang, {name}</p>
        <p className="welcome-line2 text-sm text-[#4F5A52] sm:text-base">Langkah kecil, jejak panjang.</p>
      </div>

      <div className="flex items-end gap-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="welcome-step block h-2 w-7 rounded-full bg-[#1F8A5B]" style={{ animationDelay: `${2.2 + i * 0.25}s`, opacity: 0 }} />
        ))}
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setLeaving(true); }}
        className="welcome-cta mt-2 rounded-xl bg-[#0B5A3C] px-6 py-3 text-sm font-semibold text-white"
      >
        Mulai melangkah
      </button>
    </div>
  );
}
