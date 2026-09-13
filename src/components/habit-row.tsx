import { createElement, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Flame, MoreHorizontal, Pencil, Trash2, Undo2 } from "lucide-react";
import { colorOf, iconOf } from "@/lib/visuals";
import type { HabitDTO } from "@/lib/types";

export default function HabitRow({
  habit,
  index,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  habit: HabitDTO;
  index: number;
  busy: boolean;
  onToggle: (habit: HabitDTO, status: "completed" | "skipped" | null) => void;
  onEdit: (habit: HabitDTO) => void;
  onDelete: (habit: HabitDTO) => void;
}) {
  const c = colorOf(habit.color);
  const done = habit.todayStatus === "completed";
  const skipped = habit.todayStatus === "skipped";
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 320, damping: 30, delay: index * 0.045 }}
      className={`group relative flex items-center gap-4 rounded-2xl border p-4 transition-colors sm:px-5 ${
        done
          ? "border-lime-400/25 bg-lime-400/[0.05]"
          : skipped
            ? "border-dashed border-white/15 bg-white/[0.015]"
            : "border-white/[0.07] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.045]"
      }`}
    >
      {/* icon tile */}
      <motion.div
        animate={done ? { scale: [1, 1.15, 1], rotate: [0, -6, 0] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`grid size-12 shrink-0 place-items-center rounded-xl sm:size-[52px] ${
          done ? c.tileActive : c.tile
        }`}
      >
        {createElement(iconOf(habit.icon), { size: 22, strokeWidth: 2 })}
      </motion.div>

      {/* name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span
            className={`truncate text-[15px] font-medium sm:text-base ${
              done ? "text-zinc-300" : skipped ? "text-zinc-500" : "text-white"
            }`}
          >
            {habit.name}
          </span>
          {habit.streak > 0 && (
            <span
              className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300 tabular-nums"
              title={`${habit.streak} day streak (best ${habit.bestStreak})`}
            >
              <Flame size={11} strokeWidth={2.5} />
              {habit.streak}
            </span>
          )}
          <AnimatePresence>
            {done && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-full bg-lime-400/15 px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-lime-300 uppercase"
              >
                Done
              </motion.span>
            )}
            {skipped && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-zinc-400 uppercase"
              >
                Skipped
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {/* last 7 days mini dots */}
        <div className="mt-2 flex items-center gap-1.5">
          {habit.last7.map((d) => (
            <span
              key={d.date}
              title={d.tracked ? `${d.date}: ${d.status ?? "not marked"}` : `${d.date}: before this habit existed`}
              className={`size-[6px] rounded-full ${
                !d.tracked
                  ? "bg-white/[0.06]"
                  : d.status === "completed"
                    ? c.dot
                    : d.status === "skipped"
                      ? "bg-zinc-500/50"
                      : "bg-white/[0.14]"
              }`}
            />
          ))}
          <span className="ml-1 text-[10px] tracking-wide text-zinc-600">last 7 days</span>
        </div>
      </div>

      {/* actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => onToggle(habit, skipped ? null : "skipped")}
          disabled={busy}
          title={skipped ? "Undo skip" : "Mark as skipped"}
          aria-label={skipped ? `Undo skip for ${habit.name}` : `Mark ${habit.name} as skipped`}
          className={`grid size-10 place-items-center rounded-full border transition-all disabled:opacity-40 ${
            skipped
              ? "border-white/20 bg-white/10 text-zinc-200"
              : "border-white/10 text-zinc-500 hover:border-white/25 hover:text-zinc-200"
          }`}
        >
          {skipped ? <Undo2 size={16} /> : <Ban size={15} />}
        </button>

        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onToggle(habit, done ? null : "completed")}
          disabled={busy}
          title={done ? "Undo completion" : "Mark as completed"}
          aria-label={done ? `Undo ${habit.name}` : `Complete ${habit.name}`}
          className={`grid size-11 place-items-center rounded-full transition-all disabled:opacity-40 ${
            done ? c.check : "border-2 border-white/15 text-transparent hover:border-white/35"
          }`}
        >
          <motion.svg viewBox="0 0 24 24" className="size-5" fill="none">
            <motion.path
              d="M4.5 12.8l4.6 4.6L19.5 6.8"
              stroke="currentColor"
              strokeWidth={3.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: done ? 1 : 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.button>

        {/* menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => {
              setMenuOpen((v) => !v);
              setConfirming(false);
            }}
            disabled={busy}
            aria-label={`Options for ${habit.name}`}
            className="grid size-9 place-items-center rounded-full text-zinc-600 transition hover:bg-white/[0.06] hover:text-zinc-200 disabled:opacity-40"
          >
            <MoreHorizontal size={18} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#15151a] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
              >
                {confirming ? (
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium text-zinc-300">Delete this habit?</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">History will be removed.</p>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          setConfirming(false);
                          onDelete(habit);
                        }}
                        className="flex-1 rounded-lg bg-rose-500 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-400"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        className="flex-1 rounded-lg bg-white/[0.07] px-2 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.12]"
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(habit);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-zinc-300 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      <Pencil size={14} /> Edit habit
                    </button>
                    <button
                      onClick={() => setConfirming(true)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-rose-300 transition hover:bg-rose-400/10"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
