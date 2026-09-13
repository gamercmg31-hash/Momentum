// Server-only account registry backed by **Supabase Auth + public.profiles**.
//
// Momentum never stores or hashes a password itself — Supabase Auth owns the
// credentials. This module only reads the non-secret seat metadata (name,
// color) and drives sign-up / sign-in.

import { getSupabaseAnon, getSupabaseServer } from "@/lib/supabase/server";
import {
  SCHEMA_MISSING_MESSAGE,
  isMissingSchemaError,
} from "@/lib/supabase/config";
import {
  ACCOUNT_COLORS,
  MAX_ACCOUNTS,
  nameKey,
  type AccountUser,
} from "@/lib/accounts";
import {
  emailForUsername,
  normalizeUsername,
  passwordError,
  usernameError,
} from "@/lib/username";
import { readSupabaseAuthConfiguration } from "@/lib/supabase/transport";

interface PublicProfileRow {
  id: string;
  slot: number;
  name: string;
  color: string;
}

function toUser(row: PublicProfileRow): AccountUser {
  return { id: row.id, key: row.id, name: row.name, color: row.color };
}

/** Public pre-login list: names, colors and ids only — emails stay private. */
export async function listAccounts(): Promise<AccountUser[]> {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id,slot,name,color")
    .order("slot", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) throw new Error(SCHEMA_MISSING_MESSAGE);
    throw new Error(error.message || "Supabase is unreachable.");
  }
  return ((data ?? []) as PublicProfileRow[]).map(toUser);
}

export async function accountById(userId: string): Promise<AccountUser | null> {
  const accounts = await listAccounts();
  return accounts.find((account) => account.id === userId) ?? null;
}

export async function partnerOf(userId: string): Promise<AccountUser | null> {
  const accounts = await listAccounts();
  return accounts.find((account) => account.id !== userId) ?? null;
}

export type CreateAccountResult =
  | { ok: true; user: AccountUser; requiresConfirmation: boolean }
  | { ok: false; status: number; error: string };

function seatFullError(): CreateAccountResult {
  return {
    ok: false,
    status: 409,
    error: "Both accounts already exist — this tracker is full.",
  };
}

/**
 * Create one of exactly two Supabase Auth accounts.
 *
 * The `momentum_on_auth_user_created` trigger creates the matching
 * `public.profiles` row (and refuses a third seat at the database level).
 */
export async function createAccount(input: {
  username: string;
  password: string;
  color?: string;
}): Promise<CreateAccountResult> {
  const username = normalizeUsername(input.username);
  const badUsername = usernameError(username);
  if (badUsername) return { ok: false, status: 400, error: badUsername };

  const badPassword = passwordError(input.password);
  if (badPassword) return { ok: false, status: 400, error: badPassword };

  // The username IS the display name; the address is internal only.
  const name = username;
  const email = emailForUsername(username);

  let existing: AccountUser[];
  try {
    existing = await listAccounts();
  } catch (error) {
    return {
      ok: false,
      status: 503,
      error: error instanceof Error ? error.message : SCHEMA_MISSING_MESSAGE,
    };
  }

  if (existing.length >= MAX_ACCOUNTS) return seatFullError();
  if (existing.some((user) => nameKey(user.name) === nameKey(name))) {
    return {
      ok: false,
      status: 409,
      error: `“${name}” is already taken — pick another username.`,
    };
  }

  const authConfiguration = await readSupabaseAuthConfiguration();
  if (!authConfiguration.ok) {
    return {
      ok: false,
      status: 503,
      error:
        authConfiguration.error ?? "Could not verify Supabase Auth settings.",
    };
  }
  if (!authConfiguration.signupsEnabled) {
    return {
      ok: false,
      status: 503,
      error:
        "Email/password signups are disabled in Supabase. Enable the Email provider in Authentication → Sign In / Providers.",
    };
  }
  if (!authConfiguration.emailConfirmationDisabled) {
    return {
      ok: false,
      status: 503,
      error:
        "Turn off Confirm email in Supabase Authentication → Sign In / Providers → Email before creating username accounts.",
    };
  }

  const slot = existing.length + 1;
  const color =
    input.color && /^#[0-9a-fA-F]{6}$/.test(input.color)
      ? input.color.toLowerCase()
      : ACCOUNT_COLORS[slot - 1] ?? ACCOUNT_COLORS[0];

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: { name, color, name_key: nameKey(name) } },
  });

  if (error) {
    const message = error.message || "";
    if (/MOMENTUM_FULL/i.test(message)) return seatFullError();
    if (/already registered|already been registered|User already/i.test(message)) {
      return { ok: false, status: 409, error: "That username is already taken." };
    }
    if (/Database error saving new user/i.test(message)) {
      return {
        ok: false,
        status: 409,
        error:
          "Supabase rejected the new seat. Either both accounts already exist, or supabase/schema.sql has not been run yet.",
      };
    }
    if (/sending confirmation|smtp|email/i.test(message) && /error|failed/i.test(message)) {
      return {
        ok: false,
        status: 503,
        error:
          "Supabase could not send the confirmation email. In the Supabase dashboard open Authentication → Sign In / Providers → Email and turn “Confirm email” off, then try again.",
      };
    }
    if (/invalid/i.test(message) && /email/i.test(message)) {
      return {
        ok: false,
        status: 400,
        error:
          "Supabase rejected the internal address for this username. Pick a simpler username (letters and numbers only).",
      };
    }
    return { ok: false, status: 400, error: message || "Could not create the account." };
  }

  const user = data.user;
  if (!user) {
    return { ok: false, status: 500, error: "Could not create the account." };
  }

  return {
    ok: true,
    user: { id: user.id, key: user.id, name, color },
    requiresConfirmation: !data.session,
  };
}
