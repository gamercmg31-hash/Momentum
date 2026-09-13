import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Pencil, ReceiptText, Trash2, X } from "lucide-react";
import { categoryOf, dateLabel, fmtMoney, localTodayKey, type Txn } from "@/lib/wallet";

export default function TransactionList({
  txns,
  onEdit,
  onDelete,
}: {
  txns: Txn[];
  onEdit: (t: Txn) => void;
  onDelete: (t: Txn) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const todayKey = localTodayKey();

  const groups = useMemo(() => {
    const map = new Map<string, Txn[]>();
    for (const t of txns) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => b.createdAt - a.createdAt),
        net: items.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), 0),
      }));
  }, [txns]);

  if (txns.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid place-items-center rounded-2xl border border-dashed border-zinc-300 py-14 text-center dark:border-white/10"
      >
        <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-white/[0.06] dark:text-zinc-500">
          <ReceiptText size={20} />
        </div>
        <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">No transactions yet</p>
        <p className="mt-1 max-w-[240px] text-xs text-zinc-500">
          Add your first income or expense and your history will build up here.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g, gi) => (
        <div key={g.date}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h3 className="text-[11px] font-bold tracking-[0.18em] text-zinc-400 uppercase dark:text-zinc-500">
              {dateLabel(g.date, todayKey)}
            </h3>
            <span
              className={`text-[11px] font-semibold tabular-nums ${
                g.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
              }`}
            >
              {g.net >= 0 ? "+" : "−"}৳{fmtMoney(Math.abs(g.net))}
            </span>
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {g.items.map((t, i) => {
                const cat = categoryOf(t.type, t.category);
                const confirming = confirmId === t.id;
                return (
                  <motion.div
                    layout
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 340, damping: 30, delay: gi * 0.03 + i * 0.025 }}
                    className="group flex items-center gap-3.5 rounded-2xl border border-zinc-200/80 bg-white p-3.5 transition-colors hover:border-zinc-300 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/[0.12]"
                  >
                    <div
                      className="grid size-11 shrink-0 place-items-center rounded-xl"
                      style={{ background: `${cat.hex}1f`, color: cat.hex }}
                    >
                      <cat.icon size={19} strokeWidth={2.1} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{t.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{cat.label}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <span
                        className={`pr-1 text-sm font-semibold tabular-nums ${
                          t.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-500 dark:text-rose-400"
                        }`}
                      >
                        {t.type === "income" ? "+" : "−"}৳{fmtMoney(t.amount)}
                      </span>

                      {confirming ? (
                        <>
                          <button
                            onClick={() => {
                              setConfirmId(null);
                              onDelete(t);
                            }}
                            title="Confirm delete"
                            aria-label={`Confirm delete ${t.name}`}
                            className="grid size-8 place-items-center rounded-full bg-rose-500 text-white transition hover:bg-rose-400"
                          >
                            <Check size={14} strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            title="Cancel"
                            aria-label="Cancel delete"
                            className="grid size-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 dark:bg-white/[0.08] dark:text-zinc-300 dark:hover:bg-white/[0.14]"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onEdit(t)}
                            title="Edit transaction"
                            aria-label={`Edit ${t.name}`}
                            className="grid size-8 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-white/[0.08] dark:hover:text-white"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmId(t.id)}
                            title="Delete transaction"
                            aria-label={`Delete ${t.name}`}
                            className="grid size-8 place-items-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-rose-400/10 dark:hover:text-rose-400"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
