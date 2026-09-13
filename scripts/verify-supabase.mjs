#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Momentum — Supabase end-to-end verification.
//
//   node scripts/verify-supabase.mjs <username1> <password1> <username2> <password2>
//
// It proves, against the real Supabase project, that:
//   1. the project is reachable with only the publishable (anon) key
//   2. the Momentum schema exists
//   3. both owners can sign in through Supabase Auth
//   4. habits / wallet / XP writes are persisted and read back
//   5. RLS keeps wallets private and Level/XP shared
//   6. an anonymous visitor can read nothing but the seat picker
//
// It creates one throwaway habit + one throwaway wallet row per owner and
// deletes them again. No existing data is ever modified or removed.
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    /* .env is optional */
  }
}
loadEnv();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const pass = (m) => console.log(`  \u001b[32m✓\u001b[0m ${m}`);
const fail = (m) => console.log(`  \u001b[31m✗\u001b[0m ${m}`);
const info = (m) => console.log(`  \u001b[36mi\u001b[0m ${m}`);
let failures = 0;
const check = (ok, m) => (ok ? pass(m) : (failures++, fail(m)));

function client() {
  return createClient(URL_, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(username, password) {
  const sb = client();
  const clean = username.trim().toLowerCase();
  const email = clean.includes("@") ? clean : `${clean}@momentum-users.app`;
  const res = await sb.auth.signInWithPassword({ email, password });
  if (res.error || !res.data.user) {
    return { error: res.error?.message || "sign-in failed" };
  }
  return { sb, user: res.data.user };
}

async function main() {
  console.log("\nMomentum → Supabase verification\n");

  if (!URL_ || !KEY) {
    fail(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set"
    );
    process.exit(1);
  }
  info(`project ${URL_}`);
  check(!/service_role|secret/i.test(KEY), "only the publishable key is used");

  // 1 — reachability + schema -------------------------------------------------
  const anon = client();
  const seats = await anon.from("public_profiles").select("id,name,color,slot");
  if (seats.error) {
    if (/schema cache|does not exist/i.test(seats.error.message)) {
      fail("Momentum schema is NOT applied yet");
      console.log(
        "\n  → Open the Supabase SQL editor and run supabase/schema.sql once:\n" +
          `    https://supabase.com/dashboard/project/${URL_.replace(/^https?:\/\//, "").split(".")[0]}/sql/new\n`
      );
      process.exit(1);
    }
    fail(`Supabase error: ${seats.error.message}`);
    process.exit(1);
  }
  pass(`Supabase reachable — schema applied (${seats.data.length} seat(s) registered)`);

  // 2 — anonymous visitors are locked out ------------------------------------
  for (const table of ["habits", "wallet_txns", "xp_events", "profiles"]) {
    const probe = await anon.from(table).select("*").limit(1);
    const blocked = Boolean(probe.error) || (probe.data ?? []).length === 0;
    check(blocked, `anon cannot read ${table}`);
  }

  // 3 — both owners sign in ---------------------------------------------------
  const [username1, password1, username2, password2] = process.argv.slice(2);
  if (!username1 || !password1 || !username2 || !password2) {
    info("no credentials passed — skipping the two-account round trip");
    info(
      "usage: node scripts/verify-supabase.mjs <username1> <pw1> <username2> <pw2>"
    );
    process.exit(failures ? 1 : 0);
  }

  const a = await signIn(username1, password1);
  const b = await signIn(username2, password2);
  if (a.error) { fail(`account 1: ${a.error}`); process.exit(1); }
  if (b.error) { fail(`account 2: ${b.error}`); process.exit(1); }
  pass(`account 1 signed in (${a.user.id.slice(0, 8)}…)`);
  pass(`account 2 signed in (${b.user.id.slice(0, 8)}…)`);
  check(a.user.id !== b.user.id, "the two accounts are distinct Supabase users");

  // 4 — profiles are isolated --------------------------------------------------
  const prof1 = await a.sb.from("profiles").select("id,name").eq("id", b.user.id);
  check((prof1.data ?? []).length === 0, "owner 1 cannot read owner 2's private profile row");

  // 5 — write + read back ------------------------------------------------------
  const stamp = Date.now();
  const h = await a.sb
    .from("habits")
    .insert({
      user_id: a.user.id,
      name: `verify-${stamp}`,
      icon: "book-open",
      color: "violet",
      sort_order: 9999,
      created_key: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  check(!h.error, `habit written to Supabase${h.error ? `: ${h.error.message}` : ""}`);

  if (h.data) {
    const back = await a.sb.from("habits").select("name").eq("id", h.data.id).single();
    check(back.data?.name === `verify-${stamp}`, "habit read back from Supabase (persisted)");

    const log = await a.sb.from("habit_logs").upsert({
      user_id: a.user.id,
      habit_id: h.data.id,
      date: new Date().toISOString().slice(0, 10),
      status: "completed",
    });
    check(!log.error, "habit log written");

    const steal = await b.sb.from("habits").delete().eq("id", h.data.id).select();
    check((steal.data ?? []).length === 0, "owner 2 cannot delete owner 1's habit (RLS)");

    await a.sb.from("habit_logs").delete().eq("user_id", a.user.id).eq("habit_id", h.data.id);
    await a.sb.from("habits").delete().eq("id", h.data.id);
  }

  // 6 — wallet stays private ----------------------------------------------------
  const txnId = `verify-${stamp}`;
  const w = await a.sb.from("wallet_txns").insert({
    id: txnId,
    user_id: a.user.id,
    name: "Verification cash",
    category: "Other",
    amount: "12.34",
    type: "income",
    date: new Date().toISOString().slice(0, 10),
    created_at: stamp,
  });
  check(!w.error, `wallet transaction written${w.error ? `: ${w.error.message}` : ""}`);

  const mine = await a.sb.from("wallet_txns").select("amount").eq("id", txnId).maybeSingle();
  check(Number(mine.data?.amount) === 12.34, "wallet transaction read back (money-bag / Cash data intact)");

  const theirs = await b.sb.from("wallet_txns").select("id").eq("id", txnId);
  check((theirs.data ?? []).length === 0, "owner 2 cannot read owner 1's wallet (RLS)");

  await a.sb.from("wallet_txns").delete().eq("id", txnId);

  // 7 — XP is private to write, shared to read -----------------------------------
  const xpKey = `verify:${stamp}`;
  const xp = await a.sb.from("xp_events").insert({
    user_id: a.user.id,
    key: xpKey,
    label: "Verification",
    amount: 5,
    day: new Date().toISOString().slice(0, 10),
    at_ms: stamp,
  });
  check(!xp.error, `XP event written${xp.error ? `: ${xp.error.message}` : ""}`);

  const dup = await a.sb
    .from("xp_events")
    .upsert(
      [{ user_id: a.user.id, key: xpKey, label: "Verification", amount: 5, day: "x", at_ms: stamp }],
      { onConflict: "user_id,key", ignoreDuplicates: true }
    )
    .select();
  check((dup.data ?? []).length === 0, "duplicate XP key is ignored (idempotent grants)");

  const shared = await b.sb.from("xp_events").select("key").eq("user_id", a.user.id).eq("key", xpKey);
  check((shared.data ?? []).length === 1, "owner 2 CAN read owner 1's XP (shared by design)");

  const forge = await b.sb
    .from("xp_events")
    .insert({ user_id: a.user.id, key: `forged:${stamp}`, label: "x", amount: 999, day: "x", at_ms: stamp })
    .select();
  check(Boolean(forge.error), "owner 2 cannot forge XP for owner 1 (RLS)");

  const board = await b.sb.from("momentum_partner_progress").select("user_id,name,level,total_xp");
  check(!board.error && (board.data ?? []).length > 0, "shared Level/XP board is readable by both owners");

  await a.sb.from("xp_events").delete().eq("user_id", a.user.id).eq("key", xpKey);

  console.log(
    failures === 0
      ? "\n\u001b[32mAll Supabase checks passed.\u001b[0m\n"
      : `\n\u001b[31m${failures} check(s) failed.\u001b[0m\n`
  );
  process.exit(failures ? 1 : 0);
}

main().catch((error) => {
  fail(error?.message ?? String(error));
  process.exit(1);
});
