-- ===========================================================================
-- Momentum — FULL RESET FOR NEW OWNERS
--
-- Run this in Supabase Dashboard → SQL Editor → New query → Run.
-- This is intentionally destructive. It removes both account seats and every
-- habit, completion, wallet transaction, XP event, quest and achievement.
-- The next two people who visit /signup can claim clean seats 1 and 2.
--
-- A publishable/anon key cannot perform this operation; it must run in the SQL
-- Editor (or another trusted postgres/admin context).
-- ===========================================================================

begin;

-- Profiles reference auth.users with ON DELETE CASCADE, and every Momentum data
-- table references profiles with ON DELETE CASCADE. Deleting the identities is
-- therefore the single source-of-truth reset for Auth and application data.
delete from auth.users;

-- Start newly created habits at id 1 again when the identity sequence exists.
do $$
declare
  habit_sequence text;
begin
  habit_sequence := pg_get_serial_sequence('public.habits', 'id');
  if habit_sequence is not null then
    perform setval(habit_sequence, 1, false);
  end if;
end
$$;

commit;

-- Every value must be zero. The app will now show two available seats.
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.profiles) as occupied_seats,
  (select count(*) from public.habits) as habits,
  (select count(*) from public.habit_logs) as habit_logs,
  (select count(*) from public.wallet_txns) as wallet_txns,
  (select count(*) from public.xp_events) as xp_events,
  (select count(*) from public.progress_state) as progress_rows,
  (select count(*) from public.quest_claims) as quest_claims,
  (select count(*) from public.achievements) as achievements;
