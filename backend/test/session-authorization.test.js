const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.OTP_SECRET = crypto.randomBytes(48).toString('hex');
const postgresStore = require('../src/store/postgres');
let poolProvider = () => { throw new Error('Unexpected database access'); };
postgresStore.getPool = () => poolProvider();
const emailService = require('../src/services/email.service');
const sentEmails = [];
const sentAlerts = [];
emailService.sendVerificationCode = async (message) => { sentEmails.push(message); };
emailService.sendNewAccessAlert = async (message) => { sentAlerts.push(message); };
const authorizationService = require('../src/services/session-authorization.service');

const createPool = () => {
  const challenges = new Map();
  const acceptances = [];
  const authorizations = new Set();
  let sendLimit;
  const query = async (source, values = []) => {
    const statement = source.replace(/\s+/g, ' ').trim().toLowerCase();
    if (['begin', 'commit', 'rollback'].includes(statement)) return { rows: [], rowCount: 0 };
    if (statement.startsWith('insert into public.terms_acceptances')) {
      if (!acceptances.some((entry) => entry[0] === values[0] && entry[1] === values[1] && entry[2] === values[2])) acceptances.push(values);
      return { rows: [], rowCount: 1 };
    }
    if (statement.startsWith('select 1 from public.authorized_sessions where user_id = $1 and session_id = $2 for update')) {
      const exists = authorizations.has(`${values[0]}:${values[1]}`);
      return { rows: exists ? [{}] : [], rowCount: exists ? 1 : 0 };
    }
    if (statement.startsWith('insert into public.profiles')
      || statement.startsWith('delete from public.login_challenges')
      || statement.startsWith('select pg_advisory_xact_lock')
      || statement.startsWith('select 1 from public.authorized_sessions')) {
      return { rows: [], rowCount: 0 };
    }
    if (statement.startsWith('select * from public.login_challenges where user_id')) {
      const row = [...challenges.values()].find((challenge) => challenge.user_id === values[0]
        && challenge.session_id === values[1] && !challenge.consumed_at && !challenge.invalidated_at
        && challenge.expires_at.getTime() > Date.now());
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (statement.startsWith('insert into public.otp_send_limits')) {
      sendLimit ||= { user_id: values[0], window_started_at: new Date(Date.now()), sends: 0 };
      return { rows: [], rowCount: 0 };
    }
    if (statement.startsWith('select * from public.otp_send_limits')) return { rows: [sendLimit], rowCount: 1 };
    if (statement.startsWith('update public.otp_send_limits set window_started_at')) {
      sendLimit.window_started_at = new Date(Date.now());
      sendLimit.sends = 0;
      return { rows: [{ window_started_at: sendLimit.window_started_at }], rowCount: 1 };
    }
    if (statement.startsWith('update public.otp_send_limits set sends = greatest(sends - 1, 0)')) {
      if (sendLimit.user_id === values[0] && sendLimit.window_started_at.getTime() === new Date(values[1]).getTime()) {
        sendLimit.sends = Math.max(0, sendLimit.sends - 1);
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    if (statement.startsWith('update public.otp_send_limits set sends = sends + 1')) {
      sendLimit.sends += 1;
      return { rows: [], rowCount: 1 };
    }
    if (statement.startsWith('insert into public.login_challenges')) {
      const id = crypto.randomUUID();
      const now = Date.now();
      const row = {
        id, user_id: values[0], session_id: values[1], code_hmac: Buffer.alloc(32),
        created_at: new Date(now), expires_at: new Date(now + 5 * 60_000),
        resend_available_at: new Date(now + 60_000), attempts: 0, send_count: 1,
        consumed_at: null, invalidated_at: null,
      };
      challenges.set(id, row);
      return { rows: [row], rowCount: 1 };
    }
    if (statement.startsWith('update public.login_challenges set code_hmac = $2 where id = $1')) {
      const row = challenges.get(values[0]);
      row.code_hmac = values[1];
      return { rows: [], rowCount: 1 };
    }
    if (statement.startsWith('update public.login_challenges set code_hmac = decode')) {
      const row = challenges.get(values[0]);
      const now = Date.now();
      row.code_hmac = Buffer.alloc(32);
      row.created_at = new Date(now);
      row.expires_at = new Date(now + 5 * 60_000);
      row.resend_available_at = new Date(now + 60_000);
      row.send_count += 1;
      return { rows: [row], rowCount: 1 };
    }
    if (statement.startsWith('select * from public.login_challenges where id = $1')) {
      const row = challenges.get(values[0]);
      const matches = row && (values.length < 3 || (row.user_id === values[1] && row.session_id === values[2]))
        && (!statement.includes('consumed_at is null') || !row.consumed_at)
        && (!statement.includes('invalidated_at is null') || !row.invalidated_at);
      return { rows: matches ? [row] : [], rowCount: matches ? 1 : 0 };
    }
    if (statement.startsWith('update public.login_challenges set attempts = attempts + 1')) {
      const row = challenges.get(values[0]);
      row.attempts += 1;
      return { rows: [{ attempts: row.attempts }], rowCount: 1 };
    }
    if (statement.startsWith('update public.login_challenges set invalidated_at = now()')) {
      const row = challenges.get(values[0]);
      row.invalidated_at = new Date(Date.now());
      return { rows: [], rowCount: 1 };
    }
    if (statement.startsWith('update public.login_challenges set consumed_at = now()')) {
      const row = challenges.get(values[0]);
      row.consumed_at = new Date(Date.now());
      return { rows: [], rowCount: 1 };
    }
    if (statement.startsWith('insert into public.authorized_sessions')) {
      authorizations.add(`${values[0]}:${values[1]}`);
      return { rows: [], rowCount: 1 };
    }
    if (statement.startsWith('insert into public.security_events')) {
      return { rows: [], rowCount: 1 };
    }
    throw new Error('Unexpected query in isolated OTP test.');
  };
  return { connect: async () => ({ query, release() {} }), query, challenges, acceptances, get sendLimit() { return sendLimit; } };
};

test('verify rejects malformed challenge UUIDs as 422 before querying PostgreSQL', async () => {
  await assert.rejects(
    authorizationService.verify({
      userId: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      challengeId: '-'.repeat(36),
      code: '004207',
    }),
    (error) => error.status === 422 && error.code === 'OTP_INVALID_FORMAT',
  );
});

test('a newly OTP-authorized Supabase session triggers one security alert through the email service', async () => {
  const pool = createPool();
  poolProvider = () => pool;
  sentEmails.length = 0;
  sentAlerts.length = 0;
  const user = {
    id: crypto.randomUUID(), email: 'person@example.com',
    email_confirmed_at: new Date().toISOString(), user_metadata: { full_name: 'Pessoa de teste' },
  };
  const sessionId = crypto.randomUUID();

  const first = await authorizationService.begin({ user, sessionId });
  const firstResult = await authorizationService.verify({
    userId: user.id, user, sessionId, challengeId: first.challengeId, code: sentEmails[0].code,
  });
  assert.deepEqual(firstResult, { authorized: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sentAlerts.length, 1);
  assert.equal(sentAlerts[0].email, user.email);
  assert.equal(sentAlerts[0].name, 'Pessoa de teste');

  const second = await authorizationService.begin({ user, sessionId });
  await authorizationService.verify({
    userId: user.id, user, sessionId, challengeId: second.challengeId, code: sentEmails[1].code,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sentAlerts.length, 1);
});

test('new sessions do not reset the user send limit inside its rolling window', async (context) => {
  const now = Date.now();
  context.mock.method(Date, 'now', () => now);
  const pool = createPool();
  poolProvider = () => pool;
  sentEmails.length = 0;
  const user = {
    id: crypto.randomUUID(),
    email: 'person@example.com',
    email_confirmed_at: new Date(now).toISOString(),
    user_metadata: { full_name: 'Pessoa de teste' },
  };

  for (let send = 0; send < 5; send += 1) {
    const challenge = await authorizationService.begin({ user, sessionId: crypto.randomUUID() });
    assert.ok(Number.isFinite(challenge.expiresAt));
    assert.equal('code' in challenge, false);
  }
  await assert.rejects(
    authorizationService.begin({ user, sessionId: crypto.randomUUID() }),
    (error) => error.status === 429 && error.code === 'OTP_SEND_LIMIT',
  );
  assert.equal(sentEmails.length, 5);
});

test('a failed email delivery releases the reserved OTP send without leaving a usable challenge', async () => {
  const pool = createPool();
  poolProvider = () => pool;
  const originalSend = emailService.sendVerificationCode;
  emailService.sendVerificationCode = async () => { throw Object.assign(new Error('provider unavailable'), { status: 503, code: 'EMAIL_DELIVERY_FAILED' }); };
  const user = { id: crypto.randomUUID(), email: 'person@example.com', email_confirmed_at: new Date().toISOString(), user_metadata: {} };
  try {
    await assert.rejects(
      authorizationService.begin({ user, sessionId: crypto.randomUUID() }),
      (error) => error.status === 503 && error.code === 'EMAIL_DELIVERY_FAILED',
    );
    assert.equal(pool.sendLimit.sends, 0);
    assert.equal([...pool.challenges.values()][0].invalidated_at instanceof Date, true);
  } finally {
    emailService.sendVerificationCode = originalSend;
  }
});

test('database OTP resend invalidates the old code and a consumed code cannot be reused', async (context) => {
  const clock = { now: Date.now() };
  context.mock.method(Date, 'now', () => clock.now);
  const pool = createPool();
  poolProvider = () => pool;
  sentEmails.length = 0;
  const user = {
    id: crypto.randomUUID(),
    email: 'person@example.com',
    email_confirmed_at: new Date(clock.now).toISOString(),
    user_metadata: { full_name: 'Pessoa de teste' },
  };
  const sessionId = crypto.randomUUID();
  const challenge = await authorizationService.begin({ user, sessionId });
  const oldCode = sentEmails[0].code;

  await assert.rejects(
    authorizationService.resend({ user, sessionId, challengeId: challenge.challengeId }),
    (error) => error.status === 429 && error.code === 'OTP_RESEND_WAIT',
  );
  assert.equal(sentEmails.length, 1);
  clock.now += 60_001;
  const resent = await authorizationService.resend({ user, sessionId, challengeId: challenge.challengeId });
  const newCode = sentEmails[1].code;
  assert.notEqual(newCode, oldCode);
  await assert.rejects(
    authorizationService.verify({ userId: user.id, sessionId, challengeId: resent.challengeId, code: oldCode }),
    (error) => error.status === 400 && error.code === 'OTP_INCORRECT',
  );
  assert.equal(pool.challenges.get(challenge.challengeId).attempts, 1);
  assert.deepEqual(
    await authorizationService.verify({ userId: user.id, sessionId, challengeId: resent.challengeId, code: newCode }),
    { authorized: true },
  );
  await assert.rejects(
    authorizationService.verify({ userId: user.id, sessionId, challengeId: resent.challengeId, code: newCode }),
    (error) => error.status === 400 && error.code === 'OTP_INVALID',
  );
});

test('database OTP invalidates the challenge on the fifth wrong attempt', async (context) => {
  const clock = { now: Date.now() };
  context.mock.method(Date, 'now', () => clock.now);
  const pool = createPool();
  poolProvider = () => pool;
  sentEmails.length = 0;
  const user = {
    id: crypto.randomUUID(),
    email: 'person@example.com',
    email_confirmed_at: new Date(clock.now).toISOString(),
    user_metadata: {},
  };
  const sessionId = crypto.randomUUID();
  const challenge = await authorizationService.begin({ user, sessionId });
  const validCode = sentEmails[0].code;
  const wrongCode = String((Number(validCode) + 1) % 1_000_000).padStart(6, '0');

  for (let attempt = 1; attempt < 5; attempt += 1) {
    await assert.rejects(
      authorizationService.verify({ userId: user.id, sessionId, challengeId: challenge.challengeId, code: wrongCode }),
      (error) => error.status === 400 && error.code === 'OTP_INCORRECT',
    );
  }
  await assert.rejects(
    authorizationService.verify({ userId: user.id, sessionId, challengeId: challenge.challengeId, code: wrongCode }),
    (error) => error.status === 429 && error.code === 'OTP_ATTEMPTS_EXHAUSTED',
  );
  assert.ok(pool.challenges.get(challenge.challengeId).invalidated_at);
  await assert.rejects(
    authorizationService.verify({ userId: user.id, sessionId, challengeId: challenge.challengeId, code: validCode }),
    (error) => error.status === 400 && error.code === 'OTP_INVALID',
  );
});

test('database OTP caps a challenge at five sends despite elapsed resend intervals', async (context) => {
  const clock = { now: Date.now() };
  context.mock.method(Date, 'now', () => clock.now);
  const pool = createPool();
  poolProvider = () => pool;
  sentEmails.length = 0;
  const user = {
    id: crypto.randomUUID(),
    email: 'person@example.com',
    email_confirmed_at: new Date(clock.now).toISOString(),
    user_metadata: {},
  };
  const sessionId = crypto.randomUUID();
  let challenge = await authorizationService.begin({ user, sessionId });

  for (let resend = 0; resend < 4; resend += 1) {
    clock.now = challenge.resendAvailableAt + 1;
    challenge = await authorizationService.resend({ user, sessionId, challengeId: challenge.challengeId });
  }
  assert.equal(sentEmails.length, 5);
  clock.now = challenge.resendAvailableAt + 1;
  await assert.rejects(
    authorizationService.resend({ user, sessionId, challengeId: challenge.challengeId }),
    (error) => error.status === 429 && error.code === 'OTP_RESEND_LIMIT',
  );
  assert.equal(sentEmails.length, 5);
});

test('resend rejects malformed challenge UUIDs as 422 before querying PostgreSQL', async () => {
  await assert.rejects(
    authorizationService.resend({
      user: { id: crypto.randomUUID(), email: 'person@example.com' },
      sessionId: crypto.randomUUID(),
      challengeId: 'not-a-uuid',
    }),
    (error) => error.status === 422 && error.code === 'OTP_INVALID_FORMAT',
  );
});


test('accepted Terms and Privacy versions are persisted once by the server', async () => {
  const pool = createPool();
  poolProvider = () => pool;
  sentEmails.length = 0;
  const user = {
    id: crypto.randomUUID(), email: 'terms@example.com',
    email_confirmed_at: new Date().toISOString(),
    user_metadata: {
      full_name: 'Pessoa', terms_accepted: true,
      terms_version: '2026-11-15', privacy_version: '2026-11-15',
    },
  };
  const sessionId = crypto.randomUUID();

  await authorizationService.begin({ user, sessionId });
  await authorizationService.begin({ user, sessionId });

  assert.equal(pool.acceptances.length, 1);
  assert.deepEqual(pool.acceptances[0], [user.id, '2026-11-15', '2026-11-15']);
});
