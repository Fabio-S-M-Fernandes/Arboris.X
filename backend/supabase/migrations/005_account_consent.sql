-- Accounts created after this migration must decide before receiving application access.
-- Existing accounts are intentionally left untouched.
begin;

create table if not exists public.account_consent (
  user_id uuid primary key references auth.users (id) on delete cascade,
  accepted_at timestamptz,
  optional_cookies_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.account_consent enable row level security;
revoke all on public.account_consent from public, anon, authenticated;

create or replace function public.create_account_consent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.account_consent (user_id) values (new.id);
  return new;
end;
$$;

revoke all on function public.create_account_consent() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'on_auth_user_created_consent'
  ) then
    create trigger on_auth_user_created_consent
      after insert on auth.users for each row
      execute function public.create_account_consent();
  end if;
end;
$$;

commit;
