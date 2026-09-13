import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  ListChecks,
  PieChart,
  ReceiptText,
  Search,
  Wallet as WalletIcon,
  Zap,
} from "lucide-react";
import { categoryOf, type Txn, type TxnType } from "@/lib/wallet";
import CountUp from "@/components/count-up";
import WalletIllustration from "@/components/wallet/wallet-illustration";
import TransactionModal, { type TxnFormValues } from "@/components/wallet/transaction-modal";
import TransactionList from "@/components/wallet/transaction-list";
import { CategoryBreakdown, SpendingChart } from "@/components/wallet/wallet-charts";

type Filter = "all" | "income" | "expense";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expenses" },
];

export default function WalletClient({
  txns,
  onSubmitTxn,
  onDeleteTxn,
  onBack,
  onOpenLeveling,
}: {
  txns: Txn[];
  onSubmitTxn: (values: TxnFormValues, editing: Txn | null) => void;
  onDeleteTxn: (t: Txn) => void;
  onBack: () => void;
  onOpenLeveling: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Txn | null>(null);
  const [initialType, setInitialType] = useState<TxnType>("expense");

  // ---- derived ---------------------------------------------------------------
  const { balance, income, expenses, incomeCount, expenseCount } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    for (const t of txns) {
      if (t.type === "income") {
        income += t.amount;
        incomeCount++;
      } else {
        expenses += t.amount;
        expenseCount++;
      }
    }
    return { balance: income - expenses, income, expenses, incomeCount, expenseCount };
  }, [txns]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txns
      .filter((t) => (filter === "all" ? true : t.type === filter))
      .filter((t) => {
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          categoryOf(t.type, t.category).label.toLowerCase().includes(q)
        );
      });
  }, [txns, filter, query]);

  // ---- actions -----------------------------------------------------------------
  const openAdd = (type: TxnType) => {
    setEditing(null);
    setInitialType(type);
    setModalOpen(true);
  };

  const openEdit = (t: Txn) => {
    setEditing(t);
    setInitialType(t.type);
    setModalOpen(true);
  };

  const submit = (values: TxnFormValues) => {
    onSubmitTxn(values, editing);
    setModalOpen(false);
  };

  const remove = (t: Txn) => {
    onDeleteTxn(t);
  };

  const savedPct =
    income > 0 ? Math.max(0, Math.round(((income - expenses) / income) * 100)) : null;

  return (
    <div className="dark">
      <div className="grain min-h-screen bg-[#0a0a0c] text-zinc-100">
        {/* ambient glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 left-[10%] h-[420px] w-[560px] rounded-full bg-emerald-300/25 blur-[130px] dark:bg-lime-400/[0.06]" />
          <div className="absolute top-[36%] right-[-6%] h-[380px] w-[460px] rounded-full bg-rose-300/20 blur-[130px] dark:bg-rose-400/[0.05]" />
          <div className="absolute bottom-[-10%] left-[30%] h-[340px] w-[480px] rounded-full bg-sky-300/20 blur-[130px] dark:bg-sky-400/[0.045]" />
        </div>

        {/* ---------- header ---------- */}
        <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/75 backdrop-blur-xl transition-colors dark:border-white/[0.06] dark:bg-[#0a0a0c]/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-zinc-900 text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.25)] dark:bg-amber-300 dark:text-zinc-900">
                <WalletIcon size={18} strokeWidth={2.2} />
              </div>
              <div>
                <div className="font-display text-[15px] font-semibold tracking-tight">Wallet</div>
                <div className="text-[10px] font-medium tracking-[0.22em] text-zinc-500 uppercase">
                  money, made mindful
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={onBack}
                aria-label="Open habits"
                title="Habits"
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/60 px-4 py-2 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <ListChecks size={14} className="text-lime-500 dark:text-lime-300" />
                <span className="hidden sm:inline">Habits</span>
              </button>
              <button
                onClick={onOpenLeveling}
                aria-label="Open leveling"
                title="Leveling"
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white/60 px-4 py-2 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
              >
                <Zap size={14} className="text-lime-500 dark:text-lime-300" />
                <span className="hidden sm:inline">Leveling</span>
              </button>

            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-5xl px-4 pt-8 pb-20 sm:px-6">
          {/* ---------- hero ---------- */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/70 px-6 py-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.06)] backdrop-blur transition-colors sm:py-12 dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-none"
          >
            <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[520px] -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl dark:bg-amber-400/[0.06]" />

            <div className="relative">
              <div className="flex justify-center">
                <WalletIllustration size={230} />
              </div>

              <p className="mt-2 text-[11px] font-bold tracking-[0.32em] text-zinc-500 uppercase">
                Total balance
              </p>
              <h1
                className={`font-display mt-2 text-[clamp(2.8rem,8vw,4.6rem)] leading-none font-semibold tracking-tight tabular-nums ${
                  balance < 0 ? "text-rose-500 dark:text-rose-400" : ""
                }`}
              >
                {balance < 0 && "−"}
                <CountUp value={Math.abs(balance)} prefix="৳" />
              </h1>

              <p className="mt-3 text-sm text-zinc-500">
                {txns.length > 0 ? (
                  savedPct !== null && income >= expenses ? (
                    <>
                      You kept <span className="font-semibold text-emerald-600 dark:text-emerald-400">{savedPct}%</span> of
                      your income — keep it rolling.
                    </>
                  ) : balance < 0 ? (
                    "Spending is ahead of income — time to pull back a little."
                  ) : (
                    "Every taka tracked is a taka understood."
                  )
                ) : (
                  "Your wallet is empty. Add your first income below."
                )}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => openAdd("income")}
                  className="flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400"
                >
                  <ArrowDownLeft size={17} strokeWidth={2.6} />
                  Add Income
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => openAdd("expense")}
                  className="flex items-center gap-2 rounded-full bg-rose-500 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(244,63,94,0.35)] transition hover:bg-rose-400"
                >
                  <ArrowUpRight size={17} strokeWidth={2.6} />
                  Add Expense
                </motion.button>
              </div>

              {txns.length > 0 && (
                <p className="mt-5 text-[11px] tracking-[0.2em] text-zinc-400 uppercase dark:text-zinc-600">
                  all time · {txns.length} transaction{txns.length === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </motion.section>

          {/* ---------- main grid ---------- */}
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_330px]">
            {/* history */}
            <section>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mb-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-lg font-semibold tracking-tight">
                    Transaction history
                  </h2>
                  <span className="rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-500 tabular-nums dark:border-white/[0.08] dark:bg-white/[0.03]">
                    {visible.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search"
                      aria-label="Search transactions"
                      className="w-32 rounded-full border border-zinc-200 bg-white/70 py-2 pr-3 pl-8 text-xs text-zinc-800 placeholder-zinc-400 transition outline-none focus:w-40 focus:border-zinc-400 sm:w-36 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white dark:focus:border-white/25"
                    />
                  </div>
                  <div className="flex rounded-full border border-zinc-200 bg-white/70 p-1 dark:border-white/[0.08] dark:bg-white/[0.03]">
                    {FILTERS.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`relative rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          filter === f.key
                            ? "text-zinc-950"
                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
                        }`}
                      >
                        {filter === f.key && (
                          <motion.span
                            layoutId="wallet-filter-pill"
                            className="absolute inset-0 rounded-full bg-zinc-900 dark:bg-lime-400"
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                          />
                        )}
                        <span className={`relative ${filter === f.key ? "text-white dark:text-zinc-950" : ""}`}>
                          {f.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16 }}
              >
                <TransactionList txns={visible} onEdit={openEdit} onDelete={remove} />
              </motion.div>
            </section>

            {/* stats rail */}
            <aside className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.14 }}
                className="rounded-3xl border border-zinc-200/80 bg-white/70 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-colors dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-none"
              >
                <RailTitle icon={<ArrowDownLeft size={14} />} title="Total income" tone="text-emerald-500 dark:text-emerald-400" />
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="font-display text-3xl font-semibold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
                    <CountUp value={income} prefix="৳" />
                  </div>
                  <span className="pb-1 text-[11px] text-zinc-500">{incomeCount} entr{incomeCount === 1 ? "y" : "ies"}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-emerald-400"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${income + expenses === 0 ? 0 : (income / (income + expenses)) * 100}%`,
                    }}
                    transition={{ type: "spring", stiffness: 70, damping: 20 }}
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-3xl border border-zinc-200/80 bg-white/70 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-colors dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-none"
              >
                <RailTitle icon={<ArrowUpRight size={14} />} title="Total expenses" tone="text-rose-500 dark:text-rose-400" />
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="font-display text-3xl font-semibold tracking-tight text-rose-500 tabular-nums dark:text-rose-400">
                    <CountUp value={expenses} prefix="৳" />
                  </div>
                  <span className="pb-1 text-[11px] text-zinc-500">{expenseCount} entr{expenseCount === 1 ? "y" : "ies"}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full bg-rose-400"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${income + expenses === 0 ? 0 : (expenses / (income + expenses)) * 100}%`,
                    }}
                    transition={{ type: "spring", stiffness: 70, damping: 20 }}
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.26 }}
                className="rounded-3xl border border-zinc-200/80 bg-white/70 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-colors dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-none"
              >
                <RailTitle icon={<BarChart3 size={14} />} title="Spending · 7 days" tone="text-rose-500 dark:text-rose-400" />
                <div className="mt-4">
                  <SpendingChart txns={txns} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.32 }}
                className="rounded-3xl border border-zinc-200/80 bg-white/70 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.04)] transition-colors dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-none"
              >
                <RailTitle icon={<PieChart size={14} />} title="Where money went" tone="text-sky-500 dark:text-sky-300" />
                <div className="mt-4">
                  <CategoryBreakdown txns={txns} />
                </div>
              </motion.div>
            </aside>
          </div>

          <footer className="mt-10 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-600">
            <span className="flex items-center gap-1.5">
              <ReceiptText size={12} />
              Saved locally in your browser — survives refreshes.
            </span>
            <span className="hidden sm:inline">Balance = income − expenses</span>
          </footer>
        </main>

        <TransactionModal
          open={modalOpen}
          editing={editing}
          initialType={initialType}
          saving={false}
          onClose={() => setModalOpen(false)}
          onSubmit={submit}
        />
      </div>
    </div>
  );
}

function RailTitle({ icon, title, tone }: { icon: ReactNode; title: string; tone: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={tone}>{icon}</span>
      <h3 className="text-[11px] font-bold tracking-[0.22em] text-zinc-500 uppercase dark:text-zinc-400">
        {title}
      </h3>
    </div>
  );
}
