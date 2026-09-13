import { motion } from "framer-motion";

export default function WalletIllustration({ size = 240 }: { size?: number }) {
  return (
    <motion.svg
      viewBox="0 0 260 210"
      width={size}
      height={(size / 260) * 210}
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      role="img"
      aria-label="Wallet with cards and coins"
    >
      <defs>
        <linearGradient id="wkBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#27272e" />
          <stop offset="100%" stopColor="#131316" />
        </linearGradient>
        <linearGradient id="wkCardA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bef264" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
        <linearGradient id="wkCardB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id="wkFlap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="100%" stopColor="#27272a" />
        </linearGradient>
        <linearGradient id="wkCoin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="wkCoinB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bef264" />
          <stop offset="100%" stopColor="#65a30d" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="130" cy="188" rx="86" ry="12" fill="black" opacity="0.28" />

      {/* cards fanning out of the wallet */}
      <motion.g
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 4.4, ease: "easeInOut" }}
      >
        <motion.g
          initial={{ rotate: 0 }}
          animate={{ rotate: -9 }}
          style={{ transformOrigin: "104px 88px" }}
          transition={{ delay: 0.25, type: "spring", stiffness: 120, damping: 14 }}
        >
          <rect x="64" y="42" width="80" height="52" rx="9" fill="url(#wkCardB)" />
          <rect x="73" y="54" width="22" height="5" rx="2.5" fill="white" opacity="0.85" />
          <rect x="73" y="64" width="34" height="4" rx="2" fill="white" opacity="0.45" />
          <circle cx="134" cy="58" r="7" fill="white" opacity="0.35" />
        </motion.g>
        <motion.g
          initial={{ rotate: 0 }}
          animate={{ rotate: 7 }}
          style={{ transformOrigin: "156px 88px" }}
          transition={{ delay: 0.35, type: "spring", stiffness: 120, damping: 14 }}
        >
          <rect x="116" y="40" width="82" height="54" rx="9" fill="url(#wkCardA)" />
          <rect x="126" y="52" width="24" height="5" rx="2.5" fill="#1a2e05" opacity="0.7" />
          <rect x="126" y="62" width="38" height="4" rx="2" fill="#1a2e05" opacity="0.4" />
          <circle cx="186" cy="57" r="7" fill="#1a2e05" opacity="0.18" />
        </motion.g>
      </motion.g>

      {/* wallet body */}
      <motion.g
        animate={{ y: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.4 }}
      >
        <rect x="38" y="86" width="184" height="92" rx="18" fill="url(#wkBody)" />
        <rect x="38" y="86" width="184" height="92" rx="18" fill="none" stroke="white" strokeOpacity="0.09" />
        {/* stitching */}
        <rect x="47" y="95" width="166" height="74" rx="12" fill="none" stroke="white" strokeOpacity="0.1" strokeDasharray="5 7" />
        {/* coin pocket flap */}
        <rect x="146" y="110" width="76" height="46" rx="12" fill="url(#wkFlap)" />
        <rect x="146" y="110" width="76" height="46" rx="12" fill="none" stroke="white" strokeOpacity="0.1" />
        <circle cx="200" cy="133" r="8" fill="#a3e635" />
        <circle cx="200" cy="133" r="8" fill="none" stroke="#1a2e05" strokeOpacity="0.4" strokeWidth="2" />
      </motion.g>

      {/* floating coins */}
      <motion.g
        animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" }}
        style={{ transformOrigin: "34px 66px" }}
      >
        <circle cx="34" cy="66" r="17" fill="url(#wkCoin)" />
        <circle cx="34" cy="66" r="17" fill="none" stroke="#92400e" strokeOpacity="0.45" strokeWidth="2" />
        <text x="34" y="72" textAnchor="middle" fontSize="17" fontWeight="700" fill="#78350f">
          ৳
        </text>
      </motion.g>

      <motion.g
        animate={{ y: [0, -8, 0], rotate: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut", delay: 0.7 }}
        style={{ transformOrigin: "228px 84px" }}
      >
        <circle cx="228" cy="84" r="13" fill="url(#wkCoinB)" />
        <circle cx="228" cy="84" r="13" fill="none" stroke="#365314" strokeOpacity="0.5" strokeWidth="2" />
        <text x="228" y="89" textAnchor="middle" fontSize="13" fontWeight="700" fill="#365314">
          ৳
        </text>
      </motion.g>

      <motion.g
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 1.2 }}
      >
        <circle cx="206" cy="36" r="8" fill="url(#wkCoin)" opacity="0.9" />
      </motion.g>

      {/* sparkles */}
      {[
        { x: 58, y: 26, d: 0 },
        { x: 238, y: 140, d: 0.9 },
        { x: 20, y: 130, d: 1.6 },
      ].map((s, i) => (
        <motion.path
          key={i}
          d={`M ${s.x} ${s.y - 7} L ${s.x + 2.2} ${s.y - 2.2} L ${s.x + 7} ${s.y} L ${s.x + 2.2} ${s.y + 2.2} L ${s.x} ${s.y + 7} L ${s.x - 2.2} ${s.y + 2.2} L ${s.x - 7} ${s.y} L ${s.x - 2.2} ${s.y - 2.2} Z`}
          fill="#a3e635"
          animate={{ opacity: [0.15, 0.9, 0.15], scale: [0.7, 1.1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2.6, delay: s.d, ease: "easeInOut" }}
          style={{ transformOrigin: `${s.x}px ${s.y}px` }}
        />
      ))}
    </motion.svg>
  );
}
