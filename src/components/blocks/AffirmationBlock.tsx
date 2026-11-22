import Link from "next/link";
import { dayNumber } from "@/lib/dates";

type Item = { id: string; text: string; area?: string | null };

export function pickAffirmation(items: Item[], mode: string, today: string, fixedId?: string) {
  if (!items.length) return null;
  if (mode === "fixed") return items.find((i) => i.id === fixedId) ?? items[0];
  const n = dayNumber(today);
  if (mode === "random") {
    // Acak tapi stabil sepanjang hari.
    const h = Math.abs(Math.sin(n * 9301 + 49297)) * 233280;
    return items[Math.floor(h) % items.length];
  }
  return items[n % items.length];
}

export function AffirmationBlock({
  title,
  item,
  index,
  total,
  sourceLabel,
}: {
  title: string;
  item: Item | null;
  index: number;
  total: number;
  sourceLabel: string;
}) {
  return (
    <section
      aria-label={title}
      className="flex min-h-[180px] flex-col justify-between gap-5 rounded-[16px] bg-accent px-6 py-6 text-on-accent md:px-8"
    >
      <div className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide uppercase opacity-80">
        <span>{title}{item?.area ? ` · ${item.area}` : ""}</span>
        {total > 0 && <span className="font-medium normal-case">{index + 1} / {total}</span>}
      </div>
      {item ? (
        <p className="max-w-2xl text-xl leading-snug font-semibold tracking-tight md:text-[26px]">{item.text}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold">Belum ada {sourceLabel}.</p>
          <Link href="/pengaturan#afirmasi" className="self-start rounded-lg bg-on-accent/15 px-3 py-2 text-sm font-semibold">
            Tulis yang pertama
          </Link>
        </div>
      )}
    </section>
  );
}
