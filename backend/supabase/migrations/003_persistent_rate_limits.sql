-- Persistent, shared counters for Express rate limits.
-- Apply only after a protected database backup and explicit approval.
-- This migration is additive and does not touch users or existing rows.

create table if not exists public.api_rate_limits (
  limiter text not null check (char_length(limiter) between 1 and 80),
  key_hash bytea not null check (octet_length(key_hash) = 32),
  hit_count integer not null default 0 check (hit_count >= 0),
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  primary key (limiter, key_hash)
);

create index if not exists api_rate_limits_expiry_idx
  on public.api_rate_limits (expires_at);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated, service_role;

-- The table contains only HMACs of client keys, never raw IP addresses.
-- Express writes counters through the private PostgreSQL connection.
