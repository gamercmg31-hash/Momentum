// ---------------------------------------------------------------------------
// Username identities.
//
// Momentum signs in with a **username + password** — no email is ever asked
// for. Supabase Auth, however, requires an email address for a password
// identity, so each username is mapped to a stable, private, internal address
// (`<username>@momentum.local`). That address is an implementation detail: it
// is never shown, never emailed and never used for confirmation links.
//
// Keeping the mapping here means the Supabase integration itself is untouched.
// ---------------------------------------------------------------------------

/**
 * Internal domain used to build the synthetic Supabase Auth address.
 * A normal public suffix is required by Supabase Auth's email validator.
 * Confirmation is disabled, so Momentum never sends mail to this address.
 */
export const USERNAME_EMAIL_DOMAIN = "momentum-users.app";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/** Letters, digits, dot, underscore and dash — case-insensitive. */
const USERNAME_RE = /^[a-z0-9._-]+$/;

/** Canonical form of a username (lowercase, trimmed). */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Human-readable reason the username is unusable, or `null` when it is fine. */
export function usernameError(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (username.length < USERNAME_MIN) {
    return `Username must be at least ${USERNAME_MIN} characters.`;
  }
  if (username.length > USERNAME_MAX) {
    return `Username must be at most ${USERNAME_MAX} characters.`;
  }
  if (!USERNAME_RE.test(username)) {
    return "Use only letters, numbers, dots, underscores and dashes.";
  }
  if (!/^[a-z0-9]/.test(username)) {
    return "Username must start with a letter or a number.";
  }
  return null;
}

export function isValidUsername(raw: string): boolean {
  return usernameError(raw) === null;
}

/** The internal Supabase Auth address for a username. */
export function emailForUsername(raw: string): string {
  return `${normalizeUsername(raw)}@${USERNAME_EMAIL_DOMAIN}`;
}

/** Recover the username from an internal address (or `null` for real emails). */
export function usernameFromEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  const suffix = `@${USERNAME_EMAIL_DOMAIN}`;
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : null;
}

export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 100;

export function passwordError(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  if (password.length > PASSWORD_MAX) {
    return `Password must be at most ${PASSWORD_MAX} characters.`;
  }
  return null;
}
