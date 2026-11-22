"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { HIDDEN_AMOUNT, formatRupiah } from "@/lib/format";

type Ctx = { hidden: boolean; toggle: () => void };
const PrivacyCtx = createContext<Ctx>({ hidden: true, toggle: () => {} });
const KEY = "setapak.privacy.revealedUntil";

/**
 * Mode privasi adalah fitur tampilan. Nominal sensitif tersembunyi secara default;
 * setelah dibuka, otomatis tersembunyi lagi setelah `autoLockMinutes`.
 * Keamanan data tetap dijamin RLS di database.
 */
export function PrivacyProvider({ children, autoLockMinutes = 5 }: { children: React.ReactNode; autoLockMinutes?: number }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      const until = Number(localStorage.getItem(KEY) ?? 0);
      if (until > Date.now()) setHidden(false);
    } catch {}
  }, []);

  useEffect(() => {
    if (hidden) return;
    const t = setTimeout(() => setHidden(true), autoLockMinutes * 60_000);
    return () => clearTimeout(t);
  }, [hidden, autoLockMinutes]);

  const toggle = useCallback(() => {
    setHidden((h) => {
      const next = !h;
      try {
        if (next) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, String(Date.now() + autoLockMinutes * 60_000));
      } catch {}
      return next;
    });
  }, [autoLockMinutes]);

  return <PrivacyCtx.Provider value={{ hidden, toggle }}>{children}</PrivacyCtx.Provider>;
}

export const usePrivacy = () => useContext(PrivacyCtx);

export function PrivacyToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { hidden, toggle } = usePrivacy();
  const Icon = hidden ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!hidden}
      aria-label={hidden ? "Tampilkan nominal" : "Sembunyikan nominal"}
      className={`btn ${withLabel ? "" : "size-11 px-0"} ${hidden ? "" : "btn-primary"}`}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden />
      {withLabel && (hidden ? "Tampilkan nominal" : "Sembunyikan")}
    </button>
  );
}

/** Nominal yang ikut mode privasi bila `sensitive`. */
export function Money({ amount, sensitive = false, sign = false }: { amount: number; sensitive?: boolean; sign?: boolean }) {
  const { hidden } = usePrivacy();
  if (sensitive && hidden) return <span className="tracking-widest">{HIDDEN_AMOUNT}</span>;
  return <span>{formatRupiah(amount, { sign })}</span>;
}
