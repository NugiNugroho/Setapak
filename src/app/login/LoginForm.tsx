"use client";

import { useActionState, useEffect, useState } from "react";
import { SESSION_KEY } from "@/components/Welcome";
import { signIn, signUp, signInWithGoogle, type AuthState } from "./actions";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "masuk" ? signIn : signUp,
    { error: initialError },
  );

  // Setelah masuk, animasi sambutan diputar lagi.
  useEffect(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Masuk atau daftar" className="grid grid-cols-2 gap-1 rounded-xl bg-sidebar p-1">
        {(["masuk", "daftar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-10 rounded-[9px] text-sm font-semibold capitalize ${
              mode === m ? "bg-surface text-ink shadow-sm" : "text-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <form action={action} className="flex flex-col gap-3">
        {mode === "daftar" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">Nama panggilan</span>
            <input name="name" className="field" autoComplete="nickname" />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Email</span>
          <input name="email" type="email" required className="field" autoComplete="email" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted">Kata sandi</span>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="field"
            autoComplete={mode === "masuk" ? "current-password" : "new-password"}
          />
        </label>
        {state?.error && <p className="text-sm text-neg" role="alert">{state.error}</p>}
        {state?.message && <p className="text-sm text-pos" role="status">{state.message}</p>}
        <button className="btn btn-primary mt-1 min-h-12" disabled={pending}>
          {pending ? "Memproses…" : mode === "masuk" ? "Masuk" : "Buat akun"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />atau<span className="h-px flex-1 bg-line" />
      </div>
      <form action={signInWithGoogle}>
        <button className="btn min-h-12 w-full">Lanjut dengan Google</button>
      </form>
    </div>
  );
}
