import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, KeyRound, Loader2, Lock, X } from "lucide-react";
import { api } from "@/lib/api";

/** Change-password modal — available from the dashboard header. */
export default function PasswordModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // The dialog is mounted only while it is open, so every field starts empty
  // again on each visit without resetting state from inside an effect.
  return (
    <AnimatePresence>{open && <PasswordDialog onClose={onClose} />}</AnimatePresence>
  );
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The API rejects anything shorter than 6 characters — keep the button in sync.
  const valid = current.length > 0 && next.length >= 6 && confirm === next;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    api<{ ok: boolean }>("/api/auth/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    })
      .then(() => setDone(true))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not change the password.");
      })
      .finally(() => setSaving(false));
  };

  return (
    <>
      {
        <div className="fixed inset-0 z-[70] grid place-items-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={saving ? undefined : onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#101014] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-lime-400/10 blur-3xl" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 z-20 grid size-8 place-items-center rounded-full text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
            >
              <X size={15} />
            </button>

            {done ? (
              <div className="relative py-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 16 }}
                  className="mx-auto grid size-12 place-items-center rounded-full bg-lime-400 text-lime-950"
                >
                  <Check size={22} strokeWidth={3} />
                </motion.div>
                <h3 className="font-display mt-4 text-lg font-semibold text-white">
                  Password updated
                </h3>
                <p className="mt-1.5 text-sm text-zinc-500">
                  Use the new one next time you sign in.
                </p>
                <button
                  onClick={onClose}
                  className="mt-5 w-full rounded-xl bg-lime-400 py-3 text-sm font-semibold text-lime-950 transition hover:bg-lime-300 active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-lime-400/15 text-lime-300">
                    <KeyRound size={18} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold tracking-tight text-white">
                      Change password
                    </h3>
                    <p className="text-xs text-zinc-500">Only for your account.</p>
                  </div>
                </div>

                <label
                  htmlFor="pw-current"
                  className="mt-5 block text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase"
                >
                  Current password
                </label>
                <div className="relative mt-2">
                  <Lock size={15} className="absolute top-1/2 left-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="pw-current"
                    type={showPw ? "text" : "password"}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    autoFocus
                    autoComplete="current-password"
                    placeholder="Current password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pr-12 pl-11 text-[15px] text-white placeholder-zinc-600 transition outline-none focus:border-lime-400/50 focus:ring-2 focus:ring-lime-400/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-zinc-500 transition hover:text-white"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <label
                  htmlFor="pw-next"
                  className="mt-4 block text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase"
                >
                  New password
                </label>
                <div className="relative mt-2">
                  <Lock size={15} className="absolute top-1/2 left-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    id="pw-next"
                    type={showPw ? "text" : "password"}
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-[15px] text-white placeholder-zinc-600 transition outline-none focus:border-lime-400/50 focus:ring-2 focus:ring-lime-400/20"
                  />
                </div>

                <input
                  aria-label="Confirm new password"
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  className="mt-2.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder-zinc-600 transition outline-none focus:border-lime-400/50 focus:ring-2 focus:ring-lime-400/20"
                />

                {next.length > 0 && next.length < 6 && (
                  <p className="mt-2.5 text-xs font-medium text-rose-400">
                    New password must be at least 6 characters.
                  </p>
                )}
                {confirm.length > 0 && confirm !== next && (
                  <p className="mt-2.5 text-xs font-medium text-rose-400">
                    Passwords don’t match.
                  </p>
                )}
                {error && (
                  <p className="mt-2.5 text-xs font-medium text-rose-400">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={!valid || saving}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 py-3 text-sm font-semibold text-lime-950 transition hover:bg-lime-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={15} />}
                  {saving ? "Updating…" : "Update password"}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      }
    </>
  );
}
