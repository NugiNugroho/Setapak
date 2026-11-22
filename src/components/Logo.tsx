const DOTS: [number, number, number, number][] = [
  [6.3, 18.2, 2.3, 1],
  [10.1, 17.3, 2.0, 0.9],
  [12.0, 14.0, 1.8, 0.8],
  [12.0, 10.1, 1.6, 0.7],
  [14.0, 7.0, 1.4, 0.6],
  [17.7, 5.7, 1.2, 0.5],
];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-accent text-on-accent">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          {DOTS.map(([cx, cy, r, o]) => (
            <circle key={cx + cy} cx={cx} cy={cy} r={r} fill="currentColor" opacity={o} />
          ))}
        </svg>
      </span>
      {!compact && <span className="text-[17px] font-bold tracking-tight">Setapak</span>}
    </div>
  );
}
