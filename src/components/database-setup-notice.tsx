"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Database,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { SetupStatus } from "@/app/api/setup/route";
import { api } from "@/lib/api";

/**
 * Shown when the Supabase-backed API cannot be reached, or when the Momentum
 * schema has never been applied to the Supabase project. Momentum keeps every
 * habit, wallet and XP record in Supabase, so this is the only blocking
 * failure the sign-in flow can hit.
 */
export default function DatabaseSetupNotice({ message }: { message?: string }) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api<SetupStatus>("/api/setup")
      .then((data) => {
        if (alive) setStatus(data);
      })
      .catch((error) => {
        if (alive) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load Supabase connection diagnostics."
          );
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const needsSchema = Boolean(status && status.reachable && !status.schemaReady);
  const configurationProblem = Boolean(status && !status.configurationValid);
  const diagnosticMessage = status?.error ?? loadError ?? message ?? null;

  async function copySql() {
    if (!status?.sql) return;
    try {
      await navigator.clipboard.writeText(status.sql);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`w-full ${needsSchema ? "max-w-2xl" : "max-w-md"} rounded-3xl border border-white/[0.08] bg-white/[0.03] p-7 text-center backdrop-blur`}
      >
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
          <Database size={25} />
        </div>
        <p className="mt-4 text-[10px] font-bold tracking-[0.2em] text-amber-400 uppercase">
          {needsSchema
            ? "One-time Supabase setup"
            : configurationProblem
              ? "Supabase configuration error"
              : "Supabase unreachable"}
        </p>
        <h1 className="font-display mt-1.5 text-2xl font-semibold tracking-tight text-white">
          {needsSchema
            ? "Finish connecting Momentum to Supabase"
            : configurationProblem
              ? "Check the Vercel environment variables"
              : "Momentum can't reach Supabase"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          {needsSchema ? (
            <>
              Momentum is pointed at Supabase project{" "}
              <span className="font-mono text-zinc-300">{status?.projectRef}</span>,
              but its tables do not exist yet. Run the migration once — it only
              creates missing objects and never deletes data.
            </>
          ) : configurationProblem ? (
            "The app is running, but this deployment does not have a valid Supabase Project URL and public key."
          ) : (
            "The configuration format is valid, but the Supabase API did not return the expected JSON response."
          )}
        </p>

        {needsSchema ? (
          <div className="mt-6 text-left">
            <ol className="space-y-2 text-sm text-zinc-400">
              <li className="flex gap-2">
                <span className="font-semibold text-lime-400">1.</span>
                <span>
                  Open the{" "}
                  <a
                    href={status?.sqlEditorUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-lime-400 underline-offset-2 hover:underline"
                  >
                    Supabase SQL editor <ExternalLink size={12} />
                  </a>
                  , paste the SQL below and press <strong>Run</strong>.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-lime-400">2.</span>
                <span>
                  In{" "}
                  <a
                    href={status?.authProvidersUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-lime-400 underline-offset-2 hover:underline"
                  >
                    Authentication → Sign In / Providers → Email{" "}
                    <ExternalLink size={12} />
                  </a>
                  , turn <strong>Confirm email</strong> off (private 2-person
                  tracker — no inbox round-trip needed).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-lime-400">3.</span>
                <span>Come back here and press “Check again”.</span>
              </li>
            </ol>

            <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/40">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                <span className="font-mono text-[11px] text-zinc-500">
                  supabase/schema.sql
                </span>
                <button
                  type="button"
                  onClick={copySql}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/[0.12]"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy SQL"}
                </button>
              </div>
              <pre className="max-h-56 overflow-auto p-3 text-left font-mono text-[10.5px] leading-relaxed whitespace-pre text-zinc-400">
                {status?.sql ?? ""}
              </pre>
            </div>
          </div>
        ) : null}

        {diagnosticMessage && !needsSchema ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-amber-400/15 bg-black/30 p-3 text-left text-xs leading-relaxed text-zinc-300"
          >
            {diagnosticMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-400 px-4 py-3 text-sm font-semibold text-lime-950 transition hover:bg-lime-300"
        >
          <RefreshCw size={16} />
          {needsSchema ? "Check again" : "Try again"}
        </button>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
          <ShieldCheck size={13} />
          Row Level Security keeps each owner&rsquo;s data private in Supabase.
        </p>
      </motion.div>
    </main>
  );
}
