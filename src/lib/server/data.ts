// Server-only data layer. **Supabase PostgreSQL is the single source of
// truth.** Every query runs through the caller's Supabase Auth session, so
// Row Level Security (see supabase/schema.sql) is the final authority on who
// can read or write a row; the checks below are a second, explicit guard.

import type { PostgrestError } from "@supabase/supabase-js";
import { dateKey } from "@/lib/dates";
import type { HabitRecord, LogRecord, LogStatusValue } from "@/lib/types";
import type { Txn } from "@/lib/wallet";
import {
  XP_RULES,
  evaluateQuests,
  levelInfo,
  questCtxFrom,
  type XpEvent,
} from "@/lib/xp";
import type { AccountUser } from "@/lib/accounts";
import {
  SCHEMA_MISSING_MESSAGE,
  isMissingSchemaError,
} from "@/lib/supabase/config";
import {
  requireOwner,
  requireSession,
  type SessionContext,
} from "@/lib/server/session";
import { partnerOf } from "@/lib/server/accounts";

/* ---- error helpers --------------------------------------------------------- */

function raise(error: PostgrestError | null): void {
  if (!error) return;
  if (isMissingSchemaError(error)) throw new Error(SCHEMA_MISSING_MESSAGE);
  throw new Error(error.message || "Supabase request failed.");
}

async function ownerCtx(userId: string): Promise<SessionContext> {
  return requireOwner(userId);
}

async function signedIn(): Promise<SessionContext> {
  return requireSession();
}

/* ---- row shapes ------------------------------------------------------------ */

interface HabitRow {
  id: number | string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_key: string;
}

interface LogRow {
  user_id: string;
  habit_id: number | string;
  date: string;
  status: string;
}

interface TxnRow {
  id: string;
  name: string;
  category: string;
  amount: string | number;
  type: string;
  date: string;
  created_at: string | number;
}

interface XpRow {
  key: string;
  label: string;
  amount: number;
  day: string;
  at_ms: string | number;
}

function habitRow(row: HabitRow): HabitRecord {
  return {
    id: Number(row.id),
    userId: row.user_id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    sortOrder: Number(row.sort_order),
    createdKey: row.created_key,
  };
}

function logRow(row: LogRow): LogRecord {
  return {
    userId: row.user_id,
    habitId: Number(row.habit_id),
    date: row.date,
    status: row.status as LogStatusValue,
  };
}

function txnRow(row: TxnRow): Txn {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: Number(row.amount),
    type: row.type as Txn["type"],
    date: row.date,
    createdAt: Number(row.created_at),
  };
}

function xpRow(row: XpRow): XpEvent {
  return {
    key: row.key,
    label: row.label,
    amount: Number(row.amount),
    day: row.day,
    at: Number(row.at_ms),
  };
}

/* ---- profiles / fresh defaults --------------------------------------------- */

export async function ensureProfile(): Promise<void> {}

// Mirrors DEFAULT_HABITS in src/lib/visuals.tsx (icon + color keys must exist
// there so every seeded ritual renders a real icon).
const DEFAULT_HABITS: { name: string; icon: string; color: string }[] = [
  { name: "Study today", icon: "book-open", color: "violet" },
  { name: "Go to school", icon: "school", color: "sky" },
  { name: "Go to coaching", icon: "graduation-cap", color: "amber" },
  { name: "Eat breakfast", icon: "coffee", color: "orange" },
  { name: "Eat lunch", icon: "utensils-crossed", color: "emerald" },
  { name: "Eat dinner", icon: "soup", color: "rose" },
  { name: "Sleep before 3:00 AM", icon: "moon-star", color: "indigo" },
];

