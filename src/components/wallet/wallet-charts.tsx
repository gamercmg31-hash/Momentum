import { useMemo } from "react";
import { motion } from "framer-motion";
import { categoryOf, fmtMoney, localTodayKey, type Txn } from "@/lib/wallet";

interface DayPoint {
  key: string;
  dow: string;
  dayNum: number;
  total: number;
  isToday: boolean;
}

export function SpendingChart({ txns }: { txns: Txn[] }) {
  const days = useMemo<DayPoint[]>(() => {
    const out: DayPoint[] = [];
    const today = new Date();
    const todayKey = localTodayKey(today);
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      out.push({
        key: localTodayKey(d),
        dow: d.toLocaleDateString("en-US", { weekday: "narrow" }),
        dayNum: d.getDate(),
        total: 0,
        isToday: localTodayKey(d) === todayKey,
      });
    }
    for (const t of txns) {
      if (t.type !== "expense") continue;
      const slot = out.find((d) => d.key === t.date);
      if (slot) slot.total += t.amount;
    }
    return out;
  }, [txns]);

  const max = Math.max(...days.map((d) => d.total), 0);
  const weekTotal = days.reduce((a, d) => a + d.total, 0);

  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        {days.map((d, i) => {
          const h = max === 0 ? 0 : Math.max((d.total / max) * 100, d.total > 0 ? 6 : 0);
          return (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex h-28 w-full max-w-[36px] items-end overflow-hidden rounded-lg bg-zinc-100 dark:bg-white/[0.05]">
                {d.total > 0 && (
                  <motion.div
                    className={`w-full rounded-lg ${
                      d.isToday
                        ? "bg-gradient-to-t from-rose-500 to-rose-300 shadow-[0_0_18px_rgba(251,113,133,0.35)]"
                        : "bg-rose-400/60 dark:bg-rose-400/50"
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ type: "spring", stiffness: 90, damping: 18, delay: i * 0.05 }}
                    title={`৳${fmtMoney(d.total)} on ${d.key}`}
                  />
                )}
              </div>
              <div className="text-center">
                <div
                  className={`text-[11px] font-semibold ${
                    d.isToday ? "text-rose-500 dark:text-rose-300" : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {d.dow}
                </div>
                <div className="text-[10px] text-zinc-400 tabular-nums dark:text-zinc-600">{d.dayNum}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        {weekTotal > 0 ? (
          <>
            You spent{" "}
            <span className="font-semibold text-rose-500 dark:text-rose-300">৳{fmtMoney(weekTotal)}</span>{" "}
            over the last 7 days.
          </>
        ) : (
          "No expenses in the last 7 days. Nice and quiet."
        )}
      </p>
    </div>
  );
}

export function CategoryBreakdown({ txns }: { txns: Txn[] }) {
  const rows = useMemo(() => {
    const monthPrefix = localTodayKey().slice(0, 7); // YYYY-MM
    const map = new Map<string, number>();
    let monthTotal = 0;
    for (const t of txns) {
      if (t.type !== "expense" || !t.date.startsWith(monthPrefix)) continue;
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
      monthTotal += t.amount;
    }
    return Array.from(map.entries())
      .map(([key, total]) => ({
        category: categoryOf("expense", key),
        total,
        share: monthTotal === 0 ? 0 : total / monthTotal,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [txns]);

  if (rows.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-zinc-500">
        No expenses this month yet — your category breakdown will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3.5">
      {rows.map((r, i) => (
        <div key={r.category.key}>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
              <r.category.icon size={13} style={{ color: r.category.hex }} />
              {r.category.label}
            </span>
            <span className="text-zinc-500 tabular-nums">
              ৳{fmtMoney(r.total)} · {Math.round(r.share * 100)}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: r.category.hex }}
              initial={{ width: 0 }}
              animate={{ width: `${r.share * 100}%` }}
              transition={{ type: "spring", stiffness: 70, damping: 20, delay: 0.1 + i * 0.06 }}
            />
          </div>
        </div>
      ))}
      <p className="pt-1 text-[11px] tracking-wide text-zinc-400 uppercase dark:text-zinc-600">this month</p>
    </div>
  );
}
