"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { DatabaseBackup, Download, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Data safety panel — download a full JSON backup of your history, or restore
 * from one if something ever goes wrong. Only ever touches your own account.
 */
export default function BackupCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"download" | "restore" | null>(null);
  const [note, setNote] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const download = async () => {
    setBusy("download");
    setNote(null);
    try {
      // plain navigation — the server responds with a file attachment
      window.location.assign("/api/backup");
    } finally {
      setTimeout(() => setBusy(null), 1200);
    }
  };

  const restore = async (file: File) => {
    const ok = window.confirm(
      `Restore "${file.name}"?\n\nThis replaces YOUR current data with the backup. Your partner's data is never touched.`
    );
    if (!ok) return;
    setBusy("restore");
    setNote(null);
    try {
      const text = await file.text();
      const dump = JSON.parse(text);
      await api("/api/backup/restore", {
        method: "POST",
        body: JSON.stringify(dump),
      });
      setNote({ tone: "ok", text: "Backup restored — reloading your data…" });
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setNote({
        tone: "err",
        text: e instanceof Error ? e.message : "Restore failed.",
      });
      setBusy(null);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mt-10 rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 sm:p-7"
    >
      <div className="flex items-center gap-2">
        <span className="text-emerald-300">
          <ShieldCheck size={14} />
        </span>
        <h3 className="text-[11px] font-bold tracking-[0.22em] text-zinc-400 uppercase">
          data &amp; backup
        </h3>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <p className="max-w-xl text-xs leading-relaxed text-zinc-500">
          Everything — habits, history, streaks, wallet, XP and quests — lives in a
          persistent database and survives updates and redeploys. Export a full
          snapshot of your account any time; restore it if anything ever goes wrong.
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={download}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-full bg-lime-400 px-4 py-2 text-[13px] font-semibold text-lime-950 transition hover:bg-lime-300 disabled:opacity-60"
          >
            {busy === "download" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} strokeWidth={2.6} />
            )}
            Download backup
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[13px] font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-60"
          >
            {busy === "restore" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} className="text-sky-300" />
            )}
            Restore from backup
          </motion.button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void restore(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {note && (
        <p
          className={`mt-3 flex items-center gap-1.5 text-xs ${
            note.tone === "ok" ? "text-lime-300" : "text-rose-300"
          }`}
        >
          <DatabaseBackup size={12} />
          {note.text}
        </p>
      )}
    </motion.section>
  );
}
