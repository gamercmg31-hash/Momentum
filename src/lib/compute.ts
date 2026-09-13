import {
  addDays,
  dateKey,
  parseKey,
  weekdayRow,
  weekdayShort,
} from "@/lib/dates";
import type {
  DayStat,
  HabitDTO,
  HabitRecord,
  HeatCell,
  LogRecord,
  LogStatusValue,
  PartnerSummary,
  SessionUser,
} from "@/lib/types";

export const HEAT_WEEKS = 18;
export const HISTORY_DAYS = 400;
const CONSISTENCY_DAYS = 30;

interface DayAgg {
  completed: number;
  skipped: number;
  eligible: number;
  pct: number | null;
  perfect: boolean;
}

/** Build the per-day aggregates for one user. */
function aggregate(
  habits: HabitRecord[],
  logs: LogRecord[],
  now: Date,
  historyDays: number
) {
  const todayKey = dateKey(now);
  const historyStartKey = dateKey(addDays(now, -historyDays));

  const logMap = new Map<number, Map<string, LogStatusValue>>();
  for (const l of logs) {
    if (!logMap.has(l.habitId)) logMap.set(l.habitId, new Map());
    logMap.get(l.habitId)!.set(l.date, l.status);
  }

  const dayAgg = (key: string): DayAgg => {
    const eligible = habits.filter((h) => h.createdKey <= key);
    let completed = 0;
    let skipped = 0;
    for (const h of eligible) {
      const s = logMap.get(h.id)?.get(key);
      if (s === "completed") completed++;
      else if (s === "skipped") skipped++;
    }
    return {
      completed,
      skipped,
      eligible: eligible.length,
      pct:
        eligible.length === 0
          ? null
          : Math.round((completed / eligible.length) * 100),
      perfect: eligible.length > 0 && completed === eligible.length,
    };
  };

  return { todayKey, historyStartKey, logMap, dayAgg };
}

function streaks(dayAgg: (k: string) => DayAgg, habits: HabitRecord[], now: Date) {
  const todayKey = dateKey(now);
  const historyStartKey = dateKey(addDays(now, -HISTORY_DAYS));

  let current = 0;
  let cursor = dayAgg(todayKey).perfect ? now : addDays(now, -1);
  while (dateKey(cursor) >= historyStartKey && dayAgg(dateKey(cursor)).perfect) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  const firstKey =
    habits.length === 0 ? todayKey : habits.map((h) => h.createdKey).sort()[0];
  let d = parseKey(firstKey);
  while (dateKey(d) <= todayKey) {
    if (dayAgg(dateKey(d)).perfect) {
      run++;
      if (run > best) best = run;
    } else run = 0;
    d = addDays(d, 1);
  }

  return { current, best };
}

export interface ComputedSelf {
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

/** Full dashboard stats for one user's own data. */
export function computeSelf(
  habits: HabitRecord[],
  logs: LogRecord[],
  now: Date
): ComputedSelf {
  const { todayKey, logMap, dayAgg } = aggregate(habits, logs, now, HISTORY_DAYS);

  const stat = (key: string): DayStat => {
    const d = parseKey(key);
    const a = dayAgg(key);
    return {
      date: key,
      dow: weekdayShort(d),
      dayNum: d.getDate(),
      completed: a.completed,
      skipped: a.skipped,
      eligible: a.eligible,
      pct: a.pct,
      perfect: a.perfect,
      isToday: key === todayKey,
    };
  };

  const today = dayAgg(todayKey);
  const totals = {
    total: today.eligible,
    completed: today.completed,
    skipped: today.skipped,
    left: today.eligible - today.completed,
    pct: today.pct ?? 0,
  };

  const week: DayStat[] = [];
  for (let i = 6; i >= 0; i--) week.push(stat(dateKey(addDays(now, -i))));
  const perfectThisWeek = week.filter((d) => d.perfect).length;

  const { current, best } = streaks(dayAgg, habits, now);

  const heat: HeatCell[] = [];
  const span = HEAT_WEEKS * 7 - 1;
  for (let i = span; i >= 0; i--) {
    const d = addDays(now, -i);
    const key = dateKey(d);
    const a = dayAgg(key);
    const idx = span - i;
    heat.push({
      date: key,
      pct: a.pct,
      completed: a.completed,
      eligible: a.eligible,
      row: weekdayRow(d),
      col: Math.floor(idx / 7),
      isToday: key === todayKey,
    });
  }

  const perHabitStreak = (h: HabitRecord): { streak: number; best: number } => {
    const m = logMap.get(h.id);
    const done = (key: string) => m?.get(key) === "completed";
    let streak = 0;
    let c = done(todayKey) ? now : addDays(now, -1);
    while (dateKey(c) >= h.createdKey && done(dateKey(c))) {
      streak++;
      c = addDays(c, -1);
    }
    let bestS = 0;
    let runS = 0;
    let d = parseKey(h.createdKey);
    while (dateKey(d) <= todayKey) {
      if (done(dateKey(d))) {
        runS++;
        if (runS > bestS) bestS = runS;
      } else runS = 0;
      d = addDays(d, 1);
    }
    return { streak, best: bestS };
  };

  const habitDTOs: HabitDTO[] = habits.map((h) => {
    const m = logMap.get(h.id);
    const { streak, best: bestStreak } = perHabitStreak(h);
    const last7: HabitDTO["last7"] = [];
    for (let i = 6; i >= 0; i--) {
      const key = dateKey(addDays(now, -i));
      last7.push({
        date: key,
        status: m?.get(key) ?? null,
        tracked: key >= h.createdKey,
      });
    }
    let totalCompletions = 0;
    m?.forEach((s) => {
      if (s === "completed") totalCompletions++;
    });
    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      createdKey: h.createdKey,
      todayStatus: m?.get(todayKey) ?? null,
      streak,
      bestStreak,
      last7,
      totalCompletions,
    };
  });

  return {
    totals,
    streaks: { current, best, perfectThisWeek },
    week,
    heat,
    heatWeeks: HEAT_WEEKS,
    habits: habitDTOs,
  };
}

/** Read-only partner summary — Consistency % over the last 30 days. */
export function computePartner(
  user: SessionUser,
  habits: HabitRecord[],
  logs: LogRecord[],
  now: Date
): PartnerSummary {
  const { todayKey, logMap, dayAgg } = aggregate(habits, logs, now, CONSISTENCY_DAYS + 10);

  // Consistency %: completed habit-days / eligible habit-days, last N days.
  let completedDays = 0;
  let eligibleDays = 0;
  for (let i = 0; i < CONSISTENCY_DAYS; i++) {
    const key = dateKey(addDays(now, -i));
    const a = dayAgg(key);
    completedDays += a.completed;
    eligibleDays += a.eligible;
  }
  const consistencyPct =
    eligibleDays === 0 ? 0 : Math.round((completedDays / eligibleDays) * 100);

  const { current, best } = streaks(dayAgg, habits, now);

  const today = dayAgg(todayKey);
  const weekPct: (number | null)[] = [];
  for (let i = 6; i >= 0; i--) weekPct.push(dayAgg(dateKey(addDays(now, -i))).pct);

  let totalCompletions = 0;
  logMap.forEach((m) =>
    m.forEach((s) => {
      if (s === "completed") totalCompletions++;
    })
  );

  return {
    user,
    consistencyPct,
    currentStreak: current,
    bestStreak: best,
    today: {
      completed: today.completed,
      total: today.eligible,
      pct: today.pct ?? 0,
    },
    weekPct,
    totalCompletions,
  };
}
