-- Local-only harness that emulates the parts of Supabase the Momentum schema
-- depends on (auth.users, auth.uid(), the anon/authenticated roles), so that
-- supabase/schema.sql and its Row Level Security policies can be executed and
-- verified against a real PostgreSQL server before deployment.
--
-- This file is NEVER run against Supabase — it is a test fixture only.

create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  encrypted_password  text,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
