const crypto = require('node:crypto');
const { OTP_SECRET } = require('../config');
const { getPool } = require('./postgres');
const HttpError = require('../utils/httpError');

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
let cleanupTimer;

class PostgresRateLimitStore {
  constructor({ limiter, secret = OTP_SECRET, poolProvider = getPool }) {
    if (!/^[a-z0-9:_-]{1,80}$/i.test(limiter || '')) throw new Error('A stable rate-limit bucket name is required.');
    if (Buffer.byteLength(secret || '') < 32) throw new Error('Rate-limit HMAC secret must contain at least 32 bytes.');
    this.limiter = limiter;
    this.secret = secret;
    this.poolProvider = poolProvider;
    this.localKeys = false;
    this.prefix = limiter;
    this.windowMs = 15 * 60 * 1000;
  }

  init(options) {
    this.windowMs = options.windowMs;
    if (!cleanupTimer) {
      cleanupTimer = setInterval(async () => {
        try {
          await this.poolProvider().query('delete from public.api_rate_limits where expires_at <= now()');
        } catch (error) {
          const code = /^[A-Z0-9]{5}$/.test(String(error.code || '')) ? error.code : 'UNKNOWN';
          console.error('[rate-limit-store]', JSON.stringify({ event: 'cleanup_failed', code }));
        }
      }, CLEANUP_INTERVAL_MS);
      cleanupTimer.unref?.();
    }
  }

  digest(key) {
    return crypto.createHmac('sha256', this.secret).update(String(key)).digest();
  }

  async increment(key) {
    try {
      const { rows: [row] } = await this.poolProvider().query(
        `insert into public.api_rate_limits
           (limiter, key_hash, hit_count, window_started_at, expires_at)
         values ($1, $2, 1, now(), now() + ($3 * interval '1 millisecond'))
         on conflict (limiter, key_hash) do update set
           hit_count = case when public.api_rate_limits.expires_at <= now() then 1 else public.api_rate_limits.hit_count + 1 end,
           window_started_at = case when public.api_rate_limits.expires_at <= now() then now() else public.api_rate_limits.window_started_at end,
           expires_at = case when public.api_rate_limits.expires_at <= now()
             then now() + ($3 * interval '1 millisecond') else public.api_rate_limits.expires_at end
         returning hit_count, expires_at`,
        [this.limiter, this.digest(key), this.windowMs],
      );
      return { totalHits: row.hit_count, resetTime: new Date(row.expires_at) };
    } catch {
      throw new HttpError(503, 'Limitação temporária indisponível.', undefined, 'RATE_LIMIT_STORE_UNAVAILABLE');
    }
  }

  async decrement(key) {
    try {
      await this.poolProvider().query(
        `update public.api_rate_limits set hit_count = greatest(hit_count - 1, 0)
         where limiter = $1 and key_hash = $2`, [this.limiter, this.digest(key)],
      );
    } catch {
      throw new HttpError(503, 'Limitação temporária indisponível.', undefined, 'RATE_LIMIT_STORE_UNAVAILABLE');
    }
  }

  async resetKey(key) {
    try {
      await this.poolProvider().query(
        'delete from public.api_rate_limits where limiter = $1 and key_hash = $2',
        [this.limiter, this.digest(key)],
      );
    } catch {
      throw new HttpError(503, 'Limitação temporária indisponível.', undefined, 'RATE_LIMIT_STORE_UNAVAILABLE');
    }
  }

  async resetAll() {
    try {
      await this.poolProvider().query('delete from public.api_rate_limits where limiter = $1', [this.limiter]);
    } catch {
      throw new HttpError(503, 'Limitação temporária indisponível.', undefined, 'RATE_LIMIT_STORE_UNAVAILABLE');
    }
  }
}

module.exports = PostgresRateLimitStore;
