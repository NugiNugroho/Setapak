import { addDays, weekday } from "./dates";
import type { Recurrence } from "./recurrence";

export type ParsedTask = {
  title: string;
  due_date: string | null;
  due_time: string | null;
  labels: string[];
  priority: 1 | 2 | 3 | 4;
  someday: boolean;
  recurrence: Recurrence | null;
};

const DAYS: Record<string, number> = {
  minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, "jum'at": 5, sabtu: 6,
};

/**
 * Mengurai input cepat berbahasa Indonesia, contoh:
 * "Revisi essay besok 10.00 #lpdp !1" → tanggal besok, jam 10:00, label lpdp, prioritas 1.
 */
export function parseTaskInput(input: string, today: string): ParsedTask {
  let text = ` ${input.trim()} `;
  let due_date: string | null = null;
  let due_time: string | null = null;
  let priority: ParsedTask["priority"] = 4;
  let someday = false;
  const labels: string[] = [];
  let recurrence: Recurrence | null = null;

  text = text.replace(/\s#([\p{L}\p{N}_-]+)/gu, (_, l: string) => {
    labels.push(l.toLowerCase());
    return " ";
  });

  text = text.replace(/\s!([1-4])(?=\s)/g, (_, p: string) => {
    priority = Number(p) as ParsedTask["priority"];
    return " ";
  });

  text = text.replace(/\s(?:jam\s)?([01]?\d|2[0-3])[.:]([0-5]\d)(?=\s)/g, (_, h: string, m: string) => {
    due_time = `${h.padStart(2, "0")}:${m}`;
    return " ";
  });

  // Berulang: "setiap hari", "setiap senin", "setiap bulan", "setiap 3 hari"
  text = text.replace(/\ssetiap\s(hari|bulan|minggu|senin|selasa|rabu|kamis|jum'?at|sabtu|\d+\shari)(?=\s)/i, (_, what: string) => {
    const w = what.toLowerCase();
    if (w === "hari") recurrence = { type: "daily" };
    else if (w === "bulan") {
      recurrence = { type: "monthly", day: Number(today.slice(8)) };
    } else if (/^\d+\shari$/.test(w)) recurrence = { type: "interval", every: parseInt(w, 10) };
    else if (w === "minggu") recurrence = { type: "weekly", days: [weekday(today)] };
    else recurrence = { type: "weekly", days: [DAYS[w.replace("'", "")] ?? DAYS[w]] };
    return " ";
  });

  const rules: [RegExp, () => string | null][] = [
    [/\shari ini(?=\s)/i, () => today],
    [/\sbesok(?=\s)/i, () => addDays(today, 1)],
    [/\slusa(?=\s)/i, () => addDays(today, 2)],
    [/\sminggu depan(?=\s)/i, () => addDays(today, 7)],
  ];
  for (const [re, fn] of rules) {
    if (re.test(text)) {
      due_date = fn();
      text = text.replace(re, " ");
      break;
    }
  }

  if (!due_date) {
    text = text.replace(/\s(?:tgl|tanggal)\s?(\d{1,2})(?=\s)/i, (_, d: string) => {
      const day = Number(d);
      const [y, m, cur] = today.split("-").map(Number);
      let yy = y;
      let mm = m;
      if (day < cur) {
        mm += 1;
        if (mm > 12) { mm = 1; yy += 1; }
      }
      due_date = `${yy}-${String(mm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return " ";
    });
  }

  if (!due_date) {
    text = text.replace(/\s(?:hari\s)?(minggu|senin|selasa|rabu|kamis|jum'?at|sabtu)(?=\s)/i, (_, name: string) => {
      const target = DAYS[name.toLowerCase()];
      let diff = (target - weekday(today) + 7) % 7;
      if (diff === 0) diff = 7;
      due_date = addDays(today, diff);
      return " ";
    });
  }

  if (/\s(someday|suatu saat)(?=\s)/i.test(text)) {
    someday = true;
    text = text.replace(/\s(someday|suatu saat)(?=\s)/i, " ");
  }

  const title = text.replace(/\s+/g, " ").trim();
  if (recurrence && !due_date) {
    const r = recurrence as Recurrence;
    due_date = r.type === "weekly" && !r.days.includes(weekday(today))
      ? (() => { for (let i = 1; i <= 7; i++) { const d = addDays(today, i); if (r.days.includes(weekday(d))) return d; } return today; })()
      : today;
  }
  return { title: title || input.trim(), due_date, due_time, labels, priority, someday, recurrence };
}
