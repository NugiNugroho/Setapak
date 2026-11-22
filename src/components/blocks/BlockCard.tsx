export function BlockCard({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className={`card flex flex-col gap-3 px-5 py-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside && <div className="text-xs text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}
