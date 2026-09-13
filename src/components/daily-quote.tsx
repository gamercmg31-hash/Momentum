import { motion } from "framer-motion";
import { Flame, Heart, Quote, Sparkles } from "lucide-react";
import { twMerge } from "tailwind-merge";
import type { DailyQuoteDTO } from "@/lib/types";

const THEMES = {
  love: {
    tile: "bg-rose-400/10 text-rose-300",
    label: "text-rose-300",
    icon: Heart,
    bar: "from-rose-400/40",
  },
  motivation: {
    tile: "bg-amber-400/10 text-amber-300",
    label: "text-amber-300",
    icon: Flame,
    bar: "from-amber-400/40",
  },
} as const;

export default function DailyQuote({
  quote,
  className,
}: {
  quote: DailyQuoteDTO;
  className?: string;
}) {
  const theme = THEMES[quote.category];
  const Icon = theme.icon;

  return (
    <motion.div
      key={`${quote.category}-${quote.text}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={twMerge(
        "relative mt-5 flex max-w-xl items-center gap-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-6 backdrop-blur sm:px-7",
        className
      )}
      aria-live="polite"
    >
      {/* soft accent glow on the leading edge */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r ${theme.bar} to-transparent opacity-30`}
      />

      {/* oversized watermark so the taller card never feels empty */}
      <Quote
        className="pointer-events-none absolute -right-2 -bottom-3 size-24 rotate-180 text-white/[0.045]"
        strokeWidth={1.5}
      />

      <motion.span
        initial={{ scale: 0.6, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.3 }}
        className={`relative grid size-14 shrink-0 place-items-center rounded-2xl ${theme.tile}`}
      >
        <Icon size={24} strokeWidth={2.2} />
      </motion.span>

      <div className="relative min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className={`text-xs font-bold tracking-[0.22em] uppercase ${theme.label}`}>
            {quote.category === "love" ? "Daily Love" : "Daily Motivation"}
          </span>
          <span className="flex items-center gap-1 text-[11px] tracking-[0.16em] text-zinc-600 uppercase">
            <Sparkles size={11} />
            new every day
          </span>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.32 }}
          className="font-display mt-2.5 text-lg leading-snug font-medium text-zinc-100 sm:text-xl lg:text-2xl"
        >
          &ldquo;{quote.text}&rdquo;
        </motion.p>
      </div>
    </motion.div>
  );
}
