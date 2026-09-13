// Supabase-only connection settings.
//
// Momentum accepts both generations of Supabase public keys:
//   1. NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy JWT anon key)
//   2. NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (new sb_publishable_ key)
//
// The anon key is intentionally checked first because existing Vercel projects
// commonly expose that variable. A stale publishable-key variable must never
// override a valid anon key. Service-role/secret keys are never accepted.

function cleanEnvironmentValue(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  // Vercel values should not include quotes, but stripping one matching pair
  // makes pasted dotenv-style values harmless.
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

const rawUrl = cleanEnvironmentValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
const rawAnonKey = cleanEnvironmentValue(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const rawPublishableKey = cleanEnvironmentValue(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export const SUPABASE_URL = rawUrl.replace(/\/+$/, "");
export const SUPABASE_PUBLISHABLE_KEY = rawAnonKey || rawPublishableKey;

export type SupabaseKeySource =
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | null;

export const SUPABASE_KEY_SOURCE: SupabaseKeySource = rawAnonKey
  ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  : rawPublishableKey
    ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    : null;

export interface SupabaseConfigurationStatus {
  configured: boolean;
  valid: boolean;
  error: string | null;
  projectRef: string | null;
  keySource: SupabaseKeySource;
}

function projectRefFromHost(hostname: string): string | null {
  const match = /^([a-z0-9]+)\.supabase\.co$/i.exec(hostname);
  return match?.[1] ?? null;
}

/**
 * Validates configuration without making a network request or exposing keys.
 * This catches the common cause of HTML responses: putting a Vercel/app/
 * dashboard URL in NEXT_PUBLIC_SUPABASE_URL instead of the Supabase Project URL.
 */
export function getSupabaseConfigurationStatus(): SupabaseConfigurationStatus {
  if (!SUPABASE_URL && !SUPABASE_PUBLISHABLE_KEY) {
    return {
      configured: false,
      valid: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. Add them in Vercel Project Settings → Environment Variables for this deployment environment, then redeploy.",
      projectRef: null,
      keySource: null,
    };
  }

  if (!SUPABASE_URL) {
    return {
      configured: false,
      valid: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL is missing. Copy the Project URL from Supabase Dashboard → Connect, add it to Vercel, then redeploy.",
      projectRef: null,
      keySource: SUPABASE_KEY_SOURCE,
    };
  }

  if (!SUPABASE_PUBLISHABLE_KEY) {
    return {
      configured: false,
      valid: false,
      error:
        "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Copy the anon/publishable key from Supabase Dashboard → Connect, add it to Vercel, then redeploy.",
      projectRef: null,
      keySource: null,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(SUPABASE_URL);
  } catch {
    return {
      configured: true,
      valid: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL is not a valid URL. It must look like https://your-project-ref.supabase.co.",
      projectRef: null,
      keySource: SUPABASE_KEY_SOURCE,
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      configured: true,
      valid: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL must use https:// and must be the Project URL from Supabase Dashboard → Connect.",
      projectRef: null,
      keySource: SUPABASE_KEY_SOURCE,
    };
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== "/" && parsed.pathname !== "")
  ) {
    return {
      configured: true,
      valid: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL must be the project origin only (for example https://your-project-ref.supabase.co), without a path, query, or dashboard URL.",
      projectRef: projectRefFromHost(parsed.hostname),
      keySource: SUPABASE_KEY_SOURCE,
    };
  }

  const vercelHost = (process.env.VERCEL_URL ?? "").toLowerCase();
  const host = parsed.hostname.toLowerCase();
  if (
    host === vercelHost ||
    host.endsWith(".vercel.app") ||
    host.endsWith(".e2b.app") ||
    host === "supabase.com" ||
    host.endsWith(".supabase.com")
  ) {
    return {
      configured: true,
      valid: false,
      error:
        "NEXT_PUBLIC_SUPABASE_URL points to a website/dashboard instead of the Supabase API. Copy the Project URL ending in .supabase.co from Supabase Dashboard → Connect.",
      projectRef: null,
      keySource: SUPABASE_KEY_SOURCE,
    };
  }

  if (/service_role|sb_secret_/i.test(SUPABASE_PUBLISHABLE_KEY)) {
    return {
      configured: true,
      valid: false,
      error:
        "A Supabase service-role/secret key was provided. Use NEXT_PUBLIC_SUPABASE_ANON_KEY (or the public sb_publishable_ key) instead.",
      projectRef: projectRefFromHost(parsed.hostname),
      keySource: SUPABASE_KEY_SOURCE,
    };
  }

  const looksLikeJwt =
    SUPABASE_PUBLISHABLE_KEY.startsWith("eyJ") &&
    SUPABASE_PUBLISHABLE_KEY.split(".").length === 3;
  const looksLikePublishable = SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");
  if (!looksLikeJwt && !looksLikePublishable) {
    return {
      configured: true,
      valid: false,
      error:
        `${SUPABASE_KEY_SOURCE ?? "Supabase key"} is not a valid anon/publishable key. Copy it again from Supabase Dashboard → Connect without quotes or spaces.`,
      projectRef: projectRefFromHost(parsed.hostname),
      keySource: SUPABASE_KEY_SOURCE,
    };
  }

  return {
    configured: true,
    valid: true,
    error: null,
    projectRef: projectRefFromHost(parsed.hostname),
    keySource: SUPABASE_KEY_SOURCE,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigurationStatus().valid;
}

export function assertSupabaseConfigured(): void {
  const status = getSupabaseConfigurationStatus();
  if (!status.valid) throw new Error(status.error ?? "Supabase is not configured.");
}

/** Every table + view Momentum needs inside the Supabase `public` schema. */
export const REQUIRED_TABLES = [
  "profiles",
  "habits",
  "habit_logs",
  "wallet_txns",
  "xp_events",
  "progress_state",
  "quest_claims",
  "achievements",
  "public_profiles",
  "momentum_partner_progress",
] as const;

export interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

/** True when PostgREST/Postgres says the Momentum schema has not been applied. */
export function isMissingSchemaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as PostgrestLikeError;
  const code = err.code ?? "";
  if (code === "PGRST205" || code === "PGRST202" || code === "42P01") return true;
  const message = `${err.message ?? ""}`;
  return (
    /could not find the table/i.test(message) ||
    /schema cache/i.test(message) ||
    /relation .* does not exist/i.test(message)
  );
}

export const SCHEMA_MISSING_MESSAGE =
  "Momentum's tables are missing from your Supabase project. Run supabase/schema.sql in the Supabase SQL editor once, then reload.";
