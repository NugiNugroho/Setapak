"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, Settings, Plus, Ellipsis, Home, SquareCheck, Wallet } from "./Icons";
import { Logo } from "./Logo";

type Modules = Record<string, boolean>;

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

export function Sidebar({ name, modules }: { name: string; modules: Modules }) {
  const path = usePathname();
  const items = NAV.filter((n) => !n.module || modules[n.module] !== false);
  return (
    <nav
      aria-label="Navigasi utama"
      className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-line bg-sidebar px-4 py-6 md:flex"
    >
      <div className="px-3 pb-5"><Logo /></div>
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(path, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm ${
              active ? "bg-surface font-semibold text-ink shadow-sm" : "font-medium text-ink-2 hover:bg-surface/60"
            }`}
          >
            <Icon size={18} strokeWidth={1.75} className={active ? "text-accent" : ""} aria-hidden />
            {label}
          </Link>
        );
      })}
      <div className="mt-auto flex items-center gap-2.5 border-t border-line px-3 pt-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft font-bold text-accent">
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] font-semibold">{name}</span>
          <Link href="/pengaturan" className="flex items-center gap-1 text-xs text-muted hover:text-ink">
            <Settings size={12} aria-hidden />Pengaturan
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function BottomNav({ modules }: { modules: Modules }) {
  const path = usePathname();
  const item = (href: string, label: string, Icon: typeof Home) => {
    const active = isActive(path, href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex w-16 flex-col items-center gap-0.5 text-[11px] ${active ? "font-semibold text-accent" : "font-medium text-muted"}`}
      >
        <Icon size={22} strokeWidth={1.75} aria-hidden />
        {label}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Navigasi bawah"
      className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(76px+env(safe-area-inset-bottom))] items-start justify-around border-t border-line bg-surface px-3 pt-2 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {item("/", "Hari Ini", Home)}
      {modules.task !== false ? item("/task", "Task", SquareCheck) : <span className="w-16" />}
      <Link
        href="/task?baru=1"
        aria-label="Tambah task cepat"
        className="-mt-6 flex size-14 items-center justify-center rounded-[18px] bg-accent text-on-accent shadow-lg shadow-accent/30"
      >
        <Plus size={24} strokeWidth={2.25} aria-hidden />
      </Link>
      {modules.keuangan !== false ? item("/keuangan", "Keuangan", Wallet) : <span className="w-16" />}
      {item("/lainnya", "Lainnya", Ellipsis)}
    </nav>
  );
}
