"use client";

import { useEffect } from "react";

/** Menerapkan tema & warna aksen. Tema "time": terang pukul 06–18, gelap di luar itu. */
export function ThemeSync({ theme, accent }: { theme: string; accent: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      let mode = theme;
      if (theme === "time") {
        const h = new Date().getHours();
        mode = h >= 6 && h < 18 ? "light" : "dark";
      }
      root.dataset.theme = mode;
      const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (!dark && accent) root.style.setProperty("--accent", accent);
      else root.style.removeProperty("--accent");
    };
    apply();
    if (theme !== "time") return;
    const t = setInterval(apply, 5 * 60_000);
    return () => clearInterval(t);
  }, [theme, accent]);
  return null;
}
