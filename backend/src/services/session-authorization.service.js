const crypto = require('node:crypto');
const { OTP_SECRET } = require('../config');
const { getPool } = require('../store/postgres');
const emailService = require('./email.service');
const HttpError = require('../utils/httpError');

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const SEND_WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS = 5;
const MAX_ATTEMPTS = 5;
const TERMS_VERSION = '2026-11-15';
const PRIVACY_VERSION = '2026-11-15';

const codeDigest = (challengeId, userId, sessionId, code) => crypto.createHmac('sha256', OTP_SECRET)
  .update(`${challengeId}:${userId}:${sessionId}:${code}`).digest();
const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
const maskEmail = (email) => {
  const [local, domain] = String(email).split('@');
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
};
const describe = (row) => ({
  challengeId: row.id,
  maskedEmail: maskEmail(row.email),
  expiresAt: new Date(row.expires_at).getTime(),
  resendAvailableAt: new Date(row.resend_available_at).getTime(),
});

const withTransaction = async (handler) => {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    const result = await handler(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { client.release(); }
};

const reserveSend = async (client, userId) => {
  await client.query(
    `insert into public.otp_send_limits (user_id) values ($1)
     on conflict (user_id) do nothing`, [userId],
  );
  const { rows: [limit] } = await client.query(
    'select * from public.otp_send_limits where user_id = $1 for update', [userId],
  );
  const now = Date.now();
  const started = new Date(limit.window_started_at).getTime();
  if (now - started >= SEND_WINDOW_MS) {
    await client.query('update public.otp_send_limits set window_started_at = now(), sends = 0 where user_id = $1', [userId]);
    limit.sends = 0;
  }
  if (limit.sends >= MAX_SENDS) {
    throw new HttpError(429, 'Limite de envio atingido. Tente novamente mais tarde.', undefined, 'OTP_SEND_LIMIT');
  }
  await client.query('update public.otp_send_limits set sends = sends + 1 where user_id = $1', [userId]);
};

const sendChallengeCode = async (row, email, fullName) => {
  const code = generateCode();
  const digest = codeDigest(row.id, row.user_id, row.session_id, code);
  await getPool().query('update public.login_challenges set code_hmac = $2 where id = $1', [row.id, digest]);
  try {
    await emailService.sendVerificationCode({ email, name: fullName, code, expiresInMinutes: OTP_TTL_MS / 60_000 });
  } catch (error) {
    await getPool().query('update public.login_challenges set invalidated_at = now() where id = $1 and consumed_at is null', [row.id]);
    throw error;
  }
};

const begin = async ({ user, sessionId }) => {
  if (!user.email || !(user.email_confirmed_at || user.confirmed_at)) {
    throw new HttpError(403, 'Confirme seu e-mail antes de concluir o acesso.', undefined, 'EMAIL_CONFIRMATION_REQUIRED');
  }
  const acceptedCurrentTerms = user.user_metadata?.terms_accepted === true
    && user.user_metadata?.terms_version === TERMS_VERSION
    && user.user_metadata?.privacy_version === PRIVACY_VERSION;
  if (user.identities?.some((identity) => identity.provider === 'google') && !acceptedCurrentTerms) {
    throw new HttpError(403, 'Aceite os Termos de Uso e a Política de Privacidade para continuar.', undefined, 'TERMS_REQUIRED');
  }
  const result = await withTransaction(async (client) => {
    await client.query(
      `insert into public.profiles (id, full_name) values ($1, $2)
       on conflict (id) do nothing`,
      [user.id, String(user.user_metadata?.full_name || user.user_metadata?.name || '').slice(0, 120)],
    );
    if (acceptedCurrentTerms) {
      await client.query(
        `insert into public.terms_acceptances (user_id, terms_version, privacy_version)
         values ($1, $2, $3) on conflict (user_id, terms_version, privacy_version) do nothing`,
        [user.id, TERMS_VERSION, PRIVACY_VERSION],
      );
    }
    await client.query("delete from public.login_challenges where expires_at < now() - interval '1 day'");
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`${user.id}:${sessionId}`]);
    const revoked = await client.query(
      'select 1 from public.authorized_sessions where user_id = $1 and session_id = $2 and revoked_at is not null for update',
      [user.id, sessionId],
    );
    if (revoked.rowCount) throw new HttpError(401, 'Sessão encerrada. Entre novamente.');
    const { rows: [existing] } = await client.query(
      `select * from public.login_challenges where user_id = $1 and session_id = $2
       and consumed_at is null and invalidated_at is null order by created_at desc limit 1 for update`,
      [user.id, sessionId],
    );
    if (existing && new Date(existing.expires_at).getTime() > Date.now()) return { row: existing, shouldSend: false };
    if (existing && existing.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Limite de tentativas atingido. Inicie um novo acesso.', undefined, 'OTP_ATTEMPTS_EXHAUSTED');
    if (existing && existing.send_count >= MAX_SENDS) throw new HttpError(429, 'Limite de reenvios atingido. Inicie um novo acesso mais tarde.', undefined, 'OTP_RESEND_LIMIT');
    if (existing && Date.now() < new Date(existing.resend_available_at).getTime()) {
      throw new HttpError(429, 'Aguarde antes de solicitar outro código.', undefined, 'OTP_RESEND_WAIT');
    }
    await reserveSend(client, user.id);
    if (existing) {
      const { rows: [row] } = await client.query(
        `update public.login_challenges set code_hmac = decode(repeat('00', 32), 'hex'),
          created_at = now(), expires_at = now() + interval '5 minutes',
          resend_available_at = now() + interval '60 seconds', send_count = send_count + 1
         where id = $1 returning *`, [existing.id],
      );
      return { row, shouldSend: true };
    }
    const { rows: [row] } = await client.query(
      `insert into public.login_challenges (user_id, session_id, code_hmac, expires_at, resend_available_at)
       values ($1, $2, decode(repeat('00', 32), 'hex'), now() + interval '5 minutes', now() + interval '60 seconds') returning *`,
      [user.id, sessionId],
    );
    return { row, shouldSend: true };
  });
  if (result.shouldSend) await sendChallengeCode(result.row, user.email, user.user_metadata?.full_name || user.user_metadata?.name || '');
  const { rows: [row] } = await getPool().query('select * from public.login_challenges where id = $1', [result.row.id]);
  return describe({ ...row, email: user.email });
};

