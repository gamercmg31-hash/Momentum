"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, Zap } from "lucide-react";
import Confetti from "@/components/confetti";
import CountUp from "@/components/count-up";
import {
  XP_CHANGED_EVENT,
  type LevelUp,
  type XpEvent,
} from "@/lib/xp";

interface Toast {
  id: number;
  label: string;
  amount: number;
}

/**
 * Global XP feedback layer — mounted once for the signed-in user.
 * Listens for awards fired anywhere (dashboard toggles, wallet, quest claims)
 * and renders floating "+XP" toasts plus a full level-up celebration.
 */
export default function XpFeedback({ userId }: { userId: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<LevelUp | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    let levelTimer: ReturnType<typeof setTimeout> | null = null;

    const onChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        userId: string;
        gained: XpEvent[];
        levelUp: LevelUp | null;
      };
      if (!detail || detail.userId !== userId) return;

      const fresh: Toast[] = detail.gained.map((g) => ({
        id: ++idRef.current,
        label: g.label,
        amount: g.amount,
      }));
      if (fresh.length) {
        setToasts((prev) => [...prev, ...fresh].slice(-4));
        for (const t of fresh) {
          setTimeout(() => {
            setToasts((prev) => prev.filter((x) => x.id !== t.id));
          }, 3200);
        }
      }
      if (detail.levelUp) {
        setLevelUp(detail.levelUp);
        if (levelTimer) clearTimeout(levelTimer);
        levelTimer = setTimeout(() => setLevelUp(null), 5200);
      }
    };

    window.addEventListener(XP_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(XP_CHANGED_EVENT, onChanged);
      if (levelTimer) clearTimeout(levelTimer);
    };
  }, [userId]);

  return (
    <>
      {/* ---------- +XP toasts ---------- */}
      <div className="pointer-events-none fixed right-4 bottom-6 z-[100] flex w-[calc(100%-2rem)] max-w-xs flex-col items-end gap-2 sm:right-6">
        <AnimatePresence>
          {toasts.map((t, i) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.94 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 28,
                delay: i * 0.08,
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-lime-400/25 bg-[#0d0f0a]/95 px-4 py-3 shadow-[0_8px_40px_rgba(163,230,53,0.18)] backdrop-blur-xl"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lime-400/15 text-lime-300">
                <Zap size={17} strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-sm font-semibold text-lime-300 tabular-nums">
                  +{t.amount} XP
                </div>
                <div className="truncate text-[11px] text-zinc-400">{t.label}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ---------- level-up celebration ---------- */}
      <AnimatePresence>
        {levelUp && (
          <>
            <Confetti burstKey={`level-${userId}-${levelUp.to}`} />
            <motion.div
              key="levelup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-none fixed inset-0 z-[96] grid place-items-center bg-[#0a0a0c]/60 backdrop-blur-sm"
            >
              <div
                className="pointer-events-none absolute top-1/2 left-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-400/[0.12] blur-[110px]"
                aria-hidden
              />
              <motion.div
                initial={{ scale: 0.7, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: -20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="relative mx-4 flex flex-col items-center rounded-[2rem] border border-lime-400/25 bg-gradient-to-b from-lime-400/[0.10] to-[#0c0e08] px-10 py-9 text-center shadow-[0_0_90px_rgba(163,230,53,0.22)] sm:px-14"
              >
                <motion.span
                  initial={{ rotate: -14, scale: 0.6 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.15 }}
                  className="grid size-16 place-items-center rounded-2xl bg-lime-400 text-lime-950 shadow-[0_0_38px_rgba(163,230,53,0.5)]"
                >
                  <Trophy size={30} strokeWidth={2.2} />
                </motion.span>
                <div className="mt-5 text-[11px] font-bold tracking-[0.34em] text-lime-300 uppercase">
                  level up
                </div>
                <div className="font-display mt-1 text-6xl font-semibold tracking-tight text-white tabular-nums sm:text-7xl">
                  <CountUp value={levelUp.to} />
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                  <span className="tabular-nums">Lv {levelUp.from}</span>
                  <span aria-hidden>→</span>
                  <span className="font-semibold text-lime-300 tabular-nums">
                    Lv {levelUp.to}
                  </span>
                  <span className="text-zinc-600" aria-hidden>
                    ·
                  </span>
                  <span className="font-display font-semibold text-white">
                    {levelUp.rank.name}
                  </span>
                </div>
                <p className="mt-3 text-xs text-zinc-500">
                  The grind is paying off — keep ascending.
                </p>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
