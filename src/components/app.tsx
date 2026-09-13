"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDashed,
  Flame,
  KeyRound,
  ListChecks,
  LogOut,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { HabitDTO, HabitRecord } from "@/lib/types";
import { dateKey } from "@/lib/dates";
import {
  buildDashboard,
  createHabitInSlice,
  deleteHabitInSlice,
  setLog,
  updateHabitInSlice,
  type UserSlice,
} from "@/lib/store";
import { type AccountUser } from "@/lib/accounts";
import { api, apiWithWakeRetry } from "@/lib/api";
import { txnId, type Txn, type TxnType } from "@/lib/wallet";
import {
  XP_RULES,
  evaluateQuests,
  levelInfo,
  notifyXpChanged,
  questCtxFrom,
  walletIncomeGrant,
  xpSummaryFrom,
  type QuestState,
  type XpEvent,
  type XpGrant,
  type XpSummary,
} from "@/lib/xp";
import CountUp from "@/components/count-up";
import ProgressRing from "@/components/progress-ring";
import Confetti from "@/components/confetti";
import Heatmap from "@/components/heatmap";
import WeeklyBars from "@/components/weekly-bars";
import HabitRow from "@/components/habit-row";
import HabitModal, { type HabitFormValues } from "@/components/habit-modal";
import PasswordModal from "@/components/password-modal";
import PartnerCard from "@/components/partner-card";
import DailyQuote from "@/components/daily-quote";
import WalletClient from "@/components/wallet/wallet-client";
import type { TxnFormValues } from "@/components/wallet/transaction-modal";
import LevelingClient from "@/components/leveling/leveling-client";
import XpFeedback from "@/components/leveling/xp-feedback";

type View = "habits" | "wallet" | "leveling";

interface XpState {
  totalXp: number;
  events: XpEvent[];
}

interface PartnerData {
  user: AccountUser;
  slice: UserSlice;
  xp: XpState;
}

interface Bootstrap {
  me: AccountUser;
  slice: UserSlice;
  txns: Txn[];
  xp: XpState;
  partner: PartnerData | null;
}

