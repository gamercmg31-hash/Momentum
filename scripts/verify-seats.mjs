#!/usr/bin/env node

// Read-only deployment check for Momentum's Supabase-backed seat lifecycle.
// Usage:
//   node scripts/verify-seats.mjs https://your-app.vercel.app 0
//   node scripts/verify-seats.mjs https://your-app.vercel.app 1
//   node scripts/verify-seats.mjs https://your-app.vercel.app 2

const appUrl = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");
const expected = Number(process.argv[3] ?? 0);

if (!Number.isInteger(expected) || expected < 0 || expected > 2) {
  console.error("Expected seat count must be 0, 1, or 2.");
  process.exit(2);
}

const response = await fetch(`${appUrl}/api/accounts`, {
  headers: { accept: "application/json" },
  cache: "no-store",
});
const text = await response.text();
let payload;
try {
  payload = JSON.parse(text);
} catch {
  throw new Error(`Accounts endpoint returned non-JSON (HTTP ${response.status}).`);
}

if (!response.ok) {
  throw new Error(payload?.error || `Accounts endpoint failed (HTTP ${response.status}).`);
}
if (payload.source !== "supabase") {
  throw new Error(`Unexpected account source: ${String(payload.source)}`);
}
if (!Array.isArray(payload.accounts)) {
  throw new Error("Accounts endpoint did not return an accounts array.");
}
if (payload.seatsTaken !== payload.accounts.length) {
  throw new Error("seatsTaken does not match the real Supabase account rows.");
}
if (payload.seatsTaken !== expected) {
  throw new Error(
    `Expected ${expected} occupied seat(s), found ${payload.seatsTaken}: ${payload.accounts
      .map((account) => account.name)
      .join(", ") || "none"}.`
  );
}
if (payload.slotsOpen !== 2 - expected || payload.maxAccounts !== 2) {
  throw new Error("Seat availability values are inconsistent with the two-seat limit.");
}

console.log(
  JSON.stringify(
    {
      ok: true,
      source: payload.source,
      seatsTaken: payload.seatsTaken,
      slotsOpen: payload.slotsOpen,
      accounts: payload.accounts.map(({ id, name, color }) => ({ id, name, color })),
    },
    null,
    2
  )
);
