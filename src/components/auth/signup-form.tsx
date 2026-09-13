"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import {
  ACCOUNT_COLOR_CHOICES,
  nameKey,
  type AccountUser,
  type AccountsState,
} from "@/lib/accounts";
import {
  PASSWORD_MIN,
  normalizeUsername,
  passwordError,
  usernameError,
} from "@/lib/username";
import { api, apiWithWakeRetry } from "@/lib/api";
import DatabaseSetupNotice from "@/components/database-setup-notice";
import AuthShell, { Field } from "@/components/auth/auth-shell";

/** Sign-up page — claim one of exactly two seats with a username + password. */
export default function SignupForm() {
  const [state, setState] = useState<AccountsState | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [color, setColor] = useState<string>(ACCOUNT_COLOR_CHOICES[0]);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<AccountUser | null>(null);

  useEffect(() => {
    let alive = true;
    apiWithWakeRetry<AccountsState>("/api/accounts")
      .then((res) => {
        if (!alive) return;
        setState(res);
        const used = new Set(res.accounts.map((a) => a.color));
        setColor(
          ACCOUNT_COLOR_CHOICES.find((c) => !used.has(c)) ?? ACCOUNT_COLOR_CHOICES[0]
        );
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
  }, []);

  const taken = new Set((state?.accounts ?? []).map((a) => nameKey(a.name)));
  const full = state ? state.slotsOpen <= 0 : false;
  const clean = normalizeUsername(username);

  const clientError = (() => {
    if (username.length > 0) {
      const bad = usernameError(username);
      if (bad) return bad;
      if (taken.has(nameKey(clean))) return `“${clean}” is already taken.`;
    }
    if (password.length > 0) {
      const bad = passwordError(password);
      if (bad) return bad;
    }
    if (confirm.length > 0 && confirm !== password) return "Passwords don't match.";
    return null;
  })();

  const canSubmit =
    !loading &&
    !full &&
    state !== null &&
    clientError === null &&
    usernameError(username) === null &&
    !taken.has(nameKey(clean)) &&
    password.length >= PASSWORD_MIN &&
    confirm === password;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    api<{ ok: boolean; user: AccountUser; requiresConfirmation: boolean }>(
      "/api/accounts",
      {
        method: "POST",
        body: JSON.stringify({ username: clean, password, color }),
      }
    )
      .then((res) => setDone(res.user))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not create the account.");
        setLoading(false);
        apiWithWakeRetry<AccountsState>("/api/accounts").then(setState).catch(() => {});
      });
  };

  if (setupError) return <DatabaseSetupNotice message={setupError} />;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Two seats, one tracker. Claim yours with a username."
    >
      <AnimatePresence mode="wait">
        {done ? (
          /* ---- created ---------------------------------------------------- */
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
              className="mx-auto grid size-14 place-items-center rounded-full bg-lime-400 text-lime-950"
            >
              <Check size={26} strokeWidth={3} />
            </motion.div>
            <h2 className="font-display mt-4 text-lg font-semibold text-white">
              Welcome, {done.name}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              Your account is ready — sign in any time with the username{" "}
              <span className="font-semibold text-zinc-300">{done.name}</span>.
            </p>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 py-3 text-sm font-semibold text-lime-950 transition hover:bg-lime-300 active:scale-[0.98]"
            >
              Enter Momentum
            </button>
          </motion.div>
        ) : full ? (
          /* ---- closed ----------------------------------------------------- */
          <motion.div
            key="full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-white/[0.05] text-zinc-400">
              <ShieldCheck size={24} />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              Both seats are taken
              {state && state.accounts.length > 0
                ? ` — ${state.accounts.map((a) => a.name).join(" and ")} hold them.`
                : "."}{" "}
              No further accounts can ever be created.
            </p>
            <Link
              href="/login"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08] active:scale-[0.98]"
            >
              <ArrowLeft size={15} />
              Go to sign in
            </Link>
          </motion.div>
        ) : (
          /* ---- form ------------------------------------------------------- */
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={submit}
            className="space-y-4"
          >
            <Field
              id="signup-username"
              label="Username"
              icon={<User size={15} />}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3–20 characters"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              maxLength={20}
            />

            <Field
              id="signup-password"
              label="Password"
              icon={<Lock size={15} />}
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`At least ${PASSWORD_MIN} characters`}
              autoComplete="new-password"
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

            <Field
              id="signup-confirm"
              label="Repeat password"
              icon={<Lock size={15} />}
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
            />

            <div>
              <span className="block text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                Your color
              </span>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {ACCOUNT_COLOR_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setColor(choice)}
                    aria-label={`Choose ${choice}`}
                    aria-pressed={color === choice}
                    className={`size-8 rounded-full transition ${
                      color === choice
                        ? "ring-2 ring-white/70 ring-offset-2 ring-offset-[#0f0f12]"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    style={{ background: choice }}
                  />
                ))}
              </div>
            </div>

            {(clientError || error) && (
              <p role="alert" className="text-xs font-medium text-rose-400">
                {error ?? clientError}
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
                <UserPlus size={15} />
              )}
              {loading ? "Creating…" : "Create account"}
            </motion.button>

            <p className="pt-1 text-center text-xs text-zinc-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-lime-300 transition hover:text-lime-200"
              >
                Sign in
              </Link>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
