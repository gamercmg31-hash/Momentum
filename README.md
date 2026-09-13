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
mapped to a stable internal address (`<username>@momentum-users.app`) in
[`src/lib/username.ts`](src/lib/username.ts). That address is an implementation
detail — it is never shown, never emailed, and no confirmation link is involved.
The Supabase integration itself is unchanged.

## Configuration

Momentum has one backend: **Supabase**. It needs the project URL and a
publishable key only. The service-role/secret key and direct database password
are never used, read, or shipped.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

New projects may use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` instead of the anon
key variable. If both are present, `NEXT_PUBLIC_SUPABASE_ANON_KEY` takes
precedence. The URL must be the Project URL from **Supabase Dashboard → Connect**,
not a Vercel URL or a `supabase.com` dashboard URL. Credentials are always read
from the environment and never hard-coded.

## Deploying on Vercel

1. Import this repository into Vercel.
2. In the Vercel Marketplace, install **Supabase** and connect this Vercel
   project to your Supabase project; alternatively add the two variables above
   under **Project Settings → Environment Variables**.
3. Make the variables available to **Development, Preview, and Production**.
4. Apply [`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL
   Editor, then redeploy.
5. Open `/api/health`. A ready deployment reports `storage: "supabase"`,
   `configured: true`, `schema: "ready"`, and `ready: true`.

The app uses the Next.js 16 `proxy.ts` convention with `@supabase/ssr`, so
Supabase refresh tokens remain synchronized in HttpOnly cookies on Vercel.

## One-time Supabase setup

1. **Apply the schema.** Open your project's
   [SQL editor](https://supabase.com/dashboard) → *New query*, paste the whole
   of [`supabase/schema.sql`](supabase/schema.sql) and press **Run**.
   The migration is **idempotent and non-destructive** — it only creates what is
   missing and never drops a table or deletes a row, so it is safe to re-run.
2. **Turn off email confirmation.** In *Authentication → Sign In / Providers →
   Email*, turn **Confirm email** off. Username identities use internal
   `@momentum-users.app` addresses, so confirmation messages are intentionally not used.
3. Open the app and create the two accounts at `/signup`.

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
node scripts/verify-supabase.mjs <username1> <password1> <username2> <password2>
```

The script signs both owners into the real Supabase project and asserts that
writes persist, that reads come back, that owner 2 cannot read owner 1's wallet
or forge their XP, that duplicate XP keys are ignored, and that an anonymous
client can read nothing but the seat picker. It cleans up everything it writes.

`GET /api/health` returns `{ "ok": true, "storage": "supabase", "schema": "ready" }`
once the migration has been applied. `GET /api/setup` reports the setup state
and ships the migration SQL to the setup screen.

## Resetting seats

Momentum has exactly two seats and the database refuses a third. Use one of the
admin-only SQL scripts in the Supabase SQL Editor when an owner must be removed:

- [`supabase/free-seat.sql`](supabase/free-seat.sql) removes one specified owner.
- [`supabase/reset-for-new-users.sql`](supabase/reset-for-new-users.sql) removes
  both Supabase Auth users and all tracker data, returning the app to two clean,
  claimable seats.
- [`supabase/verify-seat-state.sql`](supabase/verify-seat-state.sql) is read-only
  and compares `auth.users` with `profiles`, reports every related table count,
  and detects missing profile/Auth pairs.

Both reset operations delete the Supabase Auth identity first; foreign-key
cascades then remove its profile, habits, logs, wallet data, XP and rewards.
After a full reset the audit must report zero Auth users, zero occupied seats,
zero related rows and zero mismatches. `GET /api/accounts` must then report
`seatsTaken: 0`, `slotsOpen: 2`, and `source: "supabase"`; after the first and
second signup those values become `1/1` and `2/0` respectively.

## Commands

```bash
npm run dev        # local development
npm run build      # production build
npm run start      # production server
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
node scripts/generate-schema-module.mjs   # re-embed supabase/schema.sql after editing it
node scripts/verify-seats.mjs <app-url> 0 # assert clean Supabase seat state
node scripts/verify-seats.mjs <app-url> 1 # assert state after first real signup
node scripts/verify-seats.mjs <app-url> 2 # assert state after second real signup
```