const verify = async ({ userId, user, sessionId, challengeId, code }) => {
  if (typeof challengeId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(challengeId)
    || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    throw new HttpError(422, 'Informe o código de seis dígitos.', undefined, 'OTP_INVALID_FORMAT');
  }
  const result = await withTransaction(async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`${userId}:${sessionId}`]);
    const revoked = await client.query(
      'select 1 from public.authorized_sessions where user_id = $1 and session_id = $2 and revoked_at is not null for update',
      [userId, sessionId],
    );
    if (revoked.rowCount) throw new HttpError(401, 'Sessão encerrada. Entre novamente.');
    const { rows: [challenge] } = await client.query(
      `select * from public.login_challenges where id = $1 and user_id = $2 and session_id = $3 for update`,
      [challengeId, userId, sessionId],
    );
    if (!challenge || challenge.consumed_at || challenge.invalidated_at || new Date(challenge.expires_at).getTime() <= Date.now()) {
      throw new HttpError(400, 'Código inválido ou expirado. Inicie o acesso novamente.', undefined, 'OTP_INVALID');
    }
    if (challenge.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Limite de tentativas atingido. Inicie um novo acesso.', undefined, 'OTP_ATTEMPTS_EXHAUSTED');
    const candidate = codeDigest(challenge.id, userId, sessionId, code);
    if (!crypto.timingSafeEqual(candidate, challenge.code_hmac)) {
      const { rows: [updated] } = await client.query(
        'update public.login_challenges set attempts = attempts + 1 where id = $1 returning attempts', [challenge.id],
      );
      if (updated.attempts >= MAX_ATTEMPTS) {
        await client.query('update public.login_challenges set invalidated_at = now() where id = $1', [challenge.id]);
        return { error: new HttpError(429, 'Limite de tentativas atingido. Inicie um novo acesso.', undefined, 'OTP_ATTEMPTS_EXHAUSTED') };
      }
      return { error: new HttpError(400, 'Código incorreto. Confira os dígitos e tente novamente.', { remainingAttempts: MAX_ATTEMPTS - updated.attempts }, 'OTP_INCORRECT') };
    }
    await client.query('update public.login_challenges set consumed_at = now() where id = $1', [challenge.id]);
    const existingAuthorization = await client.query(
      'select 1 from public.authorized_sessions where user_id = $1 and session_id = $2 for update',
      [userId, sessionId],
    );
    const authorization = await client.query(
      `insert into public.authorized_sessions (user_id, session_id) values ($1, $2)
       on conflict (user_id, session_id) do update set authorized_at = now()
       where public.authorized_sessions.revoked_at is null`, [userId, sessionId],
    );
    if (!authorization.rowCount) throw new HttpError(401, 'Sessão encerrada. Entre novamente.');
    await client.query(
      `insert into public.security_events (user_id, event_type, session_id)
       values ($1, 'additional_verification_completed', $2)`, [userId, sessionId],
    );
    return { authorized: true, newlyAuthorized: existingAuthorization.rowCount === 0 };
  });
  if (result.error) throw result.error;
  if (result.newlyAuthorized && user?.email) {
    void emailService.sendNewAccessAlert({
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      accessedAt: new Date().toISOString(),
    }).catch((error) => {
      const code = /^[A-Z0-9_]{1,64}$/.test(String(error.code || '')) ? error.code : 'UNKNOWN';
      console.warn('[security-alert]', JSON.stringify({ event: 'delivery_failed', code }));
    });
  }
  return { authorized: true };
};

