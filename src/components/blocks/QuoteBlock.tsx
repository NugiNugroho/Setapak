import Link from "next/link";

export function QuoteBlock({ title, quote }: { title: string; quote: { text: string; author: string | null } | null }) {
  return (
    <section aria-label={title} className="card flex min-h-[150px] flex-col justify-between gap-4 px-6 py-5">
      <span className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</span>
      {quote ? (
        <figure className="flex flex-col gap-2">
          <blockquote className="text-lg leading-snug font-semibold tracking-tight md:text-xl">“{quote.text}”</blockquote>
          {quote.author && <figcaption className="text-sm text-muted">— {quote.author}</figcaption>}
        </figure>
      ) : (
        <p className="text-sm text-muted">Belum ada kutipan. <Link href="/pengaturan/personalisasi" className="font-semibold text-accent">Tambahkan kutipan favorit</Link></p>
      )}
    </section>
  );
}
