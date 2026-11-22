import { addDays, weekday } from "./dates";

export type Recurrence =
  | { type: "daily" }
  | { type: "weekly"; days: number[] } // 0 = Minggu … 6 = Sabtu
  | { type: "monthly"; day: number }
  | { type: "interval"; every: number }; // setiap N hari setelah selesai

/** Tanggal kemunculan berikutnya setelah `from` (YYYY-MM-DD). */
export function nextDue(rule: Recurrence, from: string): string {
  switch (rule.type) {
    case "daily":
      return addDays(from, 1);
    case "interval":
      return addDays(from, Math.max(1, rule.every));
    case "weekly": {
      const days = rule.days.length ? rule.days : [weekday(from)];
      for (let i = 1; i <= 7; i++) {
        const d = addDays(from, i);
        if (days.includes(weekday(d))) return d;
      }
      return addDays(from, 7);
    }
    case "monthly": {
      const [y, m] = from.split("-").map(Number);
      const ny = m === 12 ? y + 1 : y;
      const nm = m === 12 ? 1 : m + 1;
      const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
      const day = Math.min(rule.day, last);
      return `${ny}-${String(nm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
}

const HARI_PENDEK = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function describeRecurrence(rule: Recurrence | null | undefined): string | null {
  if (!rule) return null;
  switch (rule.type) {
    case "daily":
      return "setiap hari";
    case "interval":
      return `setiap ${rule.every} hari`;
    case "weekly":
      return "setiap " + rule.days.map((d) => HARI_PENDEK[d]).join(", ");
    case "monthly":
      return `setiap tgl ${rule.day}`;
  }
}