const resend = async ({ user, sessionId, challengeId }) => {
  if (typeof challengeId !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(challengeId)) {
    throw new HttpError(422, 'Código de desafio inválido.', undefined, 'OTP_INVALID_FORMAT');
  }
  const result = await withTransaction(async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`${user.id}:${sessionId}`]);
    const revoked = await client.query(
      'select 1 from public.authorized_sessions where user_id = $1 and session_id = $2 and revoked_at is not null for update',
      [user.id, sessionId],
    );
    if (revoked.rowCount) throw new HttpError(401, 'Sessão encerrada. Entre novamente.');
    const { rows: [row] } = await client.query(
      `select * from public.login_challenges where id = $1 and user_id = $2 and session_id = $3
       and consumed_at is null and invalidated_at is null for update`, [challengeId, user.id, sessionId],
    );
    if (!row || new Date(row.expires_at).getTime() <= Date.now()) throw new HttpError(400, 'Código inválido ou expirado. Inicie o acesso novamente.', undefined, 'OTP_INVALID');
    if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Limite de tentativas atingido. Inicie um novo acesso.', undefined, 'OTP_ATTEMPTS_EXHAUSTED');
    if (Date.now() < new Date(row.resend_available_at).getTime()) throw new HttpError(429, 'Aguarde antes de solicitar outro código.', undefined, 'OTP_RESEND_WAIT');
    if (row.send_count >= MAX_SENDS) throw new HttpError(429, 'Limite de reenvios atingido. Inicie um novo acesso mais tarde.', undefined, 'OTP_RESEND_LIMIT');
    await reserveSend(client, user.id);
    const { rows: [updated] } = await client.query(
      `update public.login_challenges set code_hmac = decode(repeat('00', 32), 'hex'),
        expires_at = now() + interval '5 minutes', resend_available_at = now() + interval '60 seconds', send_count = send_count + 1
       where id = $1 returning *`, [row.id],
    );
    return updated;
  });
  await sendChallengeCode(result, user.email, user.user_metadata?.full_name || user.user_metadata?.name || '');
  return describe({ ...result, email: user.email });
};

const revoke = async ({ userId, sessionId }) => {
  await getPool().query(
    `insert into public.authorized_sessions (user_id, session_id, revoked_at) values ($1, $2, now())
     on conflict (user_id, session_id) do update set revoked_at = coalesce(public.authorized_sessions.revoked_at, now())`,
    [userId, sessionId],
  );
};

module.exports = { begin, resend, revoke, verify };
