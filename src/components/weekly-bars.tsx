import { motion } from "framer-motion";
import type { DayStat } from "@/lib/types";

export default function WeeklyBars({ week }: { week: DayStat[] }) {
  return (
    <div className="flex items-end justify-between gap-2">
      {week.map((d, i) => {
        const pct = d.pct ?? 0;
        const empty = d.pct === null;
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-24 w-full max-w-[34px] items-end overflow-hidden rounded-lg bg-white/[0.04]">
              {!empty && (
                <motion.div
                  className={`w-full rounded-lg ${
                    d.isToday
                      ? "bg-gradient-to-t from-lime-500 to-lime-300 shadow-[0_0_18px_rgba(163,230,53,0.35)]"
                      : d.perfect
                        ? "bg-lime-400/70"
                        : "bg-white/20"
                  }`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(pct, pct > 0 ? 8 : 2)}%` }}
                  transition={{ type: "spring", stiffness: 90, damping: 18, delay: i * 0.05 }}
                  title={`${d.date} — ${d.completed}/${d.eligible} (${pct}%)`}
                />
              )}
              {empty && <div className="h-[2px] w-full bg-white/10" />}
            </div>
            <div className="text-center">
              <div
                className={`text-[11px] font-semibold ${
                  d.isToday ? "text-lime-300" : "text-zinc-500"
                }`}
              >
                {d.dow}
              </div>
              <div className={`text-[10px] tabular-nums ${d.isToday ? "text-zinc-400" : "text-zinc-600"}`}>
                {d.dayNum}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
