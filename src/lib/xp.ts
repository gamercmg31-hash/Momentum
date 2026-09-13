// ---------------------------------------------------------------------------
// Ascend — game-style leveling engine (pure logic).
//
// XP events are persisted in PostgreSQL and granted idempotently server-side
// via /api/xp/grant. This module holds the tuning, level math, rank ladder
// and quest definitions, plus pure evaluators the UI runs against fresh data.
// ---------------------------------------------------------------------------

import { addDays, dateKey, weekdayRow } from "@/lib/dates";
import type { HabitRecord, LogRecord } from "@/lib/types";
import type { Txn } from "@/lib/wallet";

/* ---- tuning --------------------------------------------------------------- */

export const XP_RULES = {
  /** per habit completed each day */
  habitCompleted: 10,
  /** bonus when every ritual of the day is completed */
  perfectDay: 25,
  /** per income entry added to the wallet */
  walletIncome: 5,
  /** …but only the first few income entries per day earn XP */
  walletIncomeDailyCap: 3,
} as const;

/** XP needed to go from `level` to the next one — rises steadily. */
export function xpForNext(level: number): number {
  return 100 + (level - 1) * 75;
}

export interface Rank {
  min: number;
  name: string;
}

export const RANKS: Rank[] = [
  { min: 1, name: "Initiate" },
  { min: 3, name: "Striver" },
  { min: 5, name: "Devotee" },
  { min: 8, name: "Ascendant" },
  { min: 12, name: "Vanguard" },
  { min: 16, name: "Luminary" },
  { min: 20, name: "Eternal" },
];

export function rankFor(level: number): Rank {
  let current = RANKS[0];
  for (const r of RANKS) if (level >= r.min) current = r;
  return current;
}

/* ---- event shape ------------------------------------------------------------ */

export interface XpEvent {
  key: string; // idempotency key — one award per key, forever
  label: string; // shown in toasts + activity feed
  amount: number;
  at: number; // epoch ms
  day: string; // local dateKey
}

/* ---- level math ------------------------------------------------------------- */

export interface LevelInfo {
  level: number;
  rank: Rank;
  totalXp: number;
  /** xp earned inside the current level */
  intoLevel: number;
  /** xp required to reach the next level from this one */
  forNext: number;
  /** 0–100 progress toward the next level */
  pct: number;
  nextLevel: number;
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpForNext(level)) {
    remaining -= xpForNext(level);
    level++;
  }
  const forNext = xpForNext(level);
  return {
    level,
    rank: rankFor(level),
    totalXp,
    intoLevel: remaining,
    forNext,
    pct: Math.min(100, Math.round((remaining / forNext) * 100)),
    nextLevel: level + 1,
  };
}

/* ---- summary (own or partner's — derived from the event ledger) ------------------ */

export interface XpSummary extends LevelInfo {
  todayXp: number;
  weekXp: number;
  recent: XpEvent[]; // newest first
}

export function xpSummaryFrom(
  totalXp: number,
  events: XpEvent[],
  now = new Date()
): XpSummary {
  const info = levelInfo(totalXp);
  const today = dateKey(now);
  const weekStart = dateKey(addDays(now, -weekdayRow(now)));
  let todayXp = 0;
  let weekXp = 0;
  for (const e of events) {
    if (e.day === today) todayXp += e.amount;
    if (e.day >= weekStart && e.day <= today) weekXp += e.amount;
  }
  return {
    ...info,
    todayXp,
    weekXp,
    recent: [...events].reverse().slice(0, 12),
  };
}

/* ---- awarding ---------------------------------------------------------------- */

export interface XpGrant {
  key: string;
  label: string;
  amount: number;
}

export interface LevelUp {
  from: number;
  to: number;
  rank: Rank;
}

export const XP_CHANGED_EVENT = "momentum:xp-changed";

/** Toast/refresh broadcast — fired by the data controller after a grant lands. */
export function notifyXpChanged(
  userId: string,
  gained: XpEvent[],
  levelUp: LevelUp | null
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(XP_CHANGED_EVENT, { detail: { userId, gained, levelUp } })
  );
}

/** How many income XP awards already exist today (for the daily cap). */
export function incomeAwardsToday(events: XpEvent[], now = new Date()): number {
  const today = dateKey(now);
  return events.filter((e) => e.day === today && e.key.startsWith("income:")).length;
}

/** Build the income grant — or null when today's cap is already reached. */
export function walletIncomeGrant(
  events: XpEvent[],
  txnIdValue: string,
  txnName: string
): XpGrant | null {
  if (incomeAwardsToday(events) >= XP_RULES.walletIncomeDailyCap) return null;
  return {
    key: `income:${txnIdValue}`,
    label: `Added income · ${txnName}`,
    amount: XP_RULES.walletIncome,
  };
}

/* ---- quests -------------------------------------------------------------------- */

export interface QuestCtx {
  habits: HabitRecord[];
  logs: LogRecord[];
  txns: Txn[];
  todayKey: string;
  weekStartKey: string;
}

/** Build the context quests are evaluated against. */
export function questCtxFrom(
  slice: { habits: HabitRecord[]; logs: LogRecord[] },
  txns: Txn[]
): QuestCtx {
  const now = new Date();
  return {
    habits: slice.habits,
    logs: slice.logs,
    txns,
    todayKey: dateKey(now),
    weekStartKey: dateKey(addDays(now, -weekdayRow(now))),
  };
}

