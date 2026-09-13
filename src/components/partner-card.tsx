import { motion } from "framer-motion";
import { Eye, Flame, Zap } from "lucide-react";
import type { PartnerSummary } from "@/lib/types";
import type { XpSummary } from "@/lib/xp";
import CountUp from "@/components/count-up";

export default function PartnerCard({
  partner,
  partnerXp,
}: {
  partner: PartnerSummary;
  partnerXp?: XpSummary | null;
}) {
  const p = partner;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.06 }}
      className="relative overflow-hidden rounded-3xl border border-sky-400/[0.14] bg-gradient-to-b from-sky-400/[0.06] to-white/[0.02] p-6"
    >
      <div className="pointer-events-none absolute -top-16 -right-12 size-40 rounded-full bg-sky-400/[0.08] blur-3xl" />

      {/* header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="font-display grid size-9 place-items-center rounded-full text-sm font-semibold text-zinc-950"
            style={{ background: p.user.color }}
          >
            {p.user.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <div className="text-sm font-semibold text-white">{p.user.name}</div>
            <div className="text-[10px] font-medium tracking-[0.18em] text-sky-300/80 uppercase">
              partner pulse
            </div>
          </div>
        </div>
        <span
          className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-zinc-400 uppercase"
          title="Read-only — only they can change their habits"
        >
          <Eye size={11} />
          view only
        </span>
      </div>

      {/* consistency */}
      <div className="relative mt-5 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-1.5">
            <CountUp
              value={p.consistencyPct}
              suffix="%"
              className="font-display text-5xl font-semibold tracking-tight text-sky-300 tabular-nums"
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">Consistency · last 30 days</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 tabular-nums">
            <Flame size={11} strokeWidth={2.5} />
            {p.currentStreak} day{p.currentStreak === 1 ? "" : "s"}
          </span>
          <span className="text-[11px] text-zinc-500 tabular-nums">
            today {p.today.completed}/{p.today.total}
          </span>
        </div>
      </div>

      {/* consistency bar */}
      <div className="relative mt-4 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-1.5 rounded-full bg-gradient-to-r from-sky-500 to-sky-300"
          initial={{ width: 0 }}
          animate={{ width: `${p.consistencyPct}%` }}
          transition={{ type: "spring", stiffness: 70, damping: 20, delay: 0.2 }}
        />
      </div>

      {/* ascend — their level & xp */}
      {partnerXp && (
        <div className="relative mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-sky-300/90 uppercase">
              <Zap size={11} strokeWidth={2.5} />
              ascend
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-display text-sm font-semibold text-white tabular-nums">
                Lv {partnerXp.level}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.12em] text-sky-300 uppercase">
                {partnerXp.rank.name}
              </span>
            </span>
          </div>
          <div className="mt-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-1 rounded-full bg-gradient-to-r from-sky-500 to-sky-300"
              initial={{ width: 0 }}
              animate={{ width: `${partnerXp.pct}%` }}
              transition={{ type: "spring", stiffness: 70, damping: 20, delay: 0.25 }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500 tabular-nums">
            <span>{partnerXp.totalXp.toLocaleString()} XP total</span>
            <span>
              {partnerXp.intoLevel}/{partnerXp.forNext} to Lv {partnerXp.nextLevel}
            </span>
          </div>
        </div>
      )}

      {/* week mini bars */}
      <div className="relative mt-5 flex items-end justify-between gap-1.5">
        {p.weekPct.map((pct, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-10 w-full max-w-[26px] items-end overflow-hidden rounded-md bg-white/[0.05]">
              {pct !== null && (
                <motion.div
                  className={`w-full rounded-md ${pct === 100 ? "bg-sky-300" : "bg-sky-400/50"}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(pct, pct > 0 ? 10 : 3)}%` }}
                  transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.15 + i * 0.04 }}
                  title={`${pct}%`}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="relative mt-2 text-[10px] tracking-[0.14em] text-zinc-600 uppercase">
        their week · {p.totalCompletions} total check-ins
      </p>
    </motion.div>
  );
}
