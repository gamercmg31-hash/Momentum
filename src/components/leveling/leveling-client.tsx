"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Crown,
  Eye,
  Flame,
  HandCoins,
  ListChecks,
  PiggyBank,
  Sparkles,
  Sunrise,
  Target,
  Trophy,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { dateLine } from "@/lib/dates";
import type { AccountUser } from "@/lib/accounts";
import {
  XP_RULES,
  type QuestState,
  type XpSummary,
} from "@/lib/xp";
import CountUp from "@/components/count-up";
import BackupCard from "@/components/backup-card";

const QUEST_ICONS: Record<string, LucideIcon> = {
  sunrise: Sunrise,
  flame: Flame,
  sparkles: Sparkles,
  "hand-coins": HandCoins,
  target: Target,
  crown: Crown,
  "piggy-bank": PiggyBank,
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function LevelingClient({
  me,
  summary,
  quests,
  partnerUser,
  partnerSummary,
  onSyncQuests,
  onOpenHabits,
  onOpenWallet,
}: {
  me: AccountUser;
  summary: XpSummary;
  quests: QuestState[];
  partnerUser: AccountUser | null;
  partnerSummary: XpSummary | null;
  onSyncQuests: () => void;
  onOpenHabits: () => void;
  onOpenWallet: () => void;
}) {
  // Auto-claim any newly-completed quests on open / refocus / slow interval.
  // The controller performs the actual grant server-side (idempotent).
  useEffect(() => {
    onSyncQuests();
    const t = setInterval(onSyncQuests, 5 * 60 * 1000);
    window.addEventListener("focus", onSyncQuests);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onSyncQuests);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const daily = quests.filter((q) => q.def.period === "daily");
  const weekly = quests.filter((q) => q.def.period === "weekly");

  const raceDelta = partnerSummary ? summary.totalXp - partnerSummary.totalXp : 0;
  const toNext = summary.forNext - summary.intoLevel;

  return (
    <div className="grain min-h-screen bg-[#0a0a0c] text-zinc-100">
      {/* ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="ambient-blob absolute -top-40 left-[10%] h-[420px] w-[560px] rounded-full bg-lime-400/[0.06] blur-[130px]" />
        <div
          className="ambient-blob absolute top-[36%] right-[-6%] h-[380px] w-[460px] rounded-full bg-amber-400/[0.05] blur-[130px]"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="ambient-blob absolute bottom-[-10%] left-[30%] h-[340px] w-[480px] rounded-full bg-violet-400/[0.045] blur-[130px]"
          style={{ animationDelay: "-3s" }}
        />
      </div>

      {/* ---------- header ---------- */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-lime-400 text-lime-950 shadow-[0_0_24px_rgba(163,230,53,0.35)]">
              <Zap size={18} strokeWidth={2.4} />
            </div>
            <div>
              <div className="font-display text-[15px] font-semibold tracking-tight text-white">
                Ascend
              </div>
              <div className="text-[10px] font-medium tracking-[0.22em] text-zinc-500 uppercase">
                earn xp · level up
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenHabits}
              aria-label="Open habits"
              title="Habits"
              className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
            >
              <ListChecks size={14} className="text-lime-300" />
              <span className="hidden sm:inline">Habits</span>
            </button>
            <button
              onClick={onOpenWallet}
              aria-label="Open wallet"
              title="Wallet"
              className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
            >
              <Wallet size={14} className="text-amber-300" />
              <span className="hidden sm:inline">Wallet</span>
            </button>
            <div
              className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] py-1.5 pr-3 pl-1.5"
              title={`Signed in as ${me.name}`}
            >
              <span
                className="font-display grid size-6 place-items-center rounded-full text-[11px] font-semibold text-zinc-950"
                style={{ background: me.color }}
              >
                {me.name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[90px] truncate text-[13px] font-medium text-zinc-300 lg:inline">
                {me.name}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6 lg:pt-12">
        {/* ---------- hero ---------- */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="mb-10"
        >
          <p className="text-[11px] font-semibold tracking-[0.32em] text-lime-300/90 uppercase">
            {dateLine(new Date())}
          </p>
          <h1 className="font-display mt-2 max-w-3xl text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.02] font-semibold tracking-tight text-white">
            <span className="text-lime-300">{me.name.split(" ")[0]}&rsquo;s</span> ascent.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-zinc-500">
            Every ritual, every taka tracked, every quest — it all compounds into levels.
          </p>
        </motion.section>

        {/* ---------- level overview ---------- */}
        <div className="grid items-stretch gap-5 lg:grid-cols-[1fr_360px]">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
            className="relative flex flex-col overflow-hidden rounded-3xl border border-lime-400/[0.14] bg-gradient-to-b from-lime-400/[0.06] to-white/[0.02] p-6 sm:p-7"
          >
            <div className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-lime-400/[0.08] blur-3xl" />
            <div className="relative flex items-center justify-between gap-3">
              <CardTitle icon={<Zap size={14} />} title="current level" />
              <span className="font-display rounded-full border border-lime-400/25 bg-lime-400/10 px-3.5 py-1.5 text-xs font-semibold tracking-[0.14em] text-lime-300 uppercase">
                {summary.rank.name}
              </span>
            </div>

            <div className="relative mt-5 flex flex-wrap items-end gap-x-6 gap-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-[11px] font-bold tracking-[0.28em] text-zinc-500 uppercase">
                  lv
                </span>
                <span className="font-display text-[clamp(4rem,10vw,6.5rem)] leading-none font-semibold tracking-tight text-white tabular-nums">
                  <CountUp value={summary.level} />
                </span>
              </div>
              <div className="mb-2 text-sm text-zinc-400">
                <span className="font-semibold text-lime-300 tabular-nums">
                  {toNext.toLocaleString()} XP
                </span>{" "}
                to Level {summary.nextLevel}
              </div>
            </div>

            {/* progress bar */}
            <div className="relative mt-5">
              <div className="overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-2.5 rounded-full bg-gradient-to-r from-lime-500 via-lime-400 to-emerald-400 shadow-[0_0_18px_rgba(163,230,53,0.4)]"
                  initial={false}
                  animate={{ width: `${Math.max(summary.pct, 2)}%` }}
                  transition={{ type: "spring", stiffness: 60, damping: 18 }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
                <span>
                  <span className="text-zinc-300 tabular-nums">
                    {summary.intoLevel.toLocaleString()}
                  </span>{" "}
                  / {summary.forNext.toLocaleString()} xp
                </span>
                <span>level {summary.nextLevel}</span>
              </div>
            </div>

            {/* stat blocks */}
            <div className="relative mt-6 grid grid-cols-3 gap-3">
              <StatBlock label="total xp" value={summary.totalXp} />
              <StatBlock label="today" value={summary.todayXp} prefix="+" />
              <StatBlock label="this week" value={summary.weekXp} prefix="+" />
            </div>
          </motion.section>

          {/* ring + rank ladder */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: EASE }}
            className="relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6"
          >
            <div className="pointer-events-none absolute -bottom-20 -left-12 size-52 rounded-full bg-emerald-400/[0.07] blur-3xl" />
            <CardTitle icon={<Trophy size={14} />} title="next level" tone="text-emerald-300" />
            <div className="mt-5 flex items-center justify-center">
              <LevelRing
                pct={summary.pct}
                level={summary.level}
                nextLevel={summary.nextLevel}
              />
            </div>
            <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">
              {summary.level >= 20
                ? "Eternal — the summit. Legends only."
                : `Rank up to a higher tier as you climb. Keep the streak alive and the XP flowing.`}
            </p>
          </motion.section>
        </div>

        {/* ---------- ways to earn ---------- */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
          className="mt-5 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 sm:p-7"
        >
          <CardTitle icon={<Sparkles size={14} />} title="ways to earn" tone="text-amber-300" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <EarnTile
              icon={<CheckCircle2 size={18} strokeWidth={2.2} />}
              tile="bg-lime-400/10 text-lime-300"
              amount={`+${XP_RULES.habitCompleted} XP`}
              title="Ritual check-off"
              desc="per ritual, once a day"
            />
            <EarnTile
              icon={<Flame size={18} strokeWidth={2.2} />}
              tile="bg-amber-400/10 text-amber-300"
              amount={`+${XP_RULES.perfectDay} XP`}
              title="Perfect day"
              desc="finish every ritual"
            />
            <EarnTile
              icon={<HandCoins size={18} strokeWidth={2.2} />}
              tile="bg-emerald-400/10 text-emerald-300"
              amount={`+${XP_RULES.walletIncome} XP`}
              title="Money in"
              desc={`first ${XP_RULES.walletIncomeDailyCap} income entries/day`}
            />
            <EarnTile
              icon={<Crown size={18} strokeWidth={2.2} />}
              tile="bg-violet-400/10 text-violet-300"
              amount="10–90 XP"
              title="Quests"
              desc="daily & weekly challenges"
            />
          </div>
        </motion.section>

        {/* ---------- quests ---------- */}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <QuestGroup
            title="Daily quests"
            resetLabel="reset at midnight"
            quests={daily}
            delay={0.24}
          />
          <QuestGroup
            title="Weekly quests"
            resetLabel="reset every Monday"
            quests={weekly}
            delay={0.28}
          />
        </div>

        {/* ---------- partner + activity ---------- */}
        <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-[1fr_360px]">
          {/* partner ascent — view only */}
          {partnerUser && partnerSummary && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.32, ease: EASE }}
              className="relative flex flex-col overflow-hidden rounded-3xl border border-sky-400/[0.14] bg-gradient-to-b from-sky-400/[0.06] to-white/[0.02] p-6 sm:p-7"
            >
              <div className="pointer-events-none absolute -top-16 -right-12 size-44 rounded-full bg-sky-400/[0.08] blur-3xl" />
              <div className="relative flex items-center justify-between">
                <CardTitle icon={<Zap size={14} />} title="partner ascent" tone="text-sky-300" />
                <span
                  className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase"
                  title="Read-only — only they can earn their XP"
                >
                  <Eye size={11} />
                  view only
                </span>
              </div>

              <div className="relative mt-5 flex flex-wrap items-center gap-5">
                <span
                  className="font-display grid size-12 place-items-center rounded-2xl text-lg font-semibold text-zinc-950"
                  style={{ background: partnerUser.color }}
                >
                  {partnerUser.name.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-display text-4xl font-semibold tracking-tight text-white tabular-nums">
                      Lv <CountUp value={partnerSummary.level} />
                    </span>
                    <span className="font-display text-sm font-semibold tracking-[0.14em] text-sky-300 uppercase">
                      {partnerSummary.rank.name}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {partnerUser.name} ·{" "}
                    <span className="text-zinc-300 tabular-nums">
                      {partnerSummary.totalXp.toLocaleString()}
                    </span>{" "}
                    total XP
                  </div>
                </div>
              </div>

              <div className="relative mt-5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-sky-300"
                  initial={false}
                  animate={{ width: `${Math.max(partnerSummary.pct, 2)}%` }}
                  transition={{ type: "spring", stiffness: 60, damping: 18 }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
                <span>
                  {partnerSummary.intoLevel.toLocaleString()} /{" "}
                  {partnerSummary.forNext.toLocaleString()} xp
                </span>
                <span>level {partnerSummary.nextLevel}</span>
              </div>

              <p className="relative mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-zinc-400">
                {raceDelta === 0 ? (
                  <>Dead even — the two of you are neck and neck.</>
                ) : raceDelta > 0 ? (
                  <>
                    You lead by{" "}
                    <span className="font-semibold text-lime-300 tabular-nums">
                      {raceDelta.toLocaleString()} XP
                    </span>
                    . Don&rsquo;t let them catch up.
                  </>
                ) : (
                  <>
                    {partnerUser.name} leads by{" "}
                    <span className="font-semibold text-sky-300 tabular-nums">
                      {Math.abs(raceDelta).toLocaleString()} XP
                    </span>{" "}
                    — time to chase.
                  </>
                )}
              </p>
            </motion.section>
          )}

          {/* recent XP activity */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.36, ease: EASE }}
            className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6"
          >
            <div className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-lime-400/[0.06] blur-3xl" />
            <CardTitle icon={<CalendarDays size={14} />} title="recent XP" tone="text-violet-300" />
            {summary.recent.length === 0 ? (
              <p className="mt-5 text-sm text-zinc-500">
                No XP yet — check off a ritual to begin your ascent.
              </p>
            ) : (
              <ul className="relative mt-4 space-y-1">
                {summary.recent.slice(0, 8).map((e, i) => (
                  <motion.li
                    key={e.key + e.at}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.4 + i * 0.04 }}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.03]"
                  >
                    <span className="font-display w-12 shrink-0 text-sm font-semibold text-lime-300 tabular-nums">
                      +{e.amount}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
                      {e.label}
                    </span>
                    <span className="shrink-0 text-[10px] tracking-[0.12em] text-zinc-600 uppercase">
                      {e.day}
                    </span>
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.section>
        </div>

        {/* ---------- backup & data safety ---------- */}
        <BackupCard />

        <footer className="mt-10 flex items-center justify-between text-[11px] text-zinc-600">
          <span>Ascend — levels are earned, never given.</span>
          <span className="hidden sm:inline">
            You can always see each other&rsquo;s climb.
          </span>
        </footer>
      </main>
    </div>
  );
}

/* ========================================================================== */

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
    <div className="relative flex items-center gap-2">
      <span className={`${tone}`}>{icon}</span>
      <h3 className="text-[11px] font-bold tracking-[0.22em] text-zinc-400 uppercase">
        {title}
      </h3>
    </div>
  );
}

function StatBlock({
  label,
  value,
  prefix = "",
}: {
  label: string;
  value: number;
  prefix?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="font-display text-xl font-semibold tracking-tight text-white tabular-nums sm:text-2xl">
        <CountUp value={value} prefix={prefix} />
      </div>
      <div className="mt-0.5 text-[10px] font-medium tracking-[0.18em] text-zinc-500 uppercase">
        {label}
      </div>
    </div>
  );
}

function EarnTile({
  icon,
  tile,
  amount,
  title,
  desc,
}: {
  icon: ReactNode;
  tile: string;
  amount: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 transition hover:bg-white/[0.04]">
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tile}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-sm font-semibold text-white">{title}</span>
        </div>
        <div className="font-display text-sm font-semibold text-lime-300 tabular-nums">
          {amount}
        </div>
        <div className="truncate text-[11px] text-zinc-500">{desc}</div>
      </div>
    </div>
  );
}

function QuestGroup({
  title,
  resetLabel,
  quests,
  delay,
}: {
  title: string;
  resetLabel: string;
  quests: QuestState[];
  delay: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>
        <span className="text-[11px] tracking-[0.14em] text-zinc-600 uppercase">
          {resetLabel}
        </span>
      </div>
      <div className="space-y-3">
        {quests.map((q, i) => (
          <QuestCard key={q.def.id} quest={q} index={i} baseDelay={delay + 0.05} />
        ))}
      </div>
    </motion.section>
  );
}

function QuestCard({
  quest,
  index,
  baseDelay,
}: {
  quest: QuestState;
  index: number;
  baseDelay: number;
}) {
  const Icon = QUEST_ICONS[quest.def.icon] ?? Sparkles;
  const { claimed } = quest;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: baseDelay + index * 0.06, ease: EASE }}
      className={`relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 transition sm:p-5 ${
        claimed
          ? "border-lime-400/20 bg-lime-400/[0.04]"
          : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.035]"
      }`}
    >
      {claimed && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-lime-400/10 to-transparent" />
      )}
      <span
        className={`relative grid size-12 shrink-0 place-items-center rounded-2xl ${
          claimed ? "bg-lime-400/15 text-lime-300" : "bg-white/[0.05] text-zinc-300"
        }`}
      >
        <Icon size={20} strokeWidth={2.1} />
      </span>
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5">
          <span className="font-display text-sm font-semibold text-white">
            {quest.def.name}
          </span>
          <span className="rounded-full bg-lime-400/10 px-2 py-0.5 text-[10px] font-bold text-lime-300 tabular-nums">
            +{quest.def.xp} XP
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">{quest.def.desc}</p>
        <div className="mt-2.5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className={`h-full rounded-full ${
                claimed
                  ? "bg-gradient-to-r from-lime-500 to-emerald-400"
                  : "bg-zinc-500/70"
              }`}
              initial={false}
              animate={{ width: `${Math.max(quest.pct, quest.progress > 0 ? 6 : 0)}%` }}
              transition={{ type: "spring", stiffness: 70, damping: 20 }}
            />
          </div>
          <span className="text-[11px] font-semibold text-zinc-400 tabular-nums">
            {quest.progress}/{quest.target}
          </span>
        </div>
      </div>
      {claimed ? (
        <span className="relative flex shrink-0 items-center gap-1.5 rounded-full border border-lime-400/25 bg-lime-400/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-lime-300 uppercase">
          <BadgeCheck size={12} strokeWidth={2.6} />
          <span className="hidden sm:inline">claimed</span>
        </span>
      ) : (
        <span className="relative shrink-0 text-[11px] font-semibold text-zinc-500 tabular-nums">
          {quest.pct}%
        </span>
      )}
    </motion.div>
  );
}

function LevelRing({
  pct,
  level,
  nextLevel,
}: {
  pct: number;
  level: number;
  nextLevel: number;
}) {
  const size = 168;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="xpRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bef264" />
            <stop offset="55%" stopColor="#a3e635" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#xpRingGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - clamped / 100) }}
          transition={{ type: "spring", stiffness: 60, damping: 16 }}
          style={{ filter: "drop-shadow(0 0 10px rgba(163,230,53,0.45))" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-4xl font-semibold tracking-tight text-white tabular-nums">
            <CountUp value={clamped} suffix="%" />
          </div>
          <div className="mt-0.5 text-[11px] font-medium tracking-[0.18em] text-zinc-500 uppercase">
            to lv {nextLevel}
          </div>
        </div>
      </div>
    </div>
  );
}
