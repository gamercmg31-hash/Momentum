// ---------------------------------------------------------------------------
// Account identities — public, non-secret info (safe for client bundles).
//
// Accounts are NOT hardcoded: the two owners create them through Supabase Auth.
// The public seat list comes only from the Supabase `public_profiles` view and
// is exposed to the client (without secrets) through GET /api/accounts.
// ---------------------------------------------------------------------------

export interface AccountUser {
  id: string;
  key: string;
  name: string;
  color: string;
}

/** This is a private tracker for exactly two people — never more. */
export const MAX_ACCOUNTS = 2;

/** Display color assigned by creation order (overridable at creation). */
export const ACCOUNT_COLORS = ["#a3e635", "#38bdf8"] as const;

/** Palette offered on the account-creation page. */
export const ACCOUNT_COLOR_CHOICES = [
  "#a3e635",
  "#38bdf8",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
  "#34d399",
  "#fb7185",
  "#22d3ee",
] as const;

/** Shape returned by GET /api/accounts. */
export interface AccountsState {
  accounts: AccountUser[];
  /** Exact number of live Supabase-backed seats currently occupied. */
  seatsTaken: number;
  /** How many slots are still open (0 → creation closed). */
  slotsOpen: number;
  maxAccounts: number;
  /** Makes the persistence source explicit for diagnostics and deployment checks. */
  source: "supabase";
}

export function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
