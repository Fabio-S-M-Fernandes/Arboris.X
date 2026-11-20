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
const postgresStore = require('../src/store/postgres');
postgresStore.getPool = () => ({ query: async (sql) => {
  if (sql.includes('from auth.sessions')) return { rows: [{}], rowCount: 1 };
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
    assert.equal(JSON.stringify(await me.json()).includes('must-not-be-returned'), false);

    const optedIn = await request('/verify', {
      method: 'POST', body: JSON.stringify({ challengeId: crypto.randomUUID(), code: '123456', trustDevice: true }),
      headers: { Origin: 'http://localhost:5000' },
    });
    assert.equal(optedIn.status, 200);
    assert.deepEqual(await optedIn.json(), { authorized: true, trustedDeviceRegistered: true });
    assert.equal(registrations, 1);
    assert.match(optedIn.headers.get('set-cookie'), /HttpOnly/i);

    // A shared Wi-Fi IP must not make one visitor consume another account's OTP bucket.
    for (let index = 0; index < 10; index += 1) {
      user.id = crypto.randomUUID();
      const isolated = await request('/challenge', { method: 'POST', body: '{}' });
      assert.equal(isolated.status, 200);
    }

    const lastAccount = await request('/challenge', { method: 'POST', body: '{}' });
    for (let index = 0; index < 8; index += 1) {
      const withinLimit = await request('/challenge', { method: 'POST', body: '{}' });
      assert.equal(withinLimit.status, 200);
    }
    assert.equal(lastAccount.status, 200);
    const blocked = await request('/challenge', { method: 'POST', body: '{}' });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
