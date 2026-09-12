# Momentum — Personal Habit Tracker for Two

Momentum is a private two-person habit tracker with daily rituals, streaks,
weekly progress, a consistency heatmap, a Wallet money ledger (money-bag +
**Cash** design) and an Ascend XP / level / quest system.

## Storage — Supabase

**Supabase is the production database and the identity provider.** Every habit,
log, wallet transaction, XP event, quest claim and achievement lives in Supabase
PostgreSQL, so data survives refreshes, sign-outs, other devices and
redeployments. There is no localStorage fallback and no ephemeral/local
PostgreSQL anywhere in the stack.

| Table / view                 | Purpose                                            |
| ---------------------------- | -------------------------------------------------- |
| `profiles`                   | The two account seats (name, color, seat number)    |
| `habits`                     | Each owner's rituals                                |
| `habit_logs`                 | Completion / skip history (streak source data)      |
| `wallet_txns`                | Income & expense ledger — **strictly private**      |
| `xp_events`                  | Immutable, idempotent XP ledger                     |
| `progress_state`             | Cached total XP + level                             |
| `quest_claims`               | Claimed quests — private                            |
| `achievements`               | Unlocked achievements — private                     |
| `public_profiles` (view)     | Pre-login seat picker: names + colors, never emails |
| `momentum_partner_progress`  | Shared Level / XP board for both owners             |

Sessions are Supabase Auth JWT + refresh tokens stored in **HttpOnly cookies**
by `@supabase/ssr`. Momentum never stores or hashes a password itself.

## Accounts: username + password

Momentum signs in with a **username and password** — no email is ever asked for.

| Page          | Purpose                                       |
| ------------- | --------------------------------------------- |
| `/login`      | Sign in with username + password              |
| `/signup`     | Claim one of the two seats (username, password, color) |
| `/`           | The dashboard — redirects to `/login` when signed out  |

Usernames are 3–20 characters (letters, numbers, `.`, `_`, `-`), case-insensitive
and unique across the two seats. Passwords must be at least 6 characters.

Supabase Auth requires an email for a password identity, so each username is
mapped to a stable internal address (`<username>@momentum.local`) in
[`src/lib/username.ts`](src/lib/username.ts). That address is an implementation
detail — it is never shown, never emailed, and no confirmation link is involved.
The Supabase integration itself is unchanged.

## Configuration

Two environment variables — and only the **publishable (anon)** key. The
service-role / secret key and the database password are never used, never read
and never shipped.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-anon-key>
```

Credentials are always read from the environment; they are never hard-coded in
the source.

## Running without Supabase (zero-config fallback)

Supabase always wins when it is configured. If the two variables above are
**missing**, Momentum automatically falls back to the bundled PostgreSQL
database pointed at by `DATABASE_URL`, so the app is fully usable — sign-up,
sign-in, habits, streaks, wallet, XP, quests, partner board and backups all
work out of the box.

* The fallback applies the **same tables, columns, views and privacy rules**
  (`src/lib/supabase/local/schema.ts` mirrors `supabase/schema.sql`) and creates
  them automatically on first boot — nothing to run by hand.
* The same two-seat cap is enforced, and the same read/write matrix applies:
  wallet, quests and achievements stay private; habits, logs and XP are
  read-only for the partner.
* Passwords are stored as scrypt hashes and sessions live in HttpOnly cookies.
* `GET /api/health` reports `{ "ok": true, "storage": "local-postgres" }` in
  this mode, and `{ "ok": true, "storage": "supabase" }` once Supabase is set.

Nothing in the Supabase integration changes: add
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, restart, and every
request goes back through Supabase Auth and Row Level Security.

## One-time Supabase setup

1. **Apply the schema.** Open your project's
   [SQL editor](https://supabase.com/dashboard) → *New query*, paste the whole
   of [`supabase/schema.sql`](supabase/schema.sql) and press **Run**.
   The migration is **idempotent and non-destructive** — it only creates what is
   missing and never drops a table or deletes a row, so it is safe to re-run.
2. **Turn off email confirmation.** *Authentication → Sign In / Providers →
   Email → Confirm email → off.* This is a private two-person tracker, so there
   is no inbox round-trip. (If you leave it on, each owner must click the
   Supabase confirmation link before their first sign-in.)
3. Open the app and create the two accounts at `/create-account`.

If step 1 has not been done, Momentum shows a built-in setup screen with the
exact SQL and a **Copy SQL** button — nothing else in the app is reachable until
Supabase is ready.

## Accounts & privacy model

- The tracker is capped at **exactly two accounts**. The cap is enforced in the
  database (`momentum_handle_new_user` + a `before insert` trigger on
  `profiles`), so a third seat is impossible even from a raw API call.
- Sign-up / sign-in / password changes all go through **Supabase Auth**.
- Row Level Security decides every single row:

| Data                                            | Owner | Partner        | Anonymous |
| ----------------------------------------------- | ----- | -------------- | --------- |
| `wallet_txns`, `quest_claims`, `achievements`   | R/W   | **no access**  | no access |
| `profiles` (email, settings)                    | R/W   | **no access**  | no access |
| `habits`, `habit_logs`                          | R/W   | read-only      | no access |
| `xp_events`, `progress_state`                   | R/W   | **read-only**  | no access |
| `public_profiles` (name + color only)           | read  | read           | read      |

  The partner card and the Level/XP comparison are exactly the "intended shared
  information"; money and claimed rewards are never shared.

## Verifying the connection

```bash
node scripts/verify-supabase.mjs <email1> <password1> <email2> <password2>
```

The script signs both owners into the real Supabase project and asserts that
writes persist, that reads come back, that owner 2 cannot read owner 1's wallet
or forge their XP, that duplicate XP keys are ignored, and that an anonymous
client can read nothing but the seat picker. It cleans up everything it writes.

`GET /api/health` returns `{ "ok": true, "storage": "supabase", "schema": "ready" }`
once the migration has been applied. `GET /api/setup` reports the setup state
and ships the migration SQL to the setup screen.

## Commands

```bash
npm run dev        # local development
npm run build      # production build
npm run start      # production server
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
node scripts/generate-schema-module.mjs   # re-embed supabase/schema.sql after editing it
```
