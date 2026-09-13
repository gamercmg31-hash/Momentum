-- ===========================================================================
-- Momentum — read-only seat and reset verification
--
-- Run in Supabase Dashboard → SQL Editor at any time. This script changes
-- nothing. It compares the private Auth source of truth with app profiles and
-- reports whether related application data is actually clean.
-- ===========================================================================

-- 1. Summary. After a complete reset every value must be 0.
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as occupied_seats,
  (
    select count(*)
      from auth.users u
      left join public.profiles p on p.id = u.id
     where p.id is null
  ) as auth_users_missing_profiles,
  (
    select count(*)
      from public.profiles p
      left join auth.users u on u.id = p.id
     where u.id is null
  ) as profiles_missing_auth_users,
  (select count(*) from public.habits) as habits,
  (select count(*) from public.habit_logs) as habit_logs,
  (select count(*) from public.wallet_txns) as wallet_txns,
  (select count(*) from public.xp_events) as xp_events,
  (select count(*) from public.progress_state) as progress_rows,
  (select count(*) from public.quest_claims) as quest_claims,
  (select count(*) from public.achievements) as achievements;

-- 2. Exact current seat holders. An Auth user with no profile is shown too,
-- because that would be a schema/trigger inconsistency that must be repaired.
select
  u.id as auth_user_id,
  u.email as auth_email,
  u.created_at as auth_created_at,
  p.slot,
  p.name as profile_name,
  p.seeded
from auth.users u
left join public.profiles p on p.id = u.id
order by p.slot nulls last, u.created_at;

-- 3. App-visible seat state. This is precisely what GET /api/accounts reads.
select id, slot, name, color, seeded
from public.public_profiles
order by slot;

-- Expected lifecycle:
--   Clean reset: auth_users=0, occupied_seats=0, API seatsTaken=0, slotsOpen=2
--   First signup: auth_users=1, occupied_seats=1, API seatsTaken=1, slotsOpen=1
--   Second signup: auth_users=2, occupied_seats=2, API seatsTaken=2, slotsOpen=0
-- In all states, both *_missing_* columns must remain 0.
