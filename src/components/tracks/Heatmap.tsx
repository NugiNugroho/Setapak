import { HEAT } from "@/lib/tracks";

export function Heatmap({
  cells,
  size = 10,
  gap = 3,
  label,
}: {
  cells: { date: string; value: number; level: number; future: boolean }[];
  size?: number;
  gap?: number;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className="grid w-max grid-flow-col"
      style={{ gridTemplateRows: `repeat(7, ${size}px)`, gridAutoColumns: `${size}px`, gap }}
    >
      {cells.map((c) => (
        <span
          key={c.date}
          title={`${c.date}: ${c.value}`}
          className="rounded-[2px]"
          style={{ width: size, height: size, background: c.future ? "transparent" : HEAT[c.level] }}
        />
      ))}
    </div>
  );
}
