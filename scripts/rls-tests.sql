-- Automated Row Level Security verification for the Momentum schema.
-- Run against the local harness database only (see scripts/rls-harness.sql).

\set ON_ERROR_STOP on
\pset pager off

create or replace function public._t_pass(label text) returns void
language plpgsql as $$ begin raise notice 'PASS  %', label; end $$;

create or replace function public._t_fail(label text) returns void
language plpgsql as $$ begin raise exception 'FAIL  %', label; end $$;

-- Assert that a statement is rejected (RLS / permission denied).
create or replace function public._t_denied(label text, stmt text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    perform public._t_pass(label || '  [' || sqlstate || ']');
    return;
  end;
  perform public._t_fail(label || '  -> statement unexpectedly SUCCEEDED');
end $$;

-- Assert that a statement runs without error.
create or replace function public._t_allowed(label text, stmt text) returns void
language plpgsql as $$
begin
  execute stmt;
  perform public._t_pass(label);
exception when others then
  perform public._t_fail(label || '  -> ' || sqlerrm);
end $$;

create or replace function public._t_count(label text, stmt text, expected bigint) returns void
language plpgsql as $$
declare got bigint;
begin
  execute stmt into got;
  if got is distinct from expected then
    perform public._t_fail(label || '  -> expected ' || expected || ', got ' || coalesce(got::text,'null'));
  end if;
  perform public._t_pass(label || '  (= ' || expected || ')');
end $$;

-- ===========================================================================
-- 1. Seat creation via the auth.users trigger
-- ===========================================================================
truncate auth.users cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alice@momentum-users.app',
   '{"name":"alice","color":"#a3e635"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@momentum-users.app',
   '{"name":"bob","color":"#38bdf8"}');

select public._t_count('profiles auto-created by trigger',
  'select count(*) from public.profiles', 2);
select public._t_count('slots assigned 1 and 2',
  'select count(*) from public.profiles where slot in (1,2)', 2);
select public._t_count('progress_state seeded for both seats',
  'select count(*) from public.progress_state', 2);

-- Third seat must be impossible.
select public._t_denied('third seat rejected (MOMENTUM_FULL)',
  $$insert into auth.users (id, email, raw_user_meta_data)
    values ('33333333-3333-3333-3333-333333333333','carol@momentum-users.app','{"name":"carol"}')$$);

-- ===========================================================================
-- 2. Seed data owned by each seat (as superuser, bypassing RLS)
-- ===========================================================================
insert into public.habits (id, user_id, name, icon, color, sort_order, created_key) values
  (101, '11111111-1111-1111-1111-111111111111', 'Alice habit', 'book-open', 'violet', 1, '2026-01-01'),
  (201, '22222222-2222-2222-2222-222222222222', 'Bob habit',   'school',    'sky',    1, '2026-01-01');

insert into public.habit_logs (user_id, habit_id, date, status) values
  ('11111111-1111-1111-1111-111111111111', 101, '2026-01-01', 'completed'),
  ('22222222-2222-2222-2222-222222222222', 201, '2026-01-01', 'completed');

insert into public.wallet_txns (id, user_id, name, category, amount, type, date, created_at) values
  ('a-txn', '11111111-1111-1111-1111-111111111111', 'Alice salary', 'Income', 100.00, 'income', '2026-01-01', 1),
  ('b-txn', '22222222-2222-2222-2222-222222222222', 'Bob rent',     'Home',    50.00, 'expense','2026-01-01', 2);

insert into public.xp_events (user_id, key, label, amount, day, at_ms) values
  ('11111111-1111-1111-1111-111111111111', 'habit:101:2026-01-01', 'a', 10, '2026-01-01', 1),
  ('22222222-2222-2222-2222-222222222222', 'habit:201:2026-01-01', 'b', 10, '2026-01-01', 2);

insert into public.quest_claims (user_id, event_key, quest_id, period_key, xp_awarded, claimed_at) values
  ('11111111-1111-1111-1111-111111111111', 'quest:x:2026-01-01', 'x', '2026-01-01', 5, 1),
  ('22222222-2222-2222-2222-222222222222', 'quest:y:2026-01-01', 'y', '2026-01-01', 5, 2);

