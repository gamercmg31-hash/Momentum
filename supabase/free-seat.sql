-- ---------------------------------------------------------------------------
-- Free a Momentum seat (optional maintenance script)
--
-- Momentum has exactly two seats. If a seat is occupied by an account you no
-- longer want (for example the temporary account that was used to verify the
-- Supabase wiring), run this once in Supabase Dashboard → SQL Editor.
--
-- Deleting the auth user cascades to profiles, habits, habit_logs, wallet_txns,
-- xp_events, progress_state, quest_claims and achievements, so the seat becomes
-- available again and the new owner can claim it on /signup.
--
-- Review the list first, then delete the row you actually want gone.
-- ---------------------------------------------------------------------------

-- 1. See who currently holds the two seats.
select p.slot, p.name, p.email, p.created_at
from public.profiles p
order by p.slot;

-- 2. Delete the seat you no longer need (edit the address below).
--    This is the verification account created while wiring up Supabase:
delete from auth.users
where email = 'probe.test.9134@example.com';

-- 3. Confirm the seat is free (should now return a single row).
select slot, name from public.profiles order by slot;
