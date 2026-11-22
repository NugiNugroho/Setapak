import Link from "next/link";

/** Layar kosong yang ramah: ajakan singkat + satu tombol + (opsional) contoh. */
export function EmptyState({
  icon,
  title,
  desc,
  action,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  desc?: React.ReactNode;
  action?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-5 py-8 text-center">
      {icon && <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">{icon}</span>}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-semibold">{title}</p>
        {desc && <p className="text-sm text-muted">{desc}</p>}
      </div>
      {action && <Link href={action.href} className="btn btn-primary">{action.label}</Link>}
      {children}
    </div>
  );
}