export type QuestPeriod = "daily" | "weekly";

export interface QuestDef {
  id: string;
  period: QuestPeriod;
  name: string;
  desc: string;
  xp: number;
  icon: string; // resolved by the UI
  target: (ctx: QuestCtx) => number;
  progress: (ctx: QuestCtx) => number;
}

const completedOn = (logs: LogRecord[], day: string) =>
  logs.filter((l) => l.date === day && l.status === "completed").length;

const eligibleOn = (habits: HabitRecord[], day: string) =>
  habits.filter((h) => h.createdKey <= day).length;

function perfectDaysBetween(ctx: QuestCtx): number {
  // from week start through today — a day counts when every eligible ritual is done
  let count = 0;
  let d = new Date(ctx.weekStartKey + "T00:00:00");
  const todayD = new Date(ctx.todayKey + "T00:00:00");
  while (d <= todayD) {
    const key = dateKey(d);
    const eligible = eligibleOn(ctx.habits, key);
    if (eligible > 0 && completedOn(ctx.logs, key) >= eligible) count++;
    d = addDays(d, 1);
  }
  return count;
}

export const QUESTS: QuestDef[] = [
  {
    id: "first-check",
    period: "daily",
    name: "First check-in",
    desc: "Complete your first ritual of the day",
    xp: 15,
    icon: "sunrise",
    target: () => 1,
    progress: (ctx) => Math.min(1, completedOn(ctx.logs, ctx.todayKey)),
  },
  {
    id: "hat-trick",
    period: "daily",
    name: "Hat-trick",
    desc: "Complete 3 rituals today",
    xp: 25,
    icon: "flame",
    target: () => 3,
    progress: (ctx) => Math.min(3, completedOn(ctx.logs, ctx.todayKey)),
  },
  {
    id: "clean-sweep",
    period: "daily",
    name: "Clean sweep",
    desc: "Complete every ritual today",
    xp: 50,
    icon: "sparkles",
    target: (ctx) => Math.max(1, eligibleOn(ctx.habits, ctx.todayKey)),
    progress: (ctx) =>
      Math.min(
        eligibleOn(ctx.habits, ctx.todayKey),
        completedOn(ctx.logs, ctx.todayKey)
      ),
  },
  {
    id: "money-mindful",
    period: "daily",
    name: "Money mindful",
    desc: "Log any wallet entry today",
    xp: 10,
    icon: "hand-coins",
    target: () => 1,
    progress: (ctx) =>
      Math.min(1, ctx.txns.filter((t) => t.date === ctx.todayKey).length),
  },
  {
    id: "twenty-club",
    period: "weekly",
    name: "Twenty club",
    desc: "Bank 20 ritual check-ins this week",
    xp: 70,
    icon: "target",
    target: () => 20,
    progress: (ctx) =>
      Math.min(
        20,
        ctx.logs.filter(
          (l) =>
            l.status === "completed" &&
            l.date >= ctx.weekStartKey &&
            l.date <= ctx.todayKey
        ).length
      ),
  },
  {
    id: "perfect-trio",
    period: "weekly",
    name: "Perfect trio",
    desc: "Finish 3 perfect days this week",
    xp: 90,
    icon: "crown",
    target: () => 3,
    progress: (ctx) => Math.min(3, perfectDaysBetween(ctx)),
  },
  {
    id: "ledger-keeper",
    period: "weekly",
    name: "Ledger keeper",
    desc: "Record 3 wallet entries this week",
    xp: 40,
    icon: "piggy-bank",
    target: () => 3,
    progress: (ctx) =>
      Math.min(
        3,
        ctx.txns.filter(
          (t) => t.date >= ctx.weekStartKey && t.date <= ctx.todayKey
        ).length
      ),
  },
];

const periodKey = (period: QuestPeriod, ctx: QuestCtx) =>
  period === "daily" ? ctx.todayKey : ctx.weekStartKey;

export interface QuestState {
  def: QuestDef;
  progress: number;
  target: number;
  pct: number; // 0–100
  claimed: boolean;
}

export interface QuestEvaluation {
  states: QuestState[];
  /** grants ready to be claimed (target reached, key not yet awarded) */
  ready: XpGrant[];
}

/**
 * Pure evaluation: compute quest progress and any newly-completed grants for
 * the given claimed-key set. The caller persists `ready` via /api/xp/grant.
 */
export function evaluateQuests(
  ctx: QuestCtx,
  claimedKeys: Set<string>
): QuestEvaluation {
  const ready: XpGrant[] = [];
  const states: QuestState[] = QUESTS.map((def) => {
    const target = Math.max(1, def.target(ctx));
    const progress = def.progress(ctx);
    const key = `quest:${def.id}:${periodKey(def.period, ctx)}`;
    const claimed = claimedKeys.has(key);
    if (!claimed && progress >= target) {
      ready.push({ key, label: `Quest complete · ${def.name}`, amount: def.xp });
    }
    return {
      def,
      progress: Math.min(progress, target),
      target,
      pct: Math.min(100, Math.round((Math.min(progress, target) / target) * 100)),
      claimed: claimed || progress >= target,
    };
  });
  return { states, ready };
}
