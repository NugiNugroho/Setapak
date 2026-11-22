import { ImageResponse } from "next/og";

/** Ambil font TTF dari Google Fonts (agar angka tampil tebal). Gagal = pakai font bawaan. */
async function loadFont(weight: number) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@${weight}`, { headers: { "User-Agent": "Mozilla/4.0" }, signal: AbortSignal.timeout(3000) })).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url, { signal: AbortSignal.timeout(3000) })).arrayBuffer();
  } catch {
    return null;
  }
}
import { requireProfile } from "@/lib/profile";
import { todayISO } from "@/lib/dates";
import { formatMetric, DURATION_METRIC } from "@/lib/tracks";
import { yearSummary } from "@/lib/wrapped";

/** Kartu PNG 1080×1350 (rasio feed Instagram) tanpa angka keuangan. */
export async function GET(request: Request) {
  const { supabase, profile } = await requireProfile();
  const thisYear = Number(todayISO(profile.timezone).slice(0, 4));
  const t = Number(new URL(request.url).searchParams.get("tahun"));
  const year = t >= 2000 && t <= thisYear ? t : thisYear;
  const s = await yearSummary(supabase, year, profile.timezone);
  const origin = new URL(request.url).origin;

  const stat = (big: string | number, label: string, bg: string, fg: string) => (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 462, height: 250, padding: 36, borderRadius: 36, background: bg, color: fg }}>
      <div style={{ display: "flex", fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>{String(big)}</div>
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>{label}</div>
    </div>
  );

  const fonts = (await Promise.all([400, 700, 800].map(async (w) => ({ w, data: await loadFont(w) }))))
    .filter((f) => f.data)
    .map((f) => ({ name: "Jakarta", data: f.data as ArrayBuffer, weight: f.w as 400 | 700 | 800, style: "normal" as const }));

  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1350, display: "flex", flexDirection: "column", background: "#F7F7EE", padding: 64, fontFamily: "Jakarta, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${origin}/icons/icon-192.png`} width={96} height={96} alt="" />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#4F5A52" }}>Rangkuman Setapak</div>
            <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: "#0B5A3C", letterSpacing: -3, lineHeight: 1 }}>{year}</div>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#1C1C1A", marginTop: 36, marginBottom: 40 }}>{`Jejak ${profile.display_name} tahun ini`}</div>
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 28 }}>
          {stat(s.tasksDone, "task selesai", "#0B5A3C", "#FFFFFF")}
          {stat(formatMetric(s.minutes, DURATION_METRIC), "waktu fokus", "#F28C1B", "#FFFFFF")}
          {stat(s.longest, "hari beruntun terpanjang", "#E9F3E6", "#0B5A3C")}
          {stat(s.votes, "suara untuk diriku", "#1F2A27", "#FFFFFF")}
        </div>
        <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between", alignItems: "flex-end", fontSize: 30, color: "#4F5A52" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex" }}>{`${s.goals.length} goal tercapai · ${s.gratitude} hal disyukuri`}</div>
            <div style={{ display: "flex", fontWeight: 700, color: "#0B5A3C" }}>Langkah kecil, jejak panjang.</div>
          </div>
          <div style={{ display: "flex", fontWeight: 700 }}>setapak</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      // Tanpa font terunduh (mis. jaringan bermasalah) → pakai font bawaan.
      ...(fonts.length ? { fonts } : {}),
    },
  );
}
