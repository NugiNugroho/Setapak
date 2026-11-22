/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { ABOUT } from "@/lib/about";
import { LIBRARY } from "@/lib/music-library";

export const metadata = { title: "Tentang" };

export default function Tentang() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0";
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <Link href="/pengaturan" className="flex items-center gap-1 text-sm font-semibold text-accent"><ChevronLeft size={16} aria-hidden />Pengaturan</Link>

      <section className="flex flex-col items-center gap-4 py-6 text-center">
        <img src="/icons/icon-192.png" alt="" width={96} height={96} />
        <img src="/brand/wordmark.png" alt="Setapak" className="h-12 w-auto dark:brightness-0 dark:invert" />
        <p className="text-muted">Langkah kecil, jejak panjang.</p>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
          Versi {version}{commit ? ` · ${commit}` : ""}
        </span>
      </section>

      <section aria-label="Tentang aplikasi" className="card flex flex-col gap-2 p-5 text-sm text-ink-2">
        <p>Setapak menyatukan task harian, keuangan, manifestasi kebiasaan ala <i>Atomic Habits</i>, dan progres hal yang kamu tekuni dalam satu aplikasi untuk web dan HP.</p>
      </section>

      <section aria-label="Kontak" className="card flex flex-col px-5">
        <h2 className="pt-4 pb-1 text-xs font-bold tracking-wide text-muted uppercase">Kontak</h2>
        {ABOUT.contacts.map((c) => (
          <a key={c.label} href={c.href} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-between gap-3 border-t border-line-soft first:border-t-0">
            <span className="text-muted">{c.label}</span>
            <span className="flex items-center gap-1.5 font-semibold text-accent">{c.value}<ExternalLink size={13} aria-hidden /></span>
          </a>
        ))}
      </section>

      <section aria-label="Kredit musik" className="card flex flex-col gap-2 p-5 text-sm text-ink-2">
        <h2 className="text-xs font-bold tracking-wide text-muted uppercase">Kredit musik</h2>
        <p>Suara Hujan, Ombak, dan Brown noise dibuat langsung oleh aplikasi.</p>
        {LIBRARY.length > 0 && (
          <ul className="flex flex-col gap-1">
            {LIBRARY.map((t) => (
              <li key={t.id}>
                <a href={t.source} target="_blank" rel="noreferrer" className="font-semibold text-accent">{t.title}</a> oleh {t.artist} · {t.license}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="flex flex-col items-center gap-1 pb-6 text-center">
        <span className="text-sm text-muted">Made by <b className="text-ink">{ABOUT.maker}</b></span>
        <span className="text-2xl font-extrabold tracking-tight text-[#F28C1B]">{ABOUT.motto}</span>
      </footer>
    </div>
  );
}