/** Seed the starter rituals exactly once per account. */
export async function ensureSeeded(userId: string): Promise<void> {
  const { supabase } = await ownerCtx(userId);

  const profile = await supabase
    .from("profiles")
    .select("seeded")
    .eq("id", userId)
    .maybeSingle();
  raise(profile.error);
  if ((profile.data as { seeded?: boolean } | null)?.seeded) return;

  const existing = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", userId)
    .limit(1);
  raise(existing.error);

  if (!existing.data?.length) {
    const today = dateKey(new Date());
    const insert = await supabase.from("habits").insert(
      DEFAULT_HABITS.map((habit, index) => ({
        user_id: userId,
        name: habit.name,
        icon: habit.icon,
        color: habit.color,
        sort_order: index + 1,
        created_key: today,
      }))
    );
    raise(insert.error);
  }

  const update = await supabase
    .from("profiles")
    .update({ seeded: true, updated_at: new Date().toISOString() })
    .eq("id", userId);
  raise(update.error);
}

/* ---- habits + logs ---------------------------------------------------------- */

async function readHabits(
  ctx: SessionContext,
  userId: string
): Promise<HabitRecord[]> {
  const { data, error } = await ctx.supabase
    .from("habits")
    .select("id,user_id,name,icon,color,sort_order,created_key")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  raise(error);
  return ((data ?? []) as HabitRow[]).map(habitRow);
}

async function readLogs(
  ctx: SessionContext,
  userId: string
): Promise<LogRecord[]> {
  const { data, error } = await ctx.supabase
    .from("habit_logs")
    .select("user_id,habit_id,date,status")
    .eq("user_id", userId)
    .order("date", { ascending: true });
  raise(error);
  return ((data ?? []) as LogRow[]).map(logRow);
}

export async function getHabits(userId: string): Promise<HabitRecord[]> {
  return readHabits(await ownerCtx(userId), userId);
}

export async function getLogs(userId: string): Promise<LogRecord[]> {
  return readLogs(await ownerCtx(userId), userId);
}

export async function createHabit(
  userId: string,
  input: { name: string; icon: string; color: string }
): Promise<HabitRecord> {
  const { supabase } = await ownerCtx(userId);
  const tail = await supabase
    .from("habits")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1);
  raise(tail.error);
  const sortOrder =
    Number((tail.data?.[0] as { sort_order?: number } | undefined)?.sort_order ?? 0) + 1;

  const inserted = await supabase
    .from("habits")
    .insert({
      user_id: userId,
      name: input.name,
      icon: input.icon,
      color: input.color,
      sort_order: sortOrder,
      created_key: dateKey(new Date()),
    })
    .select("id,user_id,name,icon,color,sort_order,created_key")
    .single();
  raise(inserted.error);
  return habitRow(inserted.data as HabitRow);
}

export async function updateHabit(
  userId: string,
  habitId: number,
  patch: { name?: string; icon?: string; color?: string }
): Promise<void> {
  const { supabase } = await ownerCtx(userId);
  if (!Object.keys(patch).length) return;
  const { error } = await supabase
    .from("habits")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", habitId);
  raise(error);
}

export async function deleteHabit(userId: string, habitId: number): Promise<void> {
  const { supabase } = await ownerCtx(userId);
  const logs = await supabase
    .from("habit_logs")
    .delete()
    .eq("user_id", userId)
    .eq("habit_id", habitId);
  raise(logs.error);
  const habit = await supabase
    .from("habits")
    .delete()
    .eq("user_id", userId)
    .eq("id", habitId);
  raise(habit.error);
}

