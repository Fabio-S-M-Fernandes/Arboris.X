const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.NODE_ENV = 'test';
process.env.TRUSTED_DEVICE_ENABLED = 'true';
process.env.FRONTEND_URL = 'http://localhost:5000';
process.env.RATE_LIMIT_STORAGE = 'memory';

const userId = crypto.randomUUID();
const sessionId = crypto.randomUUID();
const user = { id: userId, email: 'test@example.test', email_confirmed_at: new Date().toISOString(), user_metadata: {} };
const supabaseService = require('../src/services/supabase.service');
supabaseService.verifyAccessToken = async () => ({ user, sessionId, claims: {} });

let authorized = false;
let optionalCookiesAccepted = true;
const postgresStore = require('../src/store/postgres');
postgresStore.getPool = () => ({ query: async (sql, values) => {
  if (sql.includes('from auth.sessions')) return { rows: [{
    id: user.id, email: user.email, email_confirmed_at: user.email_confirmed_at,
    confirmed_at: null, raw_user_meta_data: user.user_metadata, raw_app_meta_data: { provider: 'email' },
    profile_full_name: 'Nome do perfil',
  }], rowCount: 1 };
  if (sql.includes('from public.account_consent')) return {
    rows: [{ accepted_at: new Date(), optional_cookies_accepted: optionalCookiesAccepted }], rowCount: 1,
  };
  if (sql.includes('update public.account_consent set optional_cookies_accepted')) {
    optionalCookiesAccepted = values[1];
    return { rows: [{ optional_cookies_accepted: optionalCookiesAccepted }], rowCount: 1 };
  }
  if (sql.includes('from public.authorized_sessions')) return {
    rows: authorized ? [{ authorized_at: new Date() }] : [], rowCount: authorized ? 1 : 0,
  };
  throw new Error('Unexpected database query in route test');
} });

const authorizationService = require('../src/services/session-authorization.service');
authorizationService.begin = async () => ({ challengeId: crypto.randomUUID(), maskedEmail: 'te***@example.test', expiresAt: Date.now() + 300_000, resendAvailableAt: Date.now() + 60_000 });
authorizationService.verify = async () => { authorized = true; return { authorized: true }; };

const trustedService = require('../src/services/trusted-device.service');
const token = crypto.randomBytes(32).toString('base64url');
let trustCalls = 0;
let registrations = 0;
trustedService.tryAuthorize = async ({ token: presented }) => {
  trustCalls += 1;
  if (presented !== token) return null;
  authorized = true;
  return { token: crypto.randomBytes(32).toString('base64url'), expiresAt: new Date(Date.now() + 86_400_000), newlyAuthorized: true };
};
trustedService.register = async () => {
  registrations += 1;
  return { token: crypto.randomBytes(32).toString('base64url'), expiresAt: new Date(Date.now() + 86_400_000) };
};
const emailService = require('../src/services/email.service');
emailService.sendNewAccessAlert = async () => {};

const app = require('../src/app');

test('challenge requires an allowed Origin and valid cookie for trusted authorization; OTP opt-in sets a protected cookie', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/session`;
  const request = (path, options = {}) => fetch(`${base}${path}`, {
    ...options,
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json', ...options.headers },
  });
  try {
    const before = await request('/me');
    assert.equal(before.status, 403);

    const withoutOrigin = await request('/challenge', {
      method: 'POST', body: '{}', headers: { Cookie: `__Host-arboris-trusted=${token}` },
    });
    assert.equal(withoutOrigin.status, 200);
    assert.ok((await withoutOrigin.json()).challengeId);
    assert.equal(trustCalls, 0);

    const trusted = await request('/challenge', {
      method: 'POST', body: '{}', headers: { Origin: 'http://localhost:5000', Cookie: `__Host-arboris-trusted=${token}` },
    });
    assert.equal(trusted.status, 200);
    assert.deepEqual(await trusted.json(), { authorized: true, trustedDevice: true });
    const cookie = trusted.headers.get('set-cookie');
    assert.match(cookie, /__Host-arboris-trusted=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=None/i);
    user.user_metadata.private_field = 'must-not-be-returned';
    const me = await request('/me');
    assert.equal(me.status, 200);
    const meBody = await me.json();
    assert.equal(JSON.stringify(meBody).includes('must-not-be-returned'), false);
    assert.equal(meBody.user.userMetadata.full_name, 'Nome do perfil');
    assert.deepEqual(meBody.user.authProviders, ['email']);
    assert.equal(meBody.user.emailConfirmed, true);

    const optedIn = await request('/verify', {
      method: 'POST', body: JSON.stringify({ challengeId: crypto.randomUUID(), code: '123456', trustDevice: true }),
      headers: { Origin: 'http://localhost:5000' },
    });
    assert.equal(optedIn.status, 200);
    assert.deepEqual(await optedIn.json(), { authorized: true, trustedDeviceRegistered: true });
    assert.equal(registrations, 1);
    assert.match(optedIn.headers.get('set-cookie'), /HttpOnly/i);

    const cookieChoice = await request('/consent/cookies', {
      method: 'PATCH', body: JSON.stringify({ optionalCookiesAccepted: false }),
    });
    assert.equal(cookieChoice.status, 200);
    assert.deepEqual(await cookieChoice.json(), { optionalCookiesAccepted: false });
    assert.match(cookieChoice.headers.get('set-cookie'), /__Host-arboris-trusted=/);
    assert.equal((await request('/consent')).status, 200);

    // Account throttles stay independent for multiple users behind one IP.
    user.id = crypto.randomUUID();
    for (let index = 0; index < 30; index += 1) {
      assert.equal((await request('/challenge', { method: 'POST', body: '{}' })).status, 200);
    }
    const blockedAccount = await request('/challenge', { method: 'POST', body: '{}' });
    assert.equal(blockedAccount.status, 429);
    assert.ok(Number(blockedAccount.headers.get('retry-after')) > 0);

    user.id = crypto.randomUUID();
    assert.equal((await request('/challenge', { method: 'POST', body: '{}' })).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
