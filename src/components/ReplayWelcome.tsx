"use client";

import { REPLAY_KEY } from "./Welcome";

export function ReplayWelcome() {
  return (
    <button
      type="button"
      className="btn self-start text-sm"
      onClick={() => {
        try { sessionStorage.setItem(REPLAY_KEY, "1"); } catch {}
        window.location.href = "/";
      }}
    >
      Putar ulang animasi sambutan
    </button>
  );
}
