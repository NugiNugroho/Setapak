import Link from "next/link";

export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {eyebrow && <span className="text-[13px] font-medium text-muted">{eyebrow}</span>}
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SubNav({ items, current }: { items: { href: string; label: string; key: string }[]; current: string }) {
  return (
    <nav aria-label="Sub-menu" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={i.key === current ? "page" : undefined}
          className={`shrink-0 border-b-2 px-3.5 py-2.5 text-sm whitespace-nowrap ${
            i.key === current ? "border-accent font-semibold text-ink" : "border-transparent font-medium text-muted hover:text-ink"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function Card({ title, aside, children, className = "" }: { title?: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`card flex flex-col gap-3 px-5 py-4 ${className}`}>
      {(title || aside) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {aside && <div className="text-xs text-muted">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Bar({ pct, color = "var(--accent)", height = 6 }: { pct: number; color?: string; height?: number }) {
  return (
    <div className="w-full rounded-full bg-line-soft" style={{ height }}>
      <div className="rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height, background: color }} />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">{children}</div>;
}
