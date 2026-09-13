import {
  BookOpen,
  Briefcase,
  Bus,
  Clapperboard,
  Gift,
  HandCoins,
  HeartPulse,
  Laptop,
  PiggyBank,
  Receipt,
  Shapes,
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type TxnType = "income" | "expense";

export interface Txn {
  id: string;
  name: string;
  category: string;
  amount: number;
  type: TxnType;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export interface Category {
  key: string;
  label: string;
  icon: LucideIcon;
  hex: string;
}

export const INCOME_CATEGORIES: Category[] = [
  { key: "salary", label: "Salary", icon: Briefcase, hex: "#34d399" },
  { key: "allowance", label: "Allowance", icon: HandCoins, hex: "#a3e635" },
  { key: "freelance", label: "Freelance", icon: Laptop, hex: "#38bdf8" },
  { key: "gift", label: "Gift", icon: Gift, hex: "#f472b6" },
  { key: "investment", label: "Investment", icon: TrendingUp, hex: "#fbbf24" },
  { key: "other-income", label: "Other", icon: PiggyBank, hex: "#a1a1aa" },
];

export const EXPENSE_CATEGORIES: Category[] = [
  { key: "food", label: "Food", icon: UtensilsCrossed, hex: "#fb923c" },
  { key: "transport", label: "Transport", icon: Bus, hex: "#38bdf8" },
  { key: "study", label: "Study", icon: BookOpen, hex: "#a78bfa" },
  { key: "shopping", label: "Shopping", icon: ShoppingBag, hex: "#f472b6" },
  { key: "fun", label: "Fun", icon: Clapperboard, hex: "#fb7185" },
  { key: "bills", label: "Bills", icon: Receipt, hex: "#fbbf24" },
  { key: "health", label: "Health", icon: HeartPulse, hex: "#4ade80" },
  { key: "other-expense", label: "Other", icon: Shapes, hex: "#a1a1aa" },
];

// NOTE: transactions are persisted in PostgreSQL (see src/app/api/wallet/*).
// This module only holds category metadata, ids and formatting helpers.

export function categoriesFor(type: TxnType): Category[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function categoryOf(type: TxnType, key: string): Category {
  const list = categoriesFor(type);
  return list.find((c) => c.key === key) ?? list[list.length - 1];
}

// ---- ids --------------------------------------------------------------------

export function txnId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---- formatting --------------------------------------------------------------

let moneyFmt: Intl.NumberFormat | null = null;
function formatter(): Intl.NumberFormat {
  if (!moneyFmt) {
    try {
      moneyFmt = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 2 });
    } catch {
      moneyFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
    }
  }
  return moneyFmt;
}

export function fmtMoney(n: number): string {
  return formatter().format(n);
}

export function localTodayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dateLabel(key: string, todayKey: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  if (key === todayKey) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (key === localTodayKey(yesterday)) return "Yesterday";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" as const }),
  });
}
