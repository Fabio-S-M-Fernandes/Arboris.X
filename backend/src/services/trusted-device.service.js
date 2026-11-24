const crypto = require('node:crypto');
const { TRUSTED_DEVICE_DAYS } = require('../config');
const { getPool } = require('../store/postgres');
const HttpError = require('../utils/httpError');

const COOKIE_NAME = '__Host-arboris-trusted';
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const DURATION_MS = TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000;
const cookieOptions = { httpOnly: true, secure: true, sameSite: 'none', path: '/' };

const newToken = () => crypto.randomBytes(32).toString('base64url');
const digest = (token) => crypto.createHash('sha256').update(token, 'ascii').digest();

const readToken = (request) => {
  const header = request.headers.cookie;
  if (typeof header !== 'string' || header.length > 8192) return null;
  const entry = header.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = entry?.slice(COOKIE_NAME.length + 1);
  return TOKEN_PATTERN.test(token || '') ? token : null;
};

const setCookie = (response, token, expiresAt) => {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining > 0) response.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: remaining });
};

const clearCookie = (response) => response.clearCookie(COOKIE_NAME, cookieOptions);

const tryAuthorize = async ({ userId, sessionId, token }) => {
  if (!TOKEN_PATTERN.test(token || '')) return null;
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`${userId}:${sessionId}`]);
    const { rows: [device] } = await client.query(
      `select id, expires_at from public.known_devices
       where user_id = $1 and device_hash = $2
         and trusted_at is not null and expires_at > now() and revoked_at is null
       for update`, [userId, digest(token)],
    );
    if (!device) { await client.query('commit'); return null; }
    const existingAuthorization = await client.query(
      `select revoked_at from public.authorized_sessions
       where user_id = $1 and session_id = $2 for update`,
      [userId, sessionId],
    );
    if (existingAuthorization.rows[0]?.revoked_at) throw new HttpError(401, 'Sessão encerrada. Entre novamente.');
    const rotatedToken = newToken();
    await client.query(
      `update public.known_devices set device_hash = $2, last_seen_at = now()
       where id = $1`, [device.id, digest(rotatedToken)],
    );
    const { rowCount: authorized } = await client.query(
      `insert into public.authorized_sessions (user_id, session_id) values ($1, $2)
       on conflict (user_id, session_id) do update set authorized_at = now()
       where public.authorized_sessions.revoked_at is null`, [userId, sessionId],
    );
    if (!authorized) throw new HttpError(401, 'Sessão encerrada. Entre novamente.');
    await client.query(
      `update public.login_challenges set invalidated_at = now()
       where user_id = $1 and session_id = $2 and consumed_at is null and invalidated_at is null`,
      [userId, sessionId],
    );
    await client.query(
      `insert into public.security_events (user_id, event_type, session_id)
       values ($1, 'trusted_device_used', $2)`, [userId, sessionId],
    );
    await client.query('commit');
    return { token: rotatedToken, expiresAt: device.expires_at, newlyAuthorized: existingAuthorization.rowCount === 0 };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
};

const register = async ({ userId, sessionId }) => {
  const token = newToken();
  const expiresAt = new Date(Date.now() + DURATION_MS);
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`trusted-device:${userId}`]);
    const active = await client.query(
      `select 1 from auth.sessions
       where id = $2 and user_id = $1 and (not_after is null or not_after > now())`,
      [userId, sessionId],
    );
    const authorized = await client.query(
      `select 1 from public.authorized_sessions
       where user_id = $1 and session_id = $2 and revoked_at is null for update`,
      [userId, sessionId],
    );
    if (!active.rowCount || !authorized.rowCount) throw new HttpError(401, 'Sessão inválida ou expirada.');
    const { rows: [{ count }] } = await client.query(
      `select count(*)::int as count from public.known_devices
       where user_id = $1 and trusted_at is not null and revoked_at is null and expires_at > now()`,
      [userId],
    );
    if (count >= 20) throw new HttpError(409, 'Limite de dispositivos confiáveis atingido. Revogue um dispositivo antigo.', undefined, 'TRUSTED_DEVICE_LIMIT');
    await client.query(
      `insert into public.known_devices (user_id, device_hash, label, trusted_at, expires_at)
       values ($1, $2, 'Navegador confiável', now(), $3)`,
      [userId, digest(token), expiresAt],
    );
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
  return { token, expiresAt };
};

const list = async ({ userId }) => {
  const { rows } = await getPool().query(
    `select id, label, trusted_at, last_seen_at, expires_at
     from public.known_devices
     where user_id = $1 and trusted_at is not null and revoked_at is null and expires_at > now()
     order by last_seen_at desc`, [userId],
  );
  return rows.map((row) => ({
    id: row.id, label: row.label, trustedAt: row.trusted_at,
    lastSeenAt: row.last_seen_at, expiresAt: row.expires_at,
  }));
};

const revoke = async ({ userId, deviceId, token }) => {
  if (!/^[1-9]\d{0,17}$/.test(String(deviceId))) throw new HttpError(422, 'Dispositivo inválido.');
  const { rows: [row] } = await getPool().query(
    `update public.known_devices set revoked_at = now()
     where id = $1 and user_id = $2 and trusted_at is not null and revoked_at is null
     returning device_hash`, [deviceId, userId],
  );
  if (!row) throw new HttpError(404, 'Dispositivo não encontrado.');
  const candidate = TOKEN_PATTERN.test(token || '') ? digest(token) : null;
  return Boolean(candidate && row.device_hash.length === candidate.length
    && crypto.timingSafeEqual(row.device_hash, candidate));
};

module.exports = { clearCookie, list, readToken, register, revoke, setCookie, tryAuthorize };
