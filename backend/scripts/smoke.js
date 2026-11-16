const assert = require('node:assert/strict');

// Exercise the current HTTP routes without contacting Auth, PostgreSQL or email.
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_STORAGE = 'memory';

const userId = 'a9a35b37-31f9-40d5-8126-6a97389512b5';
const sessionId = '0b98e90c-f782-48da-bdd7-7cf577b2a9c9';
let sessionActive = true;
let additionallyAuthorized = false;

const supabaseService = require('../src/services/supabase.service');
supabaseService.verifyAccessToken = async (token) => token === 'supabase-test-token'
  ? { user: { id: userId, email: 'smoke@example.test', email_confirmed_at: new Date().toISOString() }, sessionId, claims: {} }
  : null;

const postgres = require('../src/store/postgres');
postgres.getPool = () => ({
  async query(sql) {
    if (sql.includes('from auth.sessions')) return { rowCount: sessionActive ? 1 : 0, rows: sessionActive ? [{ '?column?': 1 }] : [] };
    if (sql.includes('select authorized_at from public.authorized_sessions')) {
      return { rowCount: additionallyAuthorized ? 1 : 0, rows: additionallyAuthorized ? [{ authorized_at: new Date().toISOString() }] : [] };
    }
    if (sql.includes('insert into public.authorized_sessions') && sql.includes('revoked_at')) {
      additionallyAuthorized = false;
      return { rowCount: 1, rows: [] };
    }
    throw new Error('Unexpected smoke SQL');
  },
});

const app = require('../src/app');

(async () => {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (path, token, method = 'GET') => fetch(`${base}${path}`, {
      method,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    });

    assert.equal((await request('/api/health')).status, 200);
    assert.equal((await request('/api/auth/register', undefined, 'POST')).status, 410);
    assert.equal((await request('/api/auth/me', 'legacy-jwt')).status, 410);
    assert.equal((await request('/api/session/me')).status, 401);
    assert.equal((await request('/api/session/me', 'legacy-jwt')).status, 401);
    assert.equal((await request('/api/session/me', 'supabase-test-token')).status, 403);

    additionallyAuthorized = true;
    const authorized = await request('/api/session/me', 'supabase-test-token');
    assert.equal(authorized.status, 200);
    assert.equal((await authorized.json()).user.id, userId);
    assert.equal((await request('/api/session/logout', 'supabase-test-token', 'POST')).status, 200);
    assert.equal((await request('/api/session/me', 'supabase-test-token')).status, 403);

    sessionActive = false;
    assert.equal((await request('/api/session/me', 'supabase-test-token')).status, 401);
    console.log('SMOKE_OK health=200 legacy=410 invalid=401 otp_required=403 authorized=200 logout=200 revoked=403 removed_session=401');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error('SMOKE_FAILED ' + error.message);
  process.exitCode = 1;
});
