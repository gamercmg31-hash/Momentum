import { useMemo } from "react";
import { motion } from "framer-motion";

const PALETTE = ["#a3e635", "#34d399", "#38bdf8", "#fbbf24", "#fb7185", "#a78bfa", "#ffffff"];

interface Piece {
  id: number;
  x: number; // vw start
  drift: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotate: number;
  round: boolean;
}

// Deterministic, seeded particle set — pure and module-scope so renders stay pure.
function buildPieces(burstKey: string): Piece[] {
  let seed = 0;
  for (const ch of burstKey) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: 90 }, (_, i) => ({
    id: i,
    x: rand() * 100,
    drift: (rand() - 0.5) * 30,
    delay: rand() * 0.6,
    duration: 2.4 + rand() * 2,
    size: 6 + rand() * 8,
    color: PALETTE[Math.floor(rand() * PALETTE.length)],
    rotate: 360 + rand() * 720,
    round: rand() > 0.7,
  }));
}

export default function Confetti({ burstKey }: { burstKey: string }) {
  const pieces = useMemo<Piece[]>(() => buildPieces(burstKey), [burstKey]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-[-20px]"
          style={{
            left: `${p.x}vw`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            background: p.color,
            borderRadius: p.round ? "50%" : 2,
          }}
          initial={{ y: "-5vh", x: 0, rotate: 0, opacity: 1 }}
          animate={{
            y: "110vh",
            x: `${p.drift}vw`,
            rotate: p.rotate,
            opacity: [1, 1, 0.9, 0.6],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.15, 0.6, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
