import { motion } from "framer-motion";
import CountUp from "@/components/count-up";

export default function ProgressRing({
  pct,
  size = 168,
  stroke = 12,
}: {
  pct: number; // 0..100
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
          stroke="url(#ringGrad)"
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
            complete
          </div>
        </div>
      </div>
    </div>
  );
}
