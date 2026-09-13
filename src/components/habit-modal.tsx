import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { COLORS, COLOR_KEYS, ICONS, ICON_KEYS } from "@/lib/visuals";
import type { HabitDTO } from "@/lib/types";

export interface HabitFormValues {
  name: string;
  icon: string;
  color: string;
}

export default function HabitModal({
  open,
  editing,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: HabitDTO | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: HabitFormValues) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("target");
  const [color, setColor] = useState("lime");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the form whenever the modal is (re)opened or targets a different habit.
  const formKey = open ? (editing ? `edit-${editing.id}` : "new") : "closed";
  const [prevFormKey, setPrevFormKey] = useState(formKey);
  if (formKey !== prevFormKey) {
    setPrevFormKey(formKey);
    if (open) {
      setName(editing?.name ?? "");
      setIcon(editing?.icon ?? "target");
      setColor(editing?.color ?? "lime");
    }
  }

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const valid = name.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
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
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#101014] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-lime-400/10 blur-3xl" />

            <div className="relative flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight text-white">
                  {editing ? "Edit habit" : "New habit"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {editing ? "Tweak the details below." : "Design a ritual you can actually keep."}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={saving}
                className="grid size-9 place-items-center rounded-full border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form
              className="relative mt-5 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                if (valid && !saving) onSubmit({ name: name.trim(), icon, color });
              }}
            >
              <div>
                <label htmlFor="habit-name" className="text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                  Name
                </label>
                <input
                  id="habit-name"
                  ref={inputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Read 20 pages"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] text-white placeholder-zinc-600 transition outline-none focus:border-lime-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-lime-400/20"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                  Icon
                </span>
                <div className="mt-2 grid grid-cols-7 gap-1.5">
                  {ICON_KEYS.map((key) => {
                    const Ico = ICONS[key];
                    const active = icon === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setIcon(key)}
                        aria-label={`Icon ${key}`}
                        className={`grid aspect-square place-items-center rounded-xl border transition-all ${
                          active
                            ? "border-lime-400/60 bg-lime-400/15 text-lime-300"
                            : "border-white/[0.06] bg-white/[0.03] text-zinc-500 hover:border-white/15 hover:text-zinc-200"
                        }`}
                      >
                        <Ico size={17} strokeWidth={2} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                  Color
                </span>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  {COLOR_KEYS.map((key) => {
                    const c = COLORS[key];
                    const active = color === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setColor(key)}
                        aria-label={`Color ${key}`}
                        className={`grid size-9 place-items-center rounded-full transition-all ${
                          active ? "ring-2 ring-white/80 ring-offset-2 ring-offset-[#101014]" : "hover:scale-110"
                        }`}
                        style={{ background: c.hex }}
                      >
                        {active && <Check size={15} strokeWidth={3.2} className="text-black/70" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!valid || saving}
                  className="flex items-center gap-2 rounded-full bg-lime-400 px-6 py-2.5 text-sm font-semibold text-lime-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving && <Loader2 size={15} className="animate-spin" />}
                  {editing ? "Save changes" : "Create habit"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