export async function setLog(
  userId: string,
  habitId: number,
  date: string,
  status: LogStatusValue | null
): Promise<void> {
  const { supabase } = await ownerCtx(userId);
  const owns = await supabase
    .from("habits")
    .select("id")
    .eq("user_id", userId)
    .eq("id", habitId)
    .limit(1);
  raise(owns.error);
  if (!owns.data?.length) return;

  if (status === null) {
    const { error } = await supabase
      .from("habit_logs")
      .delete()
      .eq("user_id", userId)
      .eq("habit_id", habitId)
      .eq("date", date);
    raise(error);
    return;
  }

  const { error } = await supabase.from("habit_logs").upsert(
    {
      user_id: userId,
      habit_id: habitId,
      date,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,habit_id,date" }
  );
  raise(error);
}

/* ---- wallet ---------------------------------------------------------------- */

export async function getTxns(userId: string): Promise<Txn[]> {
  const { supabase } = await ownerCtx(userId);
  const { data, error } = await supabase
    .from("wallet_txns")
    .select("id,name,category,amount,type,date,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  raise(error);
  return ((data ?? []) as TxnRow[]).map(txnRow);
}

export async function createTxn(userId: string, txn: Txn): Promise<Txn> {
  const { supabase } = await ownerCtx(userId);
  const { data, error } = await supabase
    .from("wallet_txns")
    .upsert(
      {
        id: txn.id,
        user_id: userId,
        name: txn.name,
        category: txn.category,
        amount: txn.amount.toFixed(2),
        type: txn.type,
        date: txn.date,
        created_at: txn.createdAt,
      },
      { onConflict: "id" }
    )
    .select("id,name,category,amount,type,date,created_at")
    .single();
  raise(error);
  return txnRow(data as TxnRow);
}

export async function updateTxn(
  userId: string,
  id: string,
  patch: Partial<Omit<Txn, "id" | "createdAt">>
): Promise<void> {
  const { supabase } = await ownerCtx(userId);
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.category !== undefined) set.category = patch.category;
  if (patch.amount !== undefined) set.amount = Number(patch.amount).toFixed(2);
  if (patch.type !== undefined) set.type = patch.type;
  if (patch.date !== undefined) set.date = patch.date;
  if (!Object.keys(set).length) return;
  const { error } = await supabase
    .from("wallet_txns")
    .update(set)
    .eq("user_id", userId)
    .eq("id", id);
  raise(error);
}

export async function deleteTxn(userId: string, id: string): Promise<void> {
  const { supabase } = await ownerCtx(userId);
  const { error } = await supabase
    .from("wallet_txns")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  raise(error);
}

/* ---- XP, levels, quests, achievements -------------------------------------- */

async function readXpEvents(
  ctx: SessionContext,
  userId: string
): Promise<XpEvent[]> {
  const { data, error } = await ctx.supabase
    .from("xp_events")
    .select("key,label,amount,day,at_ms")
    .eq("user_id", userId)
    .order("at_ms", { ascending: true });
  raise(error);
  return ((data ?? []) as XpRow[]).map(xpRow);
}

export async function getXpEvents(userId: string): Promise<XpEvent[]> {
  // Both owners may read either XP ledger — the tracker is shared by design.
  return readXpEvents(await signedIn(), userId);
}

export interface ServerGrant {
  key: string;
  label: string;
  amount: number;
}

async function syncProgress(
  ctx: SessionContext,
  userId: string
): Promise<number> {
  const { data, error } = await ctx.supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId);
  raise(error);
  const totalXp = ((data ?? []) as { amount: number }[]).reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  );
  const level = levelInfo(totalXp).level;
  const saved = await ctx.supabase.from("progress_state").upsert(
    {
      user_id: userId,
      total_xp: totalXp,
      level,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  raise(saved.error);
  return totalXp;
}

/**
 * Build the complete set of XP awards that the caller has actually earned.
 * Client-supplied labels and amounts are intentionally ignored: the database
 * state is authoritative, which prevents a signed-in user from forging XP by
 * calling the route directly.
 */
async function validateXpGrants(
  ctx: SessionContext,
  userId: string,
  proposed: ServerGrant[],
  day: string
): Promise<ServerGrant[]> {
  const { supabase } = ctx;
  const [habits, logs, events, wallet] = await Promise.all([
    readHabits(ctx, userId),
    readLogs(ctx, userId),
    readXpEvents(ctx, userId),
    supabase
      .from("wallet_txns")
      .select("id,name,category,amount,type,date,created_at")
      .eq("user_id", userId),
  ]);
  raise(wallet.error);
  const txns = ((wallet.data ?? []) as TxnRow[]).map(txnRow);

  const permitted = new Map<string, ServerGrant>();
  const completedToday = new Set(
    logs
      .filter((log) => log.date === day && log.status === "completed")
      .map((log) => log.habitId)
  );
  const eligibleToday = habits.filter((habit) => habit.createdKey <= day);

  for (const habit of eligibleToday) {
    if (!completedToday.has(habit.id)) continue;
    permitted.set(`habit:${habit.id}:${day}`, {
      key: `habit:${habit.id}:${day}`,
      label: `Ritual complete · ${habit.name}`,
      amount: XP_RULES.habitCompleted,
    });
  }

  if (
    eligibleToday.length > 0 &&
    eligibleToday.every((habit) => completedToday.has(habit.id))
  ) {
    permitted.set(`perfect:${day}`, {
      key: `perfect:${day}`,
      label: "Perfect day bonus",
      amount: XP_RULES.perfectDay,
    });
  }

  const claimedKeys = new Set(events.map((event) => event.key));
  const earnedQuests = evaluateQuests(
    questCtxFrom({ habits, logs }, txns),
    claimedKeys
  ).ready;
  for (const quest of earnedQuests) permitted.set(quest.key, quest);

  const incomeByKey = new Map(
    txns
      .filter((txn) => txn.type === "income" && txn.date === day)
      .map((txn) => [
        `income:${txn.id}`,
        {
          key: `income:${txn.id}`,
          label: `Added income · ${txn.name}`,
          amount: XP_RULES.walletIncome,
        } satisfies ServerGrant,
      ])
  );
  let incomeSlots = Math.max(
    0,
    XP_RULES.walletIncomeDailyCap -
      events.filter(
        (event) => event.day === day && event.key.startsWith("income:")
      ).length
  );

  const accepted: ServerGrant[] = [];
  const seen = new Set<string>();
  for (const candidate of proposed) {
    if (
      !candidate ||
      typeof candidate.key !== "string" ||
      candidate.key.length === 0 ||
      candidate.key.length > 200 ||
      seen.has(candidate.key) ||
      claimedKeys.has(candidate.key)
    ) {
      continue;
    }
    seen.add(candidate.key);

    const earned = permitted.get(candidate.key);
    if (earned) {
      accepted.push(earned);
      continue;
    }

    const income = incomeByKey.get(candidate.key);
    if (income && incomeSlots > 0) {
      accepted.push(income);
      incomeSlots -= 1;
    }
  }
  return accepted;
}

/** Idempotent, server-validated XP grants. */
export async function grantXp(
  userId: string,
  grants: ServerGrant[],
  day: string,
  nowMs: number
): Promise<{ gained: XpEvent[]; totalXp: number }> {
  const ctx = await ownerCtx(userId);
  const { supabase } = ctx;

  const validated = await validateXpGrants(ctx, userId, grants, day);
  const clean = validated.map((grant) => ({
    user_id: userId,
    key: grant.key,
    label: grant.label.slice(0, 200),
    amount: grant.amount,
    day,
    at_ms: nowMs,
  }));

  let gained: XpEvent[] = [];
  if (clean.length) {
    // `ignoreDuplicates` → ON CONFLICT DO NOTHING, so a retried or
    // double-clicked grant can never award the same key twice.
    const inserted = await supabase
      .from("xp_events")
      .upsert(clean, { onConflict: "user_id,key", ignoreDuplicates: true })
      .select("key,label,amount,day,at_ms");
    raise(inserted.error);
    gained = ((inserted.data ?? []) as XpRow[]).map(xpRow);

    const questRows = gained
      .filter((event) => event.key.startsWith("quest:"))
      .map((event) => {
        const parts = event.key.split(":");
        return {
          user_id: userId,
          event_key: event.key,
          quest_id: parts[1] ?? "quest",
          period_key: parts.slice(2).join(":") || day,
          xp_awarded: event.amount,
          claimed_at: event.at,
        };
      });
    if (questRows.length) {
      const res = await supabase
        .from("quest_claims")
        .upsert(questRows, { onConflict: "user_id,event_key", ignoreDuplicates: true });
      raise(res.error);
    }

    const achievementRows = gained
      .filter(
        (event) =>
          event.key.startsWith("achievement:") || event.key.startsWith("ach:")
      )
      .map((event) => ({
        user_id: userId,
        achievement_id: event.key.split(":").slice(1).join(":") || event.key,
        unlocked_at: event.at,
        metadata: { label: event.label, amount: event.amount },
      }));
    if (achievementRows.length) {
      const res = await supabase.from("achievements").upsert(achievementRows, {
        onConflict: "user_id,achievement_id",
        ignoreDuplicates: true,
      });
      raise(res.error);
    }
  }

  const totalXp = await syncProgress(ctx, userId);
  return { gained, totalXp };
}

async function readProgress(
  ctx: SessionContext,
  userId: string
): Promise<{ totalXp: number; level: number }> {
  const { data, error } = await ctx.supabase
    .from("progress_state")
    .select("total_xp,level")
    .eq("user_id", userId)
    .maybeSingle();
  raise(error);
  const row = data as { total_xp: number; level: number } | null;
  if (row) return { totalXp: Number(row.total_xp), level: Number(row.level) };

  const events = await ctx.supabase
    .from("xp_events")
    .select("amount")
    .eq("user_id", userId);
  raise(events.error);
  const totalXp = ((events.data ?? []) as { amount: number }[]).reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );
  return { totalXp, level: levelInfo(totalXp).level };
}

