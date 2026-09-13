import { motion } from "framer-motion";
import type { HeatCell } from "@/lib/types";

function cellClass(cell: HeatCell): string {
  if (cell.pct === null) return "bg-white/[0.03]";
  if (cell.pct <= 0) return "bg-white/[0.07]";
  if (cell.pct < 34) return "bg-[#a3e635]/20";
  if (cell.pct < 67) return "bg-[#a3e635]/40";
  if (cell.pct < 100) return "bg-[#a3e635]/65";
  return "bg-[#a3e635] shadow-[0_0_8px_rgba(163,230,53,0.5)]";
}

export default function Heatmap({ cells, weeks }: { cells: HeatCell[]; weeks: number }) {
  const columns: HeatCell[][] = Array.from({ length: weeks }, () => []);
  for (const c of cells) {
    if (columns[c.col]) columns[c.col][c.row] = c;
  }

  return (
    <div>
      <div className="flex gap-[3px]" role="img" aria-label="Consistency heatmap of the last weeks">
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }, (_, row) => {
              const cell = col[row];
              if (!cell) return <span key={row} className="size-[11px] rounded-[3px] opacity-0" />;
              const label =
                cell.pct === null
                  ? `${cell.date} — no habits tracked`
                  : `${cell.date} — ${cell.completed}/${cell.eligible} done (${cell.pct}%)`;
              return (
                <motion.span
                  key={row}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: ci * 0.012, duration: 0.25 }}
                  title={label}
                  className={`size-[11px] rounded-[3px] ${cellClass(cell)} ${
                    cell.isToday ? "ring-1 ring-white/70 ring-offset-1 ring-offset-[#0b0b0e]" : ""
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] tracking-wide text-zinc-500 uppercase">
        <span>Less</span>
        <span className="size-[10px] rounded-[3px] bg-white/[0.07]" />
        <span className="size-[10px] rounded-[3px] bg-[#a3e635]/20" />
        <span className="size-[10px] rounded-[3px] bg-[#a3e635]/40" />
        <span className="size-[10px] rounded-[3px] bg-[#a3e635]/65" />
        <span className="size-[10px] rounded-[3px] bg-[#a3e635]" />
        <span>More</span>
      </div>
    </div>
  );
}
