/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { requireProfile } from "@/lib/profile";
import { todayISO, formatShortDate } from "@/lib/dates";
import { monthLabel } from "@/lib/finance";
import { signedUrls } from "@/lib/media";
import { PageHeader, Empty } from "@/components/ui";
import { BADGES } from "@/lib/achievements";

export const metadata = { title: "Galeri Jejak" };

const KIND: Record<string, string> = { gratitude: "Gratitude", journal: "Jurnal", scripting: "Surat masa depan", realized: "Terwujud", vision: "Visi" };

type Item = { id: string; date: string; kind: string; body: string | null; path: string | null };

export default async function Jejak() {
  const { supabase, profile } = await requireProfile();
  const today = todayISO(profile.timezone);
  const [journal, vision, goals, ach] = await Promise.all([
    supabase.from("journal_entries").select("id,entry_date,kind,body,image_path,reopen_at").or("image_path.not.is.null,kind.eq.realized").order("entry_date", { ascending: false }).limit(300),
    supabase.from("vision_items").select("id,caption,image_path,created_at").not("image_path", "is", null),
    supabase.from("goals").select("id,title,achieved_at").eq("status", "achieved"),
    supabase.from("achievements").select("key,achieved_at"),
  ]);
  const got = new Map((ach.data ?? []).map((a) => [a.key as string, a.achieved_at as string]));
  const items: Item[] = [
    ...(journal.data ?? [])
      .filter((j) => !(j.kind === "scripting" && j.reopen_at && j.reopen_at > today))
      .map((j) => ({ id: j.id, date: j.entry_date, kind: j.kind, body: j.body, path: j.image_path })),
    ...(vision.data ?? []).map((v) => ({ id: v.id, date: v.created_at.slice(0, 10), kind: "vision", body: v.caption, path: v.image_path })),
    ...(goals.data ?? []).filter((g) => g.achieved_at).map((g) => ({ id: g.id, date: g.achieved_at!.slice(0, 10), kind: "realized", body: `Goal tercapai: ${g.title}`, path: null })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const urls = await signedUrls(supabase, items.map((i) => i.path));

  const months: [string, Item[]][] = [];
  for (const it of items) {
    const m = it.date.slice(0, 7);
    const g = months.find(([k]) => k === m);
    if (g) g[1].push(it);
    else months.push([m, [it]]);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Langkah kecil, jejak panjang" title="Galeri Jejak" actions={<Link href="/manifestasi/refleksi" className="btn btn-primary">+ Tambah catatan bergambar</Link>} />
      <section aria-label="Penanda" className="flex flex-col gap-3">
        <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Penanda · {got.size}/{BADGES.length}</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {BADGES.map((b) => {
            const at = got.get(b.key);
            return (
              <div key={b.key} className={`card flex items-center gap-3 px-3 py-3 ${at ? "" : "opacity-55"}`}>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xl ${at ? "bg-accent-soft" : "bg-surface-2 grayscale"}`} aria-hidden>{b.emoji}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{b.title}</span>
                  <span className="truncate text-xs text-muted">{at ? `Diraih ${formatShortDate(todayISO(profile.timezone, new Date(at)), today)}` : b.desc}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {months.length ? months.map(([m, list]) => (
        <section key={m} aria-label={monthLabel(m)} className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-wide text-muted uppercase">{monthLabel(m)}</h2>
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
            {list.map((it) => (
              <figure key={`${it.kind}-${it.id}`} className="card break-inside-avoid overflow-hidden">
                {it.path && urls.get(it.path) && <img src={urls.get(it.path)} alt={it.body ?? KIND[it.kind]} className="w-full object-cover" loading="lazy" />}
                <figcaption className="flex flex-col gap-1 p-3">
                  <span className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase">
                    <span className={it.kind === "realized" ? "text-pos" : "text-accent"}>{KIND[it.kind] ?? it.kind}</span>
                    <span className="font-medium text-muted normal-case">{formatShortDate(it.date, today)}</span>
                  </span>
                  {it.body && <span className="line-clamp-4 text-sm">{it.body}</span>}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )) : (
        <Empty>Belum ada jejak bergambar. Tambahkan foto di <Link href="/manifestasi/refleksi" className="font-semibold text-accent">Refleksi</Link> atau di <Link href="/manifestasi/goal" className="font-semibold text-accent">Visi</Link>.</Empty>
      )}
    </div>
  );
}