export async function getProgressState(userId: string) {
  return readProgress(await signedIn(), userId);
}

export async function getOwnedProgressDetails(userId: string) {
  const { supabase } = await ownerCtx(userId);
  const [quests, achievements] = await Promise.all([
    supabase
      .from("quest_claims")
      .select("user_id,event_key,quest_id,period_key,xp_awarded,claimed_at")
      .eq("user_id", userId),
    supabase
      .from("achievements")
      .select("user_id,achievement_id,unlocked_at,metadata")
      .eq("user_id", userId),
  ]);
  raise(quests.error);
  raise(achievements.error);
  return {
    quests: (quests.data ?? []) as unknown[],
    achievements: (achievements.data ?? []) as unknown[],
  };
}

/* ---- controlled partner view ---------------------------------------------- */

export interface PartnerDataSnapshot {
  user: AccountUser;
  slice: { seeded: boolean; habits: HabitRecord[]; logs: LogRecord[] };
  xp: { totalXp: number; level?: number; events: XpEvent[] };
}

/**
 * The shared, read-only slice of the partner: consistency (habits + logs) and
 * their Level / XP. Wallet, quests and achievements are never included.
 */
export async function getPartnerSnapshot(): Promise<PartnerDataSnapshot | null> {
  const ctx = await signedIn();
  const partner = await partnerOf(ctx.user.id);
  if (!partner) return null;
  const [habits, logs, events, progress] = await Promise.all([
    readHabits(ctx, partner.id),
    readLogs(ctx, partner.id),
    readXpEvents(ctx, partner.id),
    readProgress(ctx, partner.id),
  ]);
  return {
    user: partner,
    slice: { seeded: true, habits, logs },
    xp: { totalXp: progress.totalXp, level: progress.level, events },
  };
}

