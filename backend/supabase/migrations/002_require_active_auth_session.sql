-- Keep the existing additional-authorization record usable only while its
-- matching Supabase Auth session still exists.
do $preflight$
begin
  if to_regclass('public.authorized_sessions') is null then
    raise exception 'Required table public.authorized_sessions does not exist.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'authorized_sessions'
      and column_name = 'user_id'
      and udt_name = 'uuid'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'authorized_sessions'
      and column_name = 'session_id'
      and udt_name = 'uuid'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'authorized_sessions'
      and column_name = 'revoked_at'
      and udt_name = 'timestamptz'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'authorized_sessions'
      and column_name = 'authorized_at'
      and udt_name = 'timestamptz'
  ) then
    raise exception 'public.authorized_sessions is missing required authorization columns or types.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'sessions'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'sessions'
      and column_name = 'user_id'
      and udt_name = 'uuid'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'sessions'
      and column_name = 'not_after'
      and udt_name = 'timestamptz'
  ) then
    raise exception 'auth.sessions is missing required UUID identity or session-expiry columns.';
  end if;
end;
$preflight$;

create or replace function public.has_additional_authorization()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.authorized_sessions as extra_auth
    join auth.sessions as auth_session
      on auth_session.id = extra_auth.session_id
     and auth_session.user_id = extra_auth.user_id
    where extra_auth.user_id = (select auth.uid())
      and auth_session.user_id = (select auth.uid())
      and auth_session.id::text = (select auth.jwt() ->> 'session_id')
      and (auth_session.not_after is null or auth_session.not_after > statement_timestamp())
      and extra_auth.revoked_at is null
      and extra_auth.authorized_at <= now()
  );
$function$;

revoke all on function public.has_additional_authorization() from public, anon, authenticated, service_role;
grant execute on function public.has_additional_authorization() to authenticated;
