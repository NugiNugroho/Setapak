export type FontKey = "jakarta" | "serif" | "rounded" | "grotesk";
export type ModuleKey = "task" | "keuangan" | "life" | "tracks" | "review";

export type Prefs = {
  greetings?: Partial<Record<"pagi" | "siang" | "sore" | "malam", string>>;
  moduleLabels?: Partial<Record<ModuleKey, string>>;
  font?: FontKey;
  sounds?: { enabled?: boolean; volume?: number };
  coverRotate?: boolean;
  coverShow?: boolean;
  /** Pengingat harian (notifikasi push). Jam dalam format HH:MM waktu lokal. */
  reminders?: { enabled?: boolean; morning?: string; evening?: string };
};

export const FONTS: Record<FontKey, { label: string; family: string; css: string | null }> = {
  jakarta: { label: "Plus Jakarta Sans · modern", family: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif", css: null },
  rounded: { label: "Nunito · bulat & ramah", family: "'Nunito', ui-rounded, system-ui, sans-serif", css: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap" },
  serif: { label: "Fraunces · klasik & hangat", family: "'Fraunces', ui-serif, Georgia, serif", css: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&display=swap" },
  grotesk: { label: "Space Grotesk · tegas & teknis", family: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif", css: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" },
};

export const DEFAULT_LABELS: Record<ModuleKey, string> = {
  task: "Task",
  keuangan: "Keuangan",
  life: "Manifestasi",
  tracks: "Tracks",
  review: "Weekly Review",
};

export const label = (prefs: Prefs | undefined, key: ModuleKey) =>
  prefs?.moduleLabels?.[key]?.trim() || DEFAULT_LABELS[key];

export const DEFAULT_GREETINGS = {
  pagi: "Selamat pagi, {nama}",
  siang: "Selamat siang, {nama}",
  sore: "Selamat sore, {nama}",
  malam: "Selamat malam, {nama}",
};

export function partOfDay(tz: string, now: Date = new Date()): keyof typeof DEFAULT_GREETINGS {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(now));
  if (h >= 4 && h < 11) return "pagi";
  if (h >= 11 && h < 15) return "siang";
  if (h >= 15 && h < 19) return "sore";
  return "malam";
}

export function greetingFor(prefs: Prefs | undefined, tz: string, name: string) {
  const part = partOfDay(tz);
  const tpl = prefs?.greetings?.[part]?.trim() || DEFAULT_GREETINGS[part];
  return tpl.replace(/\{nama\}/gi, name);
}
