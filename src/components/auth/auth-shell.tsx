"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

/** Shared visual frame for the sign-in and sign-up pages. */
export default function AuthShell({
  title,
  subtitle,
  children,
  shake = 0,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  shake?: number;
}) {
  return (
    <main className="grain relative grid min-h-screen place-items-center bg-[#0a0a0c] px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="ambient-blob absolute -top-32 left-[15%] h-[380px] w-[520px] rounded-full bg-lime-400/[0.06] blur-[120px]" />
        <div
          className="ambient-blob absolute right-[10%] bottom-[10%] h-[320px] w-[420px] rounded-full bg-sky-400/[0.05] blur-[120px]"
          style={{ animationDelay: "-5s" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.12 }}
            className="mx-auto grid size-14 place-items-center rounded-2xl bg-lime-400 text-lime-950 shadow-[0_0_40px_rgba(163,230,53,0.4)]"
          >
            <Check size={30} strokeWidth={3.2} />
          </motion.div>
          <h1 className="font-display mt-5 text-3xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">{subtitle}</p>
        </div>

        <motion.div
          key={shake}
          animate={shake > 0 ? { x: [0, -9, 9, -6, 6, 0] } : false}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur sm:p-7"
        >
          {children}
        </motion.div>
      </motion.div>
    </main>
  );
}

/** Reusable dark text field with a leading icon. */
export function Field({
  id,
  label,
  icon,
  trailing,
  ...props
}: {
  id: string;
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase"
      >
        {label}
      </label>
      <div className="relative mt-2">
        <span className="absolute top-1/2 left-4 -translate-y-1/2 text-zinc-500">
          {icon}
        </span>
        <input
          id={id}
          {...props}
          className={`w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 text-[15px] text-white placeholder-zinc-600 transition outline-none focus:border-lime-400/50 focus:ring-2 focus:ring-lime-400/20 ${
            trailing ? "pr-12" : "pr-4"
          }`}
        />
        {trailing}
      </div>
    </div>
  );
}