/* ---- fresh-start import policy -------------------------------------------- */

export interface ImportPayload {
  habits?: HabitRecord[];
  logs?: LogRecord[];
  txns?: Txn[];
  xpEvents?: XpEvent[];
}

/** Existing browser data is intentionally not imported into the fresh install. */
export async function importLegacy() {
  return { habits: 0, logs: 0, txns: 0, xpEvents: 0, reset: true };
}

/* ---- backup / restore ------------------------------------------------------ */

export interface BackupDump {
  format: "momentum-backup";
  version: 1;
  exportedAt: string;
  user: { userId: string; name: string; color: string };
  profile: Record<string, unknown> | null;
  habits: HabitRecord[];
  logs: LogRecord[];
  txns: Txn[];
  xpEvents: XpEvent[];
}

export async function exportUser(userId: string): Promise<BackupDump> {
  const ctx = await ownerCtx(userId);
  const [habits, logs, txns, events] = await Promise.all([
    readHabits(ctx, userId),
    readLogs(ctx, userId),
    getTxns(userId),
    readXpEvents(ctx, userId),
  ]);
  return {
    format: "momentum-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    user: { userId, name: ctx.user.name, color: ctx.user.color },
    profile: null,
    habits,
    logs,
    txns,
    xpEvents: events,
  };
}