export default function App() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "login" | "error" | "ready">("loading");
  const [me, setMe] = useState<AccountUser | null>(null);
  const [view, setView] = useState<View>("habits");
  /** Increment to retry the initial session restore. */
  const [attempt, setAttempt] = useState(0);
  /** Account that was signed in when hydration failed — retried from the error screen. */
  const [pendingUser, setPendingUser] = useState<AccountUser | null>(null);

  // ---- data (PostgreSQL is the source of truth; this state mirrors it) ------
  const [slice, setSlice] = useState<UserSlice | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [xp, setXp] = useState<XpState>({ totalXp: 0, events: [] });
  const [partner, setPartner] = useState<PartnerData | null>(null);

  const hydrate = useCallback(async (_user: AccountUser) => {
    // Fresh install: old browser/localStorage progress is intentionally
    // ignored so deleted habits, wallet records, and XP cannot reappear.
    const boot = await apiWithWakeRetry<Bootstrap>("/api/bootstrap");
    setSlice(boot.slice);
    setTxns(boot.txns);
    setXp(boot.xp);
    setPartner(boot.partner);
  }, []);

  // ---- restore session on load ----------------------------------------------
  // Signed-out is a normal state (login). Only *network/server* failures go
  // to the error screen — a signed-in user never gets bounced to login just
  // because the server hiccuped or was still waking up.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { user } = await apiWithWakeRetry<{ user: AccountUser | null }>(
          "/api/auth/me"
        );
        if (!alive) return;
        if (user) {
          await hydrate(user);
          if (!alive) return;
          setMe(user);
          setPhase("ready");
        } else {
          setPhase("login");
        }
      } catch {
        if (alive) setPhase("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrate, attempt]);

  const handleSignedIn = async (user: AccountUser) => {
    setPhase("loading");
    setPendingUser(user);
    try {
      await hydrate(user);
      setMe(user);
      setView("habits");
      setPendingUser(null);
      setPhase("ready");
    } catch (e) {
      console.error(e);
      setPhase("error");
    }
  };

  const handleRetry = () => {
    setPhase("loading");
    if (pendingUser) {
      void handleSignedIn(pendingUser);
    } else {
      setAttempt((a) => a + 1);
    }
  };

  // If a preview/serverless runtime is cold, keep trying automatically. The
  // request helper has already waited through its short backoff by this point.
  useEffect(() => {
    if (phase !== "error") return;
    const timer = window.setTimeout(() => {
      setPhase("loading");
      if (pendingUser) void handleSignedIn(pendingUser);
      else setAttempt((a) => a + 1);
    }, 3000);
    return () => window.clearTimeout(timer);
    // handleSignedIn intentionally omitted: phase/pendingUser are the retry state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pendingUser]);

  const handleSignOut = async () => {
    try {
      await api("/api/auth/signout", { method: "POST" });
    } catch {
      /* sign out locally regardless */
    }
    setMe(null);
    setSlice(null);
    setPendingUser(null);
    setView("habits");
    setPhase("login");
    router.replace("/login");
  };

  /* ============================ XP control center ============================ */

  const grantAndToast = useCallback(
    async (grants: XpGrant[]) => {
      if (!me || grants.length === 0) return;
      const before = levelInfo(xp.totalXp);
      try {
        const res = await api<{ gained: XpEvent[]; totalXp: number }>(
          "/api/xp/grant",
          { method: "POST", body: JSON.stringify({ grants }) }
        );
        if (!res.gained.length) return;
        const after = levelInfo(res.totalXp);
        setXp((prev) => ({
          totalXp: res.totalXp,
          events: [...prev.events, ...res.gained],
        }));
        notifyXpChanged(
          me.id,
          res.gained,
          after.level > before.level
            ? { from: before.level, to: after.level, rank: after.rank }
            : null
        );
      } catch (e) {
        console.error("XP grant failed:", e);
      }
    },
    [me, xp.totalXp]
  );

  /** Evaluate quests against fresh data and claim anything newly completed. */
  const syncQuests = useCallback(
    async (sliceOverride?: UserSlice, txnsOverride?: Txn[]) => {
      const s = sliceOverride ?? slice;
      if (!me || !s) return;
      const ctx = questCtxFrom(s, txnsOverride ?? txns);
      const { ready } = evaluateQuests(ctx, new Set(xp.events.map((e) => e.key)));
      if (ready.length) await grantAndToast(ready);
    },
    [me, slice, txns, xp.events, grantAndToast]
  );

  const refreshPartner = useCallback(async () => {
    if (!me) return;
    try {
      const { partner: p } = await api<{ partner: PartnerData | null }>(
        "/api/partner"
      );
      setPartner(p);
    } catch {
      /* partner pulse stays as-is */
    }
  }, [me]);

  /* ============================ habit mutations ============================ */

  const handleToggle = (habit: HabitDTO, status: "completed" | "skipped" | null) => {
    if (!me || !slice) return;
    const today = dateKey(new Date());
    const prev = slice;
    const next = setLog(prev, me.id, habit.id, today, status);
    setSlice(next);
    // Build the candidate awards optimistically, but do not submit them until
    // the log itself is persisted. The XP endpoint independently validates
    // every award against Supabase, so this ordering avoids a write race.
    const grants: XpGrant[] = [];
    if (status === "completed" && habit.todayStatus !== "completed") {
      grants.push({
        key: `habit:${habit.id}:${today}`,
        label: `Ritual complete · ${habit.name}`,
        amount: XP_RULES.habitCompleted,
      });
    }
    const allDone =
      next.habits.length > 0 &&
      next.habits.every((h) =>
        next.logs.some(
          (l) => l.habitId === h.id && l.date === today && l.status === "completed"
        )
      );
    if (allDone) {
      grants.push({
        key: `perfect:${today}`,
        label: "Perfect day bonus",
        amount: XP_RULES.perfectDay,
      });
    }

    api(`/api/habits/${habit.id}/log`, {
      method: "PUT",
      body: JSON.stringify({ date: today, status }),
    })
      .then(async () => {
        if (grants.length) await grantAndToast(grants);
        await syncQuests(next, txns);
      })
      .catch((e) => {
        console.error("Saving check-off failed — reverting:", e);
        setSlice(prev);
      });
  };

  const handleCreateHabit = (values: HabitFormValues) => {
    if (!me || !slice) return;
    const prev = slice;
    const optimistic = createHabitInSlice(prev, me.id, values);
    const tempId = optimistic.habits[optimistic.habits.length - 1]?.id;
    setSlice(optimistic);
    api<{ habit: HabitRecord }>("/api/habits", {
      method: "POST",
      body: JSON.stringify(values),
    })
      .then(({ habit }) => {
        // Adopt the id the database actually assigned. Without this a later
        // check-off would be saved against a row that does not exist.
        if (!habit || habit.id === tempId) return;
        setSlice((cur) =>
          cur
            ? {
                ...cur,
                habits: cur.habits.map((h) => (h.id === tempId ? habit : h)),
                logs: cur.logs.map((l) =>
                  l.habitId === tempId ? { ...l, habitId: habit.id } : l
                ),
              }
            : cur
        );
      })
      .catch((e) => {
        console.error("Creating habit failed — reverting:", e);
        setSlice(prev);
      });
  };

  const handleUpdateHabit = (habitId: number, values: HabitFormValues) => {
    if (!slice) return;
    const prev = slice;
    setSlice(updateHabitInSlice(prev, habitId, values));
    api(`/api/habits/${habitId}`, { method: "PATCH", body: JSON.stringify(values) }).catch(
      (e) => {
        console.error("Updating habit failed — reverting:", e);
        setSlice(prev);
      }
    );
  };

  const handleDeleteHabit = (habitId: number) => {
    if (!slice) return;
    const prev = slice;
    setSlice(deleteHabitInSlice(prev, habitId));
    api(`/api/habits/${habitId}`, { method: "DELETE" }).catch((e) => {
      console.error("Deleting habit failed — reverting:", e);
      setSlice(prev);
    });
  };

  /* ============================ wallet mutations ============================ */

  const handleSubmitTxn = (values: TxnFormValues, editing: Txn | null) => {
    if (!me || !slice) return;
    const prev = txns;
    if (editing) {
      const next = txns.map((t) => (t.id === editing.id ? { ...t, ...values } : t));
      setTxns(next);
      api(`/api/wallet/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      })
        .then(() => syncQuests(slice, next))
        .catch((e) => {
          console.error("Updating transaction failed — reverting:", e);
          setTxns(prev);
        });
      return;
    }
    const id = txnId();
    const txn: Txn = { id, createdAt: Date.now(), ...values };
    const next = [txn, ...txns];
    setTxns(next);
    api("/api/wallet", { method: "POST", body: JSON.stringify({ txn }) })
      .then(async () => {
        // Ascend: inserting money earns XP (first few income entries per day).
        // The transaction must exist in Supabase before the server validates it.
        if (values.type === "income") {
          const g = walletIncomeGrant(xp.events, id, values.name);
          if (g) await grantAndToast([g]);
        }
        await syncQuests(slice, next);
      })
      .catch((e) => {
        console.error("Adding transaction failed — reverting:", e);
        setTxns(prev);
      });
  };

  const handleDeleteTxn = (t: Txn) => {
    const prev = txns;
    setTxns(prev.filter((x) => x.id !== t.id));
    api(`/api/wallet/${t.id}`, { method: "DELETE" }).catch((e) => {
      console.error("Deleting transaction failed — reverting:", e);
      setTxns(prev);
    });
  };

  /* ============================ render ============================ */

  if (phase === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0a0a0c]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="grid size-12 place-items-center rounded-2xl bg-lime-400 text-lime-950 shadow-[0_0_40px_rgba(163,230,53,0.35)]"
        >
          <Check size={26} strokeWidth={3.2} />
        </motion.div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="grain relative grid min-h-screen place-items-center bg-[#0a0a0c] px-4">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="ambient-blob absolute -top-32 left-[15%] h-[380px] w-[520px] rounded-full bg-lime-400/[0.06] blur-[120px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] bg-white/[0.03] p-7 text-center backdrop-blur"
        >
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
            <RefreshCw size={22} />
          </div>
          <h2 className="font-display mt-4 text-xl font-semibold tracking-tight text-white">
            Couldn’t reach your space
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            The server may still be waking up. Your account and history are
            safe — just try again in a moment.
          </p>
          <button
            onClick={handleRetry}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 py-3 text-sm font-semibold text-lime-950 transition hover:bg-lime-300 active:scale-[0.98]"
          >
            <RefreshCw size={15} />
            Try again
          </button>
          <button
            onClick={handleSignOut}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-200"
          >
            <LogOut size={13} />
            Back to sign in
          </button>
        </motion.div>
      </div>
    );
  }

  if (!me || !slice) {
    return (
      <div className="grain relative">
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="ambient-blob absolute -top-32 left-[15%] h-[380px] w-[520px] rounded-full bg-lime-400/[0.06] blur-[120px]" />
          <div
            className="ambient-blob absolute right-[10%] bottom-[10%] h-[320px] w-[420px] rounded-full bg-sky-400/[0.05] blur-[120px]"
            style={{ animationDelay: "-5s" }}
          />
        </div>
        <SignedOutRedirect />
      </div>
    );
  }

  const xpSummary = xpSummaryFrom(xp.totalXp, xp.events);
  const partnerXpSummary = partner ? xpSummaryFrom(partner.xp.totalXp, partner.xp.events) : null;
  const questStates = evaluateQuests(
    questCtxFrom(slice, txns),
    new Set(xp.events.map((e) => e.key))
  ).states;

  return (
    <>
      {view === "wallet" ? (
        <WalletClient
          txns={txns}
          onSubmitTxn={handleSubmitTxn}
          onDeleteTxn={handleDeleteTxn}
          onBack={() => setView("habits")}
          onOpenLeveling={() => setView("leveling")}
        />
      ) : view === "leveling" ? (
        <LevelingClient
          me={me}
          summary={xpSummary}
          quests={questStates}
          partnerUser={partner ? partner.user : null}
          partnerSummary={partnerXpSummary}
          onSyncQuests={() => void syncQuests()}
          onOpenHabits={() => setView("habits")}
          onOpenWallet={() => setView("wallet")}
        />
      ) : (
        <Dashboard
          me={me}
          slice={slice}
          partner={partner}
          xpSummary={xpSummary}
          partnerXpSummary={partnerXpSummary}
          onToggle={handleToggle}
          onCreateHabit={handleCreateHabit}
          onUpdateHabit={handleUpdateHabit}
          onDeleteHabit={handleDeleteHabit}
          onRefreshPartner={refreshPartner}
          onSignOut={handleSignOut}
          onOpenWallet={() => setView("wallet")}
          onOpenLeveling={() => setView("leveling")}
        />
      )}
      {/* global +XP toasts & level-up celebration, above every view */}
      <XpFeedback userId={me.id} />
    </>
  );
}

/* ========================================================================== */
/*  Dashboard                                                                  */
/* ========================================================================== */

type Filter = "all" | "left" | "done" | "skipped";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "left", label: "To do" },
  { key: "done", label: "Done" },
  { key: "skipped", label: "Skipped" },
];

function Dashboard({
  me,
  slice,
  partner,
  xpSummary,
  partnerXpSummary,
  onToggle,
  onCreateHabit,
  onUpdateHabit,
  onDeleteHabit,
  onRefreshPartner,
  onSignOut,
  onOpenWallet,
  onOpenLeveling,
}: {
  me: AccountUser;
  slice: UserSlice;
  partner: PartnerData | null;
  xpSummary: XpSummary;
  partnerXpSummary: XpSummary | null;
  onToggle: (habit: HabitDTO, status: "completed" | "skipped" | null) => void;
  onCreateHabit: (values: HabitFormValues) => void;
  onUpdateHabit: (habitId: number, values: HabitFormValues) => void;
  onDeleteHabit: (habitId: number) => void;
  onRefreshPartner: () => void;
  onSignOut: () => void;
  onOpenWallet: () => void;
  onOpenLeveling: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [editing, setEditing] = useState<HabitDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [tick, setTick] = useState(0);

  // ---- derived dashboard ----------------------------------------------------
  const data = useMemo(
    () => buildDashboard(me, slice, partner?.slice ?? null, partner?.user ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me, slice, partner, tick]
  );

  // Recompute on refocus / every 10 minutes — keeps the partner pulse fresh
  // (they may have tracked from their own account) and handles day rollover.
  useEffect(() => {
    const onFocus = () => {
      setTick((t) => t + 1);
      onRefreshPartner();
    };
    window.addEventListener("focus", onFocus);
    const t = setInterval(onFocus, 10 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- log toggling (delegated — controller persists + awards XP) ------------
  const toggle = (habit: HabitDTO, status: "completed" | "skipped" | null) => {
    onToggle(habit, status);
  };

  // ---- CRUD ------------------------------------------------------------------
  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (h: HabitDTO) => {
    setEditing(h);
    setModalOpen(true);
  };

  const submitModal = (values: HabitFormValues) => {
    setSaving(true);
    if (editing) onUpdateHabit(editing.id, values);
    else onCreateHabit(values);
    setSaving(false);
    setModalOpen(false);
  };

  const removeHabit = (h: HabitDTO) => {
    onDeleteHabit(h.id);
  };

  // ---- celebration ------------------------------------------------------------
  const { pct, total, completed, left } = data.totals;
  const prevPct = useRef(pct);
  useEffect(() => {
    const flag = `momentum:celebrated:${data.today}`;
    if (total > 0 && pct === 100) {
      const already = typeof window !== "undefined" && localStorage.getItem(flag);
      if ((prevPct.current < 100 || !already) && !celebrating) {
        setCelebrating(true);
        try {
          localStorage.setItem(flag, "1");
        } catch {}
        setTimeout(() => setCelebrating(false), 4600);
      }
    }
    prevPct.current = pct;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct, total, data.today]);

  // ---- derived list -------------------------------------------------------------
  const visible = useMemo(() => {
    switch (filter) {
      case "left":
        return data.habits.filter((h) => h.todayStatus !== "completed");
      case "done":
        return data.habits.filter((h) => h.todayStatus === "completed");
      case "skipped":
        return data.habits.filter((h) => h.todayStatus === "skipped");
      default:
        return data.habits;
    }
  }, [data.habits, filter]);

  const partnerPulse = data.partner;
  const partnerName = partner?.user.name ?? "Partner";

  const headline =
    total > 0 && completed === total
      ? "Perfect day — everything is done."
      : left === 1
        ? "One ritual left. Finish strong."
        : `${left} ritual${left === 0 ? "s" : ""} left today.`;

  return (
    <div className="grain relative">
      {/* ambient glow field */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="ambient-blob absolute -top-40 left-[8%] h-[420px] w-[560px] rounded-full bg-lime-400/[0.055] blur-[120px]" />
        <div
          className="ambient-blob absolute top-[30%] right-[-6%] h-[380px] w-[460px] rounded-full bg-sky-400/[0.05] blur-[120px]"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="ambient-blob absolute bottom-[-12%] left-[30%] h-[360px] w-[520px] rounded-full bg-violet-400/[0.05] blur-[120px]"
          style={{ animationDelay: "-3s" }}
        />
      </div>

      <div className="relative min-h-screen">
        {celebrating && <Confetti burstKey={data.today} />}

        {/* ---------- header ---------- */}
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3.5 sm:gap-4 sm:px-6">
            <div className="flex shrink-0 items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-lime-400 text-lime-950 shadow-[0_0_24px_rgba(163,230,53,0.35)]">
                <Check size={20} strokeWidth={3.2} />
              </div>
              <div className="hidden sm:block">
                <div className="font-display text-[15px] font-semibold tracking-tight text-white">
                  Momentum
                </div>
                <div className="text-[10px] font-medium tracking-[0.22em] text-zinc-500 uppercase">
                  habit OS
                </div>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-1 sm:gap-2.5">
              <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-400 md:flex">
                <CalendarDays size={13} className="text-lime-300" />
                {data.dateLine}
              </div>
              <button
                onClick={onOpenWallet}
                aria-label="Open wallet"
                title="Wallet"
                className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white sm:px-4"
              >
                <Wallet size={14} className="text-amber-300" />
                <span className="hidden sm:inline">Wallet</span>
              </button>
              <button
                onClick={onOpenLeveling}
                title="Ascend — your level & quests"
                aria-label={`Open leveling, level ${xpSummary.level}`}
                className="flex items-center gap-1.5 rounded-full border border-lime-400/20 bg-lime-400/[0.06] px-2.5 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-lime-400/[0.14] hover:text-white sm:px-4"
              >
                <Zap size={14} className="text-lime-300" />
                <span className="hidden sm:inline">
                  Leveling · <span className="font-semibold text-lime-300 tabular-nums">Lv {xpSummary.level}</span>
                </span>
                <span className="font-semibold text-lime-300 tabular-nums sm:hidden">
                  Lv {xpSummary.level}
                </span>
              </button>
              <div
                className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pr-1.5 pl-2"
                title={`Signed in as ${data.me.name}`}
              >
                <span
                  className="font-display grid size-6 place-items-center rounded-full text-[11px] font-semibold text-zinc-950"
                  style={{ background: data.me.color }}
                >
                  {data.me.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[90px] truncate text-[13px] font-medium text-zinc-300 lg:inline">
                  {data.me.name}
                </span>
                <button
                  onClick={() => setPwOpen(true)}
                  title="Change password"
                  aria-label="Change password"
                  className="grid size-7 place-items-center rounded-full text-zinc-500 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <KeyRound size={13} />
                </button>
                <button
                  onClick={onSignOut}
                  title="Switch account"
                  aria-label="Sign out"
                  className="grid size-7 place-items-center rounded-full text-zinc-500 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <LogOut size={13} />
                </button>
              </div>
              <button
                onClick={openCreate}
                aria-label="Create new habit"
                className="flex items-center gap-1.5 rounded-full bg-lime-400 px-2.5 py-2 text-[13px] font-semibold text-lime-950 transition hover:bg-lime-300 active:scale-95 sm:px-4"
              >
                <Plus size={15} strokeWidth={2.8} />
                <span className="hidden sm:inline">New habit</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        </header>

        <main className="relative mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 lg:pt-12">
          {/* ---------- hero ---------- */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10"
          >
            <p className="text-[11px] font-semibold tracking-[0.32em] text-lime-300/90 uppercase">
              {data.dateLine}
            </p>
            <h1 className="font-display mt-2 max-w-3xl text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] font-semibold tracking-tight text-white">
              {data.greeting},{" "}
              <span className="text-lime-300">{data.me.name.split(" ")[0]}.</span>
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <HeroChip icon={<CheckCircle2 size={14} className="text-lime-300" />} label={`${completed} done`} />
              <HeroChip icon={<CircleDashed size={14} className="text-sky-300" />} label={`${left} to go`} />
              <HeroChip
                icon={<Flame size={14} className="text-amber-300" />}
                label={`${data.streaks.current} day streak`}
              />
              {partnerPulse && (
                <HeroChip
                  icon={<Users size={14} className="text-sky-300" />}
                  label={`${partnerName}: ${partnerPulse.consistencyPct}% consistent`}
                />
              )}
              <span
                className={`ml-1 hidden text-xs font-medium transition sm:inline ${
                  completed === total && total > 0 ? "text-lime-300" : "text-zinc-500"
                }`}
              >
                {headline}
              </span>
            </div>
          </motion.section>

          {/* ---------- main grid ---------- */}
          <div className="grid items-stretch gap-5 lg:grid-cols-[1fr_360px]">
            {/* habits column */}
            <section className="flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="mb-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-lg font-semibold tracking-tight text-white">
                    Today’s rituals
                  </h2>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold text-zinc-400 tabular-nums">
                    {completed}/{total}
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        filter === f.key
                          ? "bg-white/[0.09] text-white"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              <div className="space-y-2.5">
                <AnimatePresence initial={false} mode="popLayout">
                  {visible.map((h, i) => (
                    <HabitRow
                      key={h.id}
                      habit={h}
                      index={i}
                      busy={false}
                      onToggle={toggle}
                      onEdit={openEdit}
                      onDelete={removeHabit}
                    />
                  ))}
                </AnimatePresence>
                {visible.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.02] px-6 py-10 text-center"
                  >
                    <Sparkles className="mx-auto mb-3 text-zinc-600" size={22} />
                    <p className="text-sm text-zinc-500">
                      {filter === "all"
                        ? "No rituals yet — add your first daily habit to start the streak."
                        : "Nothing matches this filter right now."}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* ---------- daily quote (below the habits section) ---------- */}
              <div className="mt-5 flex-1">
                <DailyQuote quote={data.dailyQuote} className="mt-0 h-full max-w-none" />
              </div>
            </section>

            {/* stats rail */}
            <aside className="space-y-5">
              {partnerPulse && (
                <PartnerCard partner={partnerPulse} partnerXp={partnerXpSummary} />
              )}

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.12 }}
                className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6"
              >
                <div className="pointer-events-none absolute -top-20 -right-16 size-48 rounded-full bg-lime-400/[0.08] blur-3xl" />
                <CardTitle icon={<Target size={14} />} title="Today’s momentum" />
                <div className="mt-5 flex items-center gap-6">
                  <ProgressRing pct={pct} />
                  <div className="space-y-3">
                    <StatLine label="Completed" value={`${completed}/${total}`} tone="text-lime-300" />
                    <StatLine label="Remaining" value={`${left}`} tone="text-white" />
                    <StatLine label="Skipped" value={`${data.totals.skipped}`} tone="text-zinc-400" />
                  </div>
                </div>
                <div className="mt-5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-1.5 rounded-full bg-gradient-to-r from-lime-500 to-emerald-400"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ type: "spring", stiffness: 70, damping: 20 }}
                  />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                  {completed === total && total > 0
                    ? "Flawless. Come back tomorrow and protect the streak."
                    : "Check off rituals as you go — the ring fills in real time."}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6"
              >
                <div className="pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full bg-amber-400/[0.07] blur-3xl" />
                <CardTitle icon={<Flame size={14} />} title="Perfect-day streak" tone="text-amber-300" />
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <CountUp
                        value={data.streaks.current}
                        className="font-display text-5xl font-semibold tracking-tight text-white tabular-nums"
                      />
                      <span className="text-sm font-medium text-zinc-500">
                        day{data.streaks.current === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      Finish every ritual to grow the flame.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-zinc-300">
                      <Trophy size={12} className="text-amber-300" />
                      Best {data.streaks.best}
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      <span className="font-semibold text-lime-300">{data.streaks.perfectThisWeek}/7</span>{" "}
                      perfect this week
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.24 }}
                className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6"
              >
                <CardTitle icon={<ListChecks size={14} />} title="This week" tone="text-sky-300" />
                <div className="mt-5">
                  <WeeklyBars week={data.week} />
                </div>
              </motion.div>
            </aside>
          </div>

          {/* ---------- heatmap ---------- */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-5 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 sm:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle icon={<CalendarDays size={14} />} title="Consistency map" tone="text-emerald-300" />
              <span className="text-[11px] tracking-wide text-zinc-600 uppercase">
                last {data.heatWeeks} weeks · today outlined
              </span>
            </div>
            <div className="mt-5 overflow-x-auto pb-1">
              <Heatmap cells={data.heat} weeks={data.heatWeeks} />
            </div>
          </motion.section>

          <footer className="mt-10 flex items-center justify-between text-[11px] text-zinc-600">
            <span>Momentum — build the person, one ritual at a time.</span>
            <span className="hidden sm:inline">Resets automatically at midnight.</span>
          </footer>
        </main>

        <HabitModal
          open={modalOpen}
          editing={editing}
          saving={saving}
          onClose={() => setModalOpen(false)}
          onSubmit={submitModal}
        />
        <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      </div>
    </div>
  );
}

function HeroChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300">
      {icon}
      {label}
    </span>
  );
}

function CardTitle({
  icon,
  title,
  tone = "text-lime-300",
}: {
  icon: ReactNode;
  title: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`${tone}`}>{icon}</span>
      <h3 className="text-[11px] font-bold tracking-[0.22em] text-zinc-400 uppercase">{title}</h3>
    </div>
  );
}

function StatLine({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <div className={`font-display text-xl font-semibold tracking-tight tabular-nums ${tone}`}>
        {value}
      </div>
      <div className="text-[10px] font-medium tracking-[0.18em] text-zinc-500 uppercase">{label}</div>
    </div>
  );
}

/**
 * Signed-out visitors belong on the dedicated /login page, so the dashboard
 * never renders a login form of its own.
 */
function SignedOutRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="grid size-12 place-items-center rounded-2xl bg-lime-400 text-lime-950 shadow-[0_0_40px_rgba(163,230,53,0.35)]"
        aria-hidden
      >
        <Check size={26} strokeWidth={3.2} />
      </motion.div>
    </main>
  );
}

