export type LogStatusValue = "completed" | "skipped";

/* ---- stored records (mirrors the backend row shapes) --------------------- */

export interface HabitRecord {
  id: number;
  userId: string;
  name: string;
  icon: string;
  color: string;
  sortOrder: number;
  createdKey: string;
}

export interface LogRecord {
  habitId: number;
  userId: string;
  date: string;
  status: LogStatusValue;
}

/* ---- DTOs shipped to the dashboard UI ------------------------------------ */

export interface DailyQuoteDTO {
  text: string;
  category: "love" | "motivation";
}

export interface SessionUser {
  id: string;
  name: string;
  color: string;
}

export interface HabitDTO {
  id: number;
  name: string;
  icon: string;
  color: string;
  createdKey: string;
  todayStatus: LogStatusValue | null;
  streak: number;
  bestStreak: number;
  last7: { date: string; status: LogStatusValue | null; tracked: boolean }[];
  totalCompletions: number;
}

export interface DayStat {
  date: string;
  dow: string; // M T W T F S S
  dayNum: number;
  completed: number;
  skipped: number;
  eligible: number;
  pct: number | null; // null = no habits existed that day
  perfect: boolean;
  isToday: boolean;
}

export interface HeatCell {
  date: string;
  pct: number | null;
  completed: number;
  eligible: number;
  row: number; // 0 (Mon) … 6 (Sun)
  col: number;
  isToday: boolean;
}

/** Read-only summary of the other person. */
export interface PartnerSummary {
  user: SessionUser;
  /** Completed habit-days ÷ eligible habit-days over the last 30 days (0–100). */
  consistencyPct: number;
  currentStreak: number;
  bestStreak: number;
  today: { completed: number; total: number; pct: number };
  weekPct: (number | null)[]; // last 7 days, oldest → newest
  totalCompletions: number;
}

export interface DashboardData {
  today: string;
  greeting: string;
  dateLine: string;
  dailyQuote: DailyQuoteDTO;
  me: SessionUser;
  partner: PartnerSummary | null;
  totals: {
    total: number;
    completed: number;
    skipped: number;
    left: number;
    pct: number;
  };
  streaks: { current: number; best: number; perfectThisWeek: number };
  week: DayStat[];
  heat: HeatCell[];
  heatWeeks: number;
  habits: HabitDTO[];
}