/** Replace only the caller's own rows. RLS makes it impossible to touch the partner. */
export async function restoreUser(userId: string, dump: BackupDump) {
  const ctx = await ownerCtx(userId);
  const { supabase } = ctx;

  for (const table of [
    "habit_logs",
    "wallet_txns",
    "xp_events",
    "quest_claims",
    "achievements",
    "habits",
  ]) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    raise(error);
  }

  let habitIds = new Set<number>();
  if (dump.habits.length) {
    const rows = dump.habits.slice(0, 500).map((habit) => {
      const id = Number(habit.id);
      habitIds.add(id);
      return {
        id,
        user_id: userId,
        name: String(habit.name).slice(0, 200),
        icon: String(habit.icon).slice(0, 60),
        color: String(habit.color).slice(0, 40),
        sort_order: Number(habit.sortOrder ?? id) || id,
        created_key: String(habit.createdKey ?? dateKey(new Date())),
      };
    });
    const res = await supabase
      .from("habits")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
    raise(res.error);
    // Keep the shared identity ahead of the restored ids.
    await supabase.rpc("momentum_sync_habits_sequence");

    // `ignoreDuplicates` silently skips any id that is already taken — for
    // example by the partner's habit. Re-read what this account actually owns
    // so a restored log can never be attached to somebody else's habit row.
    const owned = await supabase
      .from("habits")
      .select("id")
      .eq("user_id", userId);
    raise(owned.error);
    habitIds = new Set(
      ((owned.data ?? []) as { id: number | string }[]).map((row) => Number(row.id))
    );
  }

  const logs = dump.logs
    .slice(0, 20000)
    .filter((log) => habitIds.has(Number(log.habitId)))
    .map((log) => ({
      user_id: userId,
      habit_id: Number(log.habitId),
      date: String(log.date),
      status: log.status === "skipped" ? "skipped" : "completed",
    }));
  if (logs.length) {
    const res = await supabase
      .from("habit_logs")
      .upsert(logs, { onConflict: "user_id,habit_id,date", ignoreDuplicates: true });
    raise(res.error);
  }

  const txns = dump.txns.slice(0, 20000).map((txn) => ({
    id: String(txn.id),
    user_id: userId,
    name: String(txn.name).slice(0, 200),
    category: String(txn.category).slice(0, 60),
    amount: Number(txn.amount || 0).toFixed(2),
    type: txn.type === "income" ? "income" : "expense",
    date: String(txn.date),
    created_at: Number(txn.createdAt) || Date.now(),
  }));
  if (txns.length) {
    const res = await supabase
      .from("wallet_txns")
      .upsert(txns, { onConflict: "id", ignoreDuplicates: true });
    raise(res.error);
  }

  const events = dump.xpEvents.slice(0, 20000).map((event) => ({
    user_id: userId,
    key: String(event.key).slice(0, 200),
    label: String(event.label).slice(0, 200),
    amount: Math.trunc(Number(event.amount) || 0),
    day: String(event.day),
    at_ms: Number(event.at) || Date.now(),
  }));
  if (events.length) {
    const res = await supabase
      .from("xp_events")
      .upsert(events, { onConflict: "user_id,key", ignoreDuplicates: true });
    raise(res.error);
  }

  await syncProgress(ctx, userId);
}

/** Remove every row belonging to the given habit ids (used by tests/tools). */
export async function purgeHabits(userId: string, ids: number[]) {
  const { supabase } = await ownerCtx(userId);
  if (!ids.length) return;
  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);
  raise(error);
}
