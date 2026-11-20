-- Aditiva. Aplicar somente após backup e autorização específica para o banco remoto.
-- Linhas antigas de known_devices continuam sem trusted_at e nunca autorizam login.
begin;

alter table public.known_devices
  add column if not exists trusted_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz;

create index if not exists known_devices_expiry_idx
  on public.known_devices (expires_at)
  where trusted_at is not null and revoked_at is null;

-- Trocas de senha ou e-mail, inclusive pelo fluxo Auth gerenciado, retiram
-- a confiança sem depender de uma segunda chamada do cliente.
create or replace function public.revoke_trusted_devices_after_identity_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password
     or old.email is distinct from new.email then
    update public.known_devices
       set revoked_at = now()
     where user_id = new.id and trusted_at is not null and revoked_at is null;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'on_auth_identity_change_revoke_trusted_devices'
  ) then
    create trigger on_auth_identity_change_revoke_trusted_devices
      after update of encrypted_password, email on auth.users
      for each row execute function public.revoke_trusted_devices_after_identity_change();
  end if;
end;
$$;

alter table public.known_devices enable row level security;
revoke all on public.known_devices from public, anon, authenticated;
revoke all on function public.revoke_trusted_devices_after_identity_change() from public, anon, authenticated;

commit;
