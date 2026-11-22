import Link from "next/link";

export function ComingSoon({ title, phase, items }: { title: string; phase: string; items: string[] }) {
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">{phase}</span>
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{title}</h1>
      </header>
      <div className="card flex flex-col gap-3 px-5 py-5">
        <p className="font-semibold">Modul ini sedang dibangun, setapak demi setapak.</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
          {items.map((i) => <li key={i}>{i}</li>)}
        </ul>
        <p className="text-sm text-muted">Tabel database-nya sudah siap, jadi data yang nanti kamu isi aman dan terpisah per akun.</p>
        <Link href="/" className="btn self-start">Kembali ke Hari Ini</Link>
      </div>
    </div>
  );
}
