"use client";

import { useEffect } from "react";

export function ThemeSync({ theme, accent }: { theme: string; accent: string }) {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const dark =
      theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    // Warna aksen pilihan user hanya diterapkan di tema terang; tema gelap memakai versi terang default.
    if (!dark && accent) root.style.setProperty("--accent", accent);
    else root.style.removeProperty("--accent");
  }, [theme, accent]);
  return null;
}
