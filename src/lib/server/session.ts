// Server-only session handling backed by **Supabase Auth**.
//
// Supabase issues the JWT + refresh token and @supabase/ssr stores them in
// HttpOnly cookies, so a session survives refreshes, new logins, other devices
// and redeployments. Momentum never stores a password itself.

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/config";
import type { AccountUser } from "@/lib/accounts";

export const SESSION_COOKIE = "sb-momentum-session";

export interface SessionContext {
  user: AccountUser;
  email: string;
  supabase: SupabaseClient;
  /** Profile row exists in `public.profiles` (schema applied + trigger ran). */
  hasProfile: boolean;
}

interface ProfileRow {
  id: string;
  name: string;
  color: string;
  seeded: boolean;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  let row: ProfileRow | null = null;
  // `email` is deliberately NOT selected: the profiles table exposes only
  // non-secret columns over the API (see supabase/schema.sql, section 6).
  // The authoritative address always comes from Supabase Auth itself.
  const result = await supabase
    .from("profiles")
    .select("id,name,color,seeded")
    .eq("id", user.id)
    .maybeSingle();

  if (result.error && !isMissingSchemaError(result.error)) {
    // A transient read failure must not log the owner out.
    row = null;
  } else {
    row = (result.data as ProfileRow | null) ?? null;
  }

  const metadata = (user.user_metadata ?? {}) as {
    name?: string;
    color?: string;
  };
  const name =
    row?.name ?? metadata.name ?? (user.email ?? "Owner").split("@")[0];
  const color = row?.color ?? metadata.color ?? "#a3e635";

  return {
    user: { id: user.id, key: user.id, name, color },
    email: user.email ?? "",
    supabase,
    hasProfile: Boolean(row),
  };
}

export async function getSessionUser(): Promise<AccountUser | null> {
  return (await getSessionContext())?.user ?? null;
}

export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new Error("Unauthorized");
  return ctx;
}

export async function requireOwner(userId: string): Promise<SessionContext> {
  const ctx = await requireSession();
  if (ctx.user.id !== userId) throw new Error("Unauthorized");
  return ctx;
}

export async function requireUserId(userId: string): Promise<void> {
  await requireOwner(userId);
}

export async function destroySession(): Promise<void> {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
}