insert into public.achievements (user_id, achievement_id, unlocked_at) values
  ('11111111-1111-1111-1111-111111111111', 'first', 1),
  ('22222222-2222-2222-2222-222222222222', 'first', 2);

-- ===========================================================================
-- 3. Alice's session
-- ===========================================================================
\echo '--- acting as ALICE (authenticated) ---'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;

select public._t_count('alice sees only her own wallet rows',
  'select count(*) from public.wallet_txns', 1);
select public._t_count('alice cannot read bob wallet row',
  $$select count(*) from public.wallet_txns where user_id = '22222222-2222-2222-2222-222222222222'$$, 0);
select public._t_count('alice sees only her own quest_claims',
  'select count(*) from public.quest_claims', 1);
select public._t_count('alice sees only her own achievements',
  'select count(*) from public.achievements', 1);

select public._t_count('alice can read shared habits (partner card)',
  'select count(*) from public.habits', 2);
select public._t_count('alice can read shared habit_logs (partner card)',
  'select count(*) from public.habit_logs', 2);
select public._t_count('alice can read shared xp_events (level board)',
  'select count(*) from public.xp_events', 2);
select public._t_count('alice can read shared progress_state (level board)',
  'select count(*) from public.progress_state', 2);

select public._t_count('alice can read the seat picker view',
  'select count(*) from public.public_profiles', 2);
select public._t_count('alice can read the partner progress view',
  'select count(*) from public.momentum_partner_progress', 2);

-- Writes must stay owner-only.
select public._t_denied('alice cannot insert a habit owned by bob',
  $$insert into public.habits (user_id,name,icon,color,sort_order,created_key)
    values ('22222222-2222-2222-2222-222222222222','hack','book-open','violet',9,'2026-01-01')$$);
select public._t_count('alice update of bob habit affects 0 rows',
  $$with u as (update public.habits set name='hacked' where id=201 returning 1) select count(*) from u$$, 0);
select public._t_count('alice delete of bob habit affects 0 rows',
  $$with d as (delete from public.habits where id=201 returning 1) select count(*) from d$$, 0);
select public._t_count('alice delete of bob wallet row affects 0 rows',
  $$with d as (delete from public.wallet_txns where id='b-txn' returning 1) select count(*) from d$$, 0);
select public._t_denied('alice cannot insert xp for bob',
  $$insert into public.xp_events (user_id,key,label,amount,day,at_ms)
    values ('22222222-2222-2222-2222-222222222222','cheat','x',9999,'2026-01-01',1)$$);
select public._t_denied('alice cannot insert wallet row for bob',
  $$insert into public.wallet_txns (id,user_id,name,category,amount,type,date,created_at)
    values ('hack','22222222-2222-2222-2222-222222222222','x','y',1,'income','2026-01-01',1)$$);
select public._t_denied('alice cannot raise bob progress_state',
  $$insert into public.progress_state (user_id,total_xp,level)
    values ('22222222-2222-2222-2222-222222222222',99999,99)
    on conflict (user_id) do update set total_xp = 99999$$);
select public._t_count('alice update of bob profile affects 0 rows',
  $$with u as (update public.profiles set name='hacked' where id='22222222-2222-2222-2222-222222222222' returning 1) select count(*) from u$$, 0);

-- Own writes must work.
select public._t_allowed('alice can insert her own habit',
  $$insert into public.habits (user_id,name,icon,color,sort_order,created_key)
    values ('11111111-1111-1111-1111-111111111111','Alice 2','coffee','orange',2,'2026-01-01')$$);
select public._t_allowed('alice can upsert her own habit log',
  $$insert into public.habit_logs (user_id,habit_id,date,status)
    values ('11111111-1111-1111-1111-111111111111',101,'2026-01-02','completed')
    on conflict (user_id,habit_id,date) do update set status = excluded.status$$);
select public._t_allowed('alice can insert her own wallet txn',
  $$insert into public.wallet_txns (id,user_id,name,category,amount,type,date,created_at)
    values ('a-txn-2','11111111-1111-1111-1111-111111111111','Gift','Income',5,'income','2026-01-02',3)$$);
select public._t_allowed('alice can update her own progress_state',
  $$insert into public.progress_state (user_id,total_xp,level) values ('11111111-1111-1111-1111-111111111111',10,1)
    on conflict (user_id) do update set total_xp = 10$$);
