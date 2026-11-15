-- Keep the existing additional-authorization record usable only while its
-- matching Supabase Auth session still exists.
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
      and extra_auth.revoked_at is null
      and extra_auth.authorized_at <= now()
  );
$function$;

revoke all on function public.has_additional_authorization() from public, anon, authenticated;
grant execute on function public.has_additional_authorization() to authenticated;
