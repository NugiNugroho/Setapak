export const DEFAULT_TZ = "Asia/Makassar";

/** Tanggal hari ini (YYYY-MM-DD) di zona waktu user. */
export function todayISO(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Minggu … 6 = Sabtu */
export function weekday(iso: string): number {
  return new Date(iso + "T00:00:00Z").getUTCDay();
}

/** Jumlah hari sejak 1970-01-01, untuk rotasi harian. */
export function dayNumber(iso: string): number {
  return Math.floor(Date.parse(iso + "T00:00:00Z") / 864e5);
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${HARI[weekday(iso)]}, ${d} ${BULAN[m - 1]} ${y}`;
}

export function formatShortDate(iso: string, today?: string): string {
  if (today) {
    if (iso === today) return "Hari ini";
    if (iso === addDays(today, 1)) return "Besok";
    if (iso === addDays(today, -1)) return "Kemarin";
  }
  const [, m, d] = iso.split("-").map(Number);
  return `${HARI[weekday(iso)].slice(0, 3)}, ${d} ${BULAN[m - 1].slice(0, 3)}`;
}

export function greeting(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(now),
  );
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

export { HARI, BULAN };