select public._t_allowed('alice can call momentum_sync_habits_sequence',
  $$select public.momentum_sync_habits_sequence()$$);

reset role;
reset request.jwt.claim.sub;

-- ===========================================================================
-- 4. Bob's session — must see his own private data, never Alice's
-- ===========================================================================
\echo '--- acting as BOB (authenticated) ---'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;

select public._t_count('bob sees only his own wallet rows',
  'select count(*) from public.wallet_txns', 1);
select public._t_count('bob cannot read alice wallet row',
  $$select count(*) from public.wallet_txns where id like 'a-txn%'$$, 0);
select public._t_count('bob sees only his own achievements',
  'select count(*) from public.achievements', 1);
select public._t_count('bob can read alice habits (shared consistency)',
  $$select count(*) from public.habits where user_id = '11111111-1111-1111-1111-111111111111'$$, 2);

reset role;
reset request.jwt.claim.sub;

-- ===========================================================================
-- 5. Anonymous (pre-login) visitor
-- ===========================================================================
\echo '--- acting as ANON (signed out) ---'
set role anon;

select public._t_count('anon can read the seat picker view',
  'select count(*) from public.public_profiles', 2);
select public._t_denied('anon cannot read profiles directly',
  'select email from public.profiles');
select public._t_denied('anon cannot read habits',      'select * from public.habits');
select public._t_denied('anon cannot read habit_logs',  'select * from public.habit_logs');
select public._t_denied('anon cannot read wallet_txns', 'select * from public.wallet_txns');
select public._t_denied('anon cannot read xp_events',   'select * from public.xp_events');
select public._t_denied('anon cannot read quest_claims','select * from public.quest_claims');
select public._t_denied('anon cannot read achievements','select * from public.achievements');
select public._t_denied('anon cannot read partner progress view',
  'select * from public.momentum_partner_progress');
select public._t_denied('anon cannot insert a habit',
  $$insert into public.habits (user_id,name,icon,color,sort_order,created_key)
    values ('11111111-1111-1111-1111-111111111111','x','book-open','violet',1,'2026-01-01')$$);

reset role;

-- ===========================================================================
-- 6. Supabase Security Advisor style static checks
-- ===========================================================================
\echo '--- security advisor checks ---'
select public._t_count('no SECURITY DEFINER views in public schema',
  $$select count(*) from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'v' and n.nspname = 'public'
       and not coalesce((select option_value::boolean
                           from pg_options_to_table(c.reloptions)
                          where option_name = 'security_invoker'), false)$$, 0);

select public._t_count('no public tables without RLS enabled',
  $$select count(*) from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where c.relkind = 'r' and n.nspname = 'public' and not c.relrowsecurity$$, 0);

-- Extension-owned functions (pgcrypto) are out of scope, exactly like the
-- Supabase advisor treats them.
select public._t_count('no Momentum function has a mutable search_path',
  $$select count(*) from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname like 'momentum\_%'
       and not exists (select 1 from unnest(coalesce(p.proconfig,'{}'::text[])) cfg
                        where cfg like 'search_path=%')$$, 0);

\echo '--- column-level protection of public.profiles ---'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
select public._t_denied('authenticated cannot read profiles.email',
  'select email from public.profiles');
select public._t_denied('authenticated cannot read profiles.name_key',
  'select name_key from public.profiles');
select public._t_denied('authenticated cannot read profiles.settings',
  'select settings from public.profiles');
select public._t_denied('authenticated cannot select * from profiles',
  'select * from public.profiles');
select public._t_count('authenticated can read partner name/color via the view',
  $$select count(*) from public.public_profiles
     where id = '22222222-2222-2222-2222-222222222222'$$, 1);
select public._t_allowed('owner can still flip its own seeded flag',
  $$update public.profiles set seeded = true, updated_at = now()
     where id = '11111111-1111-1111-1111-111111111111'$$);
reset role;
reset request.jwt.claim.sub;

set role anon;
select public._t_denied('anon cannot read profiles.email via the view path',
  'select email from public.profiles');
reset role;

\echo '=== ALL RLS TESTS COMPLETED ==='
