-- Infraestrutura inicial Arboris.X. Execute no projeto Supabase após revisar.
-- Não migra nem remove os usuários existentes no armazenamento JSON.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.terms_acceptances (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, terms_version, privacy_version)
);

create table if not exists public.authorized_sessions (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  authorized_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, session_id)
);

create table if not exists public.login_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  code_hmac bytea not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  resend_available_at timestamptz not null,
  attempts smallint not null default 0 check (attempts between 0 and 5),
  send_count smallint not null default 1 check (send_count between 1 and 5),
  consumed_at timestamptz,
  invalidated_at timestamptz
);

create index if not exists login_challenges_expiry_idx on public.login_challenges (expires_at);
create index if not exists login_challenges_user_session_idx on public.login_challenges (user_id, session_id);

create table if not exists public.otp_send_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  window_started_at timestamptz not null default now(),
  sends smallint not null default 0 check (sends between 0 and 5)
);

create table if not exists public.known_devices (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  device_hash bytea not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  label text,
  unique (user_id, device_hash)
);

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  session_id uuid,
  created_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created_profile') then
    create trigger on_auth_user_created_profile
      after insert on auth.users
      for each row execute function public.create_profile_for_auth_user();
  end if;
end;
$$;

-- Preserve existing Auth users and create only profiles that are missing.
insert into public.profiles (id, full_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', '')
from auth.users
on conflict (id) do nothing;

-- RLS must enforce the additional code even when a user calls PostgREST directly.
create or replace function public.has_additional_authorization()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.authorized_sessions
    where user_id = (select auth.uid())
      and session_id = nullif((select auth.jwt() ->> 'session_id'), '')::uuid
      and revoked_at is null
  );
$$;

alter table public.profiles enable row level security;
alter table public.terms_acceptances enable row level security;
alter table public.authorized_sessions enable row level security;
alter table public.login_challenges enable row level security;
alter table public.otp_send_limits enable row level security;
alter table public.known_devices enable row level security;
alter table public.security_events enable row level security;

create policy "Users can read their profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id and (select public.has_additional_authorization()));
create policy "Users can update their profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id and (select public.has_additional_authorization()))
  with check ((select auth.uid()) = id and (select public.has_additional_authorization()));
create policy "Users can read their terms acceptances" on public.terms_acceptances
  for select to authenticated using ((select auth.uid()) = user_id and (select public.has_additional_authorization()));
create policy "Users can accept terms for themselves" on public.terms_acceptances
  for insert to authenticated with check ((select auth.uid()) = user_id and (select public.has_additional_authorization()));
create policy "Users can read their authorized sessions" on public.authorized_sessions
  for select to authenticated using ((select auth.uid()) = user_id and (select public.has_additional_authorization()));
create policy "Users can read their known devices" on public.known_devices
  for select to authenticated using ((select auth.uid()) = user_id and (select public.has_additional_authorization()));
create policy "Users can read their security events" on public.security_events
  for select to authenticated using ((select auth.uid()) = user_id and (select public.has_additional_authorization()));

-- OTP challenges are server-only. No client-facing RLS policy is created.
revoke all on public.login_challenges from anon, authenticated;
revoke all on public.otp_send_limits from anon, authenticated;
revoke all on public.authorized_sessions from anon, authenticated;
revoke all on public.known_devices from anon, authenticated;
revoke all on public.security_events from anon, authenticated;
revoke all on public.terms_acceptances from anon, authenticated;
revoke all on public.profiles from anon, authenticated;

-- Expose only profile read/update and self-service terms acceptance through
-- the Data API. Session, device, OTP, and security-event writes stay server-side.
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.terms_acceptances to authenticated;
grant insert (user_id, terms_version, privacy_version) on public.terms_acceptances to authenticated;

-- Newly created public tables must remain private until explicitly reviewed.
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- Trigger execution is implicit; callers must not invoke the helper directly.
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.has_additional_authorization() from public, anon, authenticated;
grant execute on function public.has_additional_authorization() to authenticated;
