"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, LogIn, User, UserPlus } from "lucide-react";
import type { AccountUser, AccountsState } from "@/lib/accounts";
import { api, apiWithWakeRetry } from "@/lib/api";
import DatabaseSetupNotice from "@/components/database-setup-notice";
import AuthShell, { Field } from "@/components/auth/auth-shell";

/** Sign-in page — username + password only. */
export default function LoginForm() {
  const router = useRouter();
  const [state, setState] = useState<AccountsState | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  // If a session already exists, go straight to the dashboard.
  useEffect(() => {
    let alive = true;
    apiWithWakeRetry<{ user: AccountUser | null }>("/api/auth/me")
      .then((res) => {
        if (alive && res.user) router.replace("/");
      })
      .catch(() => {});
    apiWithWakeRetry<AccountsState>("/api/accounts")
      .then((res) => {
        if (alive) setState(res);
      })
      .catch((failure) => {
        if (alive) {
          setSetupError(
            failure instanceof Error ? failure.message : "The database is unavailable."
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [router]);

  const canSubmit = !loading && username.trim().length > 0 && password.length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    api<{ ok: boolean; user: AccountUser }>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify({ username: username.trim(), password }),
    })
      .then(() => {
        // Full navigation so the dashboard hydrates with the fresh cookie.
        window.location.assign("/");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not sign in.");
        setShake((s) => s + 1);
        setLoading(false);
      });
  };

  if (setupError) return <DatabaseSetupNotice message={setupError} />;

  const noAccounts = state !== null && state.accounts.length === 0;
  const slotsOpen = state?.slotsOpen ?? 0;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="A private habit tracker for two. Sign in to continue."
      shake={shake}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field
          id="login-username"
          label="Username"
          icon={<User size={15} />}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          maxLength={20}
        />

        <Field
          id="login-password"
          label="Password"
          icon={<Lock size={15} />}
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="your password"
          autoComplete="current-password"
          trailing={
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-zinc-500 transition hover:text-white"
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        />

        {error && (
          <p role="alert" className="text-xs font-medium text-rose-400">
            {error}
          </p>
        )}

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 py-3 text-sm font-semibold text-lime-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <LogIn size={15} />
          )}
          {loading ? "Signing in…" : "Sign in"}
        </motion.button>
      </form>

      <div className="mt-5 border-t border-white/[0.07] pt-5 text-center">
        {noAccounts ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            Two seats, both empty. Create the first account to open the tracker.
          </p>
        ) : slotsOpen > 0 ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            One seat is still free
            {state && state.accounts.length > 0
              ? ` — ${state.accounts.map((a) => a.name).join(" and ")} already joined.`
              : "."}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-zinc-500">
            Both seats are taken. Sign in with your username.
          </p>
        )}

        {slotsOpen > 0 && (
          <Link
            href="/signup"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08] active:scale-[0.98]"
          >
            <UserPlus size={15} />
            Create an account
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
