import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Loader2, X } from "lucide-react";
import {
  categoriesFor,
  fmtMoney,
  localTodayKey,
  type Txn,
  type TxnType,
} from "@/lib/wallet";

export interface TxnFormValues {
  type: TxnType;
  name: string;
  amount: number;
  category: string;
  date: string;
}

export default function TransactionModal({
  open,
  editing,
  initialType,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: Txn | null;
  initialType: TxnType;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: TxnFormValues) => void;
}) {
  const [type, setType] = useState<TxnType>("expense");
  const [name, setName] = useState("");
  const [amountRaw, setAmountRaw] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(localTodayKey());
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Reset the form whenever the modal is (re)opened, targets a different
  // transaction, or switches the initial type.
  const formKey = open
    ? editing
      ? `edit-${editing.id}`
      : `new-${initialType}`
    : "closed";
  const [prevFormKey, setPrevFormKey] = useState(formKey);
  if (formKey !== prevFormKey) {
    setPrevFormKey(formKey);
    if (open) {
      const t = editing;
      setType(t?.type ?? initialType);
      setName(t?.name ?? "");
      setAmountRaw(t ? String(t.amount) : "");
      setCategory(t?.category ?? categoriesFor(t?.type ?? initialType)[0].key);
      setDate(t?.date ?? localTodayKey());
      setError(null);
    }
  }

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => nameRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const switchType = (t: TxnType) => {
    setType(t);
    setCategory(categoriesFor(t)[0].key);
  };

  const amount = Number(amountRaw.replace(/,/g, ""));
  const amountValid = amountRaw.trim() !== "" && Number.isFinite(amount) && amount > 0 && amount < 1e12;
  const nameValid = name.trim().length > 0;

  const submit = () => {
    if (!nameValid) {
      setError("Give this transaction a name.");
      return;
    }
    if (!amountValid) {
      setError("Enter a valid amount greater than 0.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }
    onSubmit({
      type,
      name: name.trim(),
      amount: Math.round(amount * 100) / 100,
      category,
      date,
    });
  };

  const cats = categoriesFor(type);
  const accent = type === "income" ? "#34d399" : "#fb7185";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={saving ? undefined : onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_40px_120px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-[#101014] dark:shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full blur-3xl transition-colors"
              style={{ background: `${accent}22` }}
            />

            <div className="relative flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                  {editing ? "Edit transaction" : type === "income" ? "Add income" : "Add expense"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {editing ? "Update the details below." : "It only takes a moment."}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={saving}
                className="grid size-9 place-items-center rounded-full border border-zinc-200 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/5 dark:hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form
              className="relative mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!saving) submit();
              }}
            >
              {/* type toggle */}
              <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-100 p-1.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
                {(["expense", "income"] as const).map((t) => {
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => switchType(t)}
                      className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                        active
                          ? t === "income"
                            ? "text-emerald-950 dark:text-emerald-950"
                            : "text-rose-950 dark:text-rose-950"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="txn-type-pill"
                          className={`absolute inset-0 rounded-xl ${t === "income" ? "bg-emerald-400" : "bg-rose-400"}`}
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="relative flex items-center gap-1.5">
                        {t === "income" ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                        {t === "income" ? "Income" : "Expense"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* name + amount */}
              <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
                <div>
                  <label htmlFor="txn-name" className="text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Name
                  </label>
                  <input
                    id="txn-name"
                    ref={nameRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder={type === "income" ? "e.g. Monthly allowance" : "e.g. Lunch at cafeteria"}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[15px] text-zinc-900 placeholder-zinc-400 transition outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label htmlFor="txn-amount" className="text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    Amount
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] font-semibold text-zinc-400">
                      ৳
                    </span>
                    <input
                      id="txn-amount"
                      value={amountRaw}
                      onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9.,]/g, ""))}
                      inputMode="decimal"
                      placeholder="0"
                      className={`w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-3 pl-8 text-right text-[15px] font-semibold text-zinc-900 tabular-nums placeholder-zinc-400 transition outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder-zinc-600 ${
                        amountRaw && !amountValid
                          ? "border-rose-400/60 ring-2 ring-rose-400/20"
                          : "focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* category */}
              <div>
                <span className="text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                  Category
                </span>
                <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {cats.map((c) => {
                    const active = category === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCategory(c.key)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[11px] font-medium transition-all ${
                          active
                            ? "border-transparent text-white"
                            : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:text-zinc-200"
                        }`}
                        style={active ? { background: c.hex, boxShadow: `0 8px 24px ${c.hex}55` } : undefined}
                      >
                        <c.icon size={16} strokeWidth={2.2} style={active ? undefined : { color: c.hex }} />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* date */}
              <div>
                <label htmlFor="txn-date" className="text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                  Date
                </label>
                <input
                  id="txn-date"
                  type="date"
                  value={date}
                  max={localTodayKey()}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 transition outline-none [color-scheme:light] focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:[color-scheme:dark]"
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-medium text-rose-500 dark:text-rose-400"
                >
                  {error}
                </motion.p>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="text-sm text-zinc-500 tabular-nums">
                  {amountValid && (
                    <span>
                      {type === "income" ? "+" : "−"}৳{fmtMoney(amount)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={saving}
                    className="rounded-full px-4 py-2.5 text-sm font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 ${
                      type === "income" ? "bg-emerald-500 hover:bg-emerald-400" : "bg-rose-500 hover:bg-rose-400"
                    }`}
                  >
                    {saving && <Loader2 size={15} className="animate-spin" />}
                    {editing ? "Save changes" : type === "income" ? "Add income" : "Add expense"}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
