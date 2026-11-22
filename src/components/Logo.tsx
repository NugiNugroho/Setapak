/* eslint-disable @next/next/no-img-element */
export function Logo({ compact = false, size = 32 }: { compact?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/brand/icon-96.png" alt={compact ? "Setapak" : ""} width={size} height={size} className="shrink-0" />
      {!compact && <span className="text-[17px] font-bold tracking-tight text-[#0B5A3C] dark:text-ink">Setapak</span>}
    </div>
  );
}
