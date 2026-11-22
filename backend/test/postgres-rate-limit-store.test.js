const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const PostgresRateLimitStore = require('../src/store/postgresRateLimitStore');

test('PostgreSQL rate-limit store uses an atomic upsert and stores only HMAC keys', async () => {
  const secret = crypto.randomBytes(48).toString('hex');
  let received;
  const resetTime = new Date(Date.now() + 60_000);
  const store = new PostgresRateLimitStore({
    limiter: 'auth:login', secret,
    poolProvider: () => ({ query: async (sql, values) => {
      received = { sql, values };
      return { rows: [{ hit_count: 3, expires_at: resetTime }] };
    } }),
  });
  store.init({ windowMs: 60_000 });

  const result = await store.increment('203.0.113.42');

  assert.equal(result.totalHits, 3);
  assert.equal(result.resetTime.getTime(), resetTime.getTime());
  assert.match(received.sql, /on conflict \(limiter, key_hash\) do update/i);
  assert.match(received.sql, /hit_count = case when .* then 1 else .* \+ 1 end/i);
  assert.equal(received.values[0], 'auth:login');
  assert.ok(Buffer.isBuffer(received.values[1]));
  assert.equal(received.values[1].length, 32);
  assert.notEqual(received.values[1].toString('utf8'), '203.0.113.42');
  assert.equal(received.values[2], 60_000);
});

test('PostgreSQL rate-limit store fails closed when the database is unavailable', async () => {
  const store = new PostgresRateLimitStore({
    limiter: 'session:challenge', secret: crypto.randomBytes(48).toString('hex'),
    poolProvider: () => ({ query: async () => { throw Object.assign(new Error('private connection details'), { code: '08006' }); } }),
  });

  const originalError = console.error;
  const logs = [];
  console.error = (...values) => logs.push(values.join(' '));
  try {
    await assert.rejects(store.increment('203.0.113.42'), (error) => (
      error.status === 503 && error.code === 'RATE_LIMIT_STORE_UNAVAILABLE'
        && error.message === 'Limitação temporária indisponível.'
    ));
  } finally {
    console.error = originalError;
  }
  assert.match(logs[0], /"operation":"increment_failed"/);
  assert.match(logs[0], /"limiter":"session:challenge"/);
  assert.match(logs[0], /"code":"08006"/);
  assert.match(logs[0], /"sqlstate":"08006"/);
  assert.match(logs[0], /"errorKind":"postgres_error"/);
  assert.doesNotMatch(logs[0], /private connection details|203\.0\.113\.42/);
});

test('PostgreSQL rate-limit store classifies code-less pool timeouts without logging the raw message', async () => {
  const store = new PostgresRateLimitStore({
    limiter: 'session:ip-preauth', secret: crypto.randomBytes(48).toString('hex'),
    poolProvider: () => ({ query: async () => { throw new Error('timeout exceeded when trying to connect to private-db.example:6543'); } }),
  });

  const originalError = console.error;
  const logs = [];
  console.error = (...values) => logs.push(values.join(' '));
  try {
    await assert.rejects(store.increment('198.51.100.17'), (error) => (
      error.status === 503 && error.code === 'RATE_LIMIT_STORE_UNAVAILABLE'
    ));
  } finally {
    console.error = originalError;
  }
  assert.match(logs[0], /"code":"UNKNOWN"/);
  assert.match(logs[0], /"errorKind":"pool_connect_timeout"/);
  assert.match(logs[0], /"errorName":"Error"/);
  assert.doesNotMatch(logs[0], /private-db\.example|6543|198\.51\.100\.17/);
});
