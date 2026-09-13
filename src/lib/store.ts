// ---------------------------------------------------------------------------
// Client-side domain logic (pure). Persistence lives in PostgreSQL, reached
// through src/app/api/* — these helpers only compute the next in-memory state.
// ---------------------------------------------------------------------------

import { dateKey, dateLine, greetingFor } from "@/lib/dates";
import { quoteOfTheDay } from "@/lib/quotes";
import { computePartner, computeSelf } from "@/lib/compute";
import type {
  DashboardData,
  HabitRecord,
  LogRecord,
  LogStatusValue,
} from "@/lib/types";

export { MAX_ACCOUNTS, type AccountUser } from "@/lib/accounts";

/* ---- per-user data slice ------------------------------------------------------- */

export interface UserSlice {
  seeded: boolean;
  habits: HabitRecord[];
  logs: LogRecord[];
}

/* ---- mutations (pure — return the next slice) ------------------------------------ */

export function setLog(
  slice: UserSlice,
  userId: string,
  habitId: number,
  date: string,
  status: LogStatusValue | null
): UserSlice {
  const mine = slice.habits.some((h) => h.id === habitId);
  if (!mine) return slice;
  const rest = slice.logs.filter(
    (l) => !(l.habitId === habitId && l.date === date)
  );
  const logs =
    status === null ? rest : [...rest, { habitId, userId, date, status }];
  return { ...slice, logs };
}

export function createHabitInSlice(
  slice: UserSlice,
  userId: string,
  input: { name: string; icon: string; color: string }
): UserSlice {
  const todayKey = dateKey(new Date());
  const nextId = slice.habits.reduce((m, h) => Math.max(m, h.id), 0) + 1;
  const sortOrder = slice.habits.reduce((m, h) => Math.max(m, h.sortOrder), 0) + 1;
  const habit: HabitRecord = {
    id: nextId,
    userId,
    name: input.name,
    icon: input.icon,
    color: input.color,
    sortOrder,
    createdKey: todayKey,
  };
  return { ...slice, habits: [...slice.habits, habit] };
}

export function updateHabitInSlice(
  slice: UserSlice,
  habitId: number,
  patch: { name?: string; icon?: string; color?: string }
): UserSlice {
  const habits = slice.habits.map((h) =>
    h.id === habitId ? { ...h, ...patch } : h
  );
  return { ...slice, habits };
}

export function deleteHabitInSlice(slice: UserSlice, habitId: number): UserSlice {
  const habits = slice.habits.filter((h) => h.id !== habitId);
  const logs = slice.logs.filter((l) => l.habitId !== habitId);
  return { ...slice, habits, logs };
}

/* ---- dashboard assembly ------------------------------------------------------------ */

export function buildDashboard(
  me: { id: string; name: string; color: string },
  slice: UserSlice,
  partnerSlice: UserSlice | null,
  partnerUser: { id: string; name: string; color: string } | null
): DashboardData {
  const now = new Date();
  const self = computeSelf(slice.habits, slice.logs, now);

  let partner = null;
  if (partnerUser && partnerSlice) {
    partner = computePartner(
      partnerUser,
      partnerSlice.habits,
      partnerSlice.logs,
      now
    );
  }

  return {
    today: dateKey(now),
    greeting: greetingFor(now),
    dateLine: dateLine(now),
    dailyQuote: quoteOfTheDay(now),
    me: { id: me.id, name: me.name, color: me.color },
    partner,
    totals: self.totals,
    streaks: self.streaks,
    week: self.week,
    heat: self.heat,
    heatWeeks: self.heatWeeks,
    habits: self.habits,
  };
}
