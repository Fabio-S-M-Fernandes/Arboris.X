const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { requireHttpsInProduction } = require('../src/middleware/httpsOnly');
const { errorHandler } = require('../src/middleware/errorHandler');
const HttpError = require('../src/utils/httpError');

test('HTTPS is required only in production and accepts secure proxy requests', () => {
  const previousEnvironment = process.env.NODE_ENV;
  const run = (secure) => {
    let forwarded;
    requireHttpsInProduction({ secure }, {}, (error) => { forwarded = error; });
    return forwarded;
  };

  try {
    process.env.NODE_ENV = 'development';
    assert.equal(run(false), undefined);
    process.env.NODE_ENV = 'production';
    assert.equal(run(false).code, 'HTTPS_REQUIRED');
    assert.equal(run(true), undefined);
  } finally {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
  }
});

test('production configuration rejects insecure frontend origins', () => {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    FRONTEND_URL: 'http://app.example.com',
    OTP_SECRET: 'o'.repeat(48),
  };
  const result = spawnSync(process.execPath, ['-e', "require('./src/config')"], {
    cwd: require('node:path').resolve(__dirname, '..'),
    env,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /HTTPS/i);
});

test('production accepts EMAIL_PROVIDER=gmail_api and exposes the canonical provider name', () => {
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    FRONTEND_URL: 'https://app.example.test',
    OTP_SECRET: 'o'.repeat(48),
    SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
    DATABASE_URL: 'postgresql://user:password@db.example.test:5432/postgres',
    EMAIL_PROVIDER: 'gmail_api',
    EMAIL_FROM: 'Arboris.X <sender@example.test>',
    GMAIL_CLIENT_ID: 'test-client-id',
    GMAIL_CLIENT_SECRET: 'test-client-secret',
    GMAIL_REFRESH_TOKEN: 'test-refresh-token',
    GMAIL_SENDER_EMAIL: 'sender@example.test',
  };
  const result = spawnSync(process.execPath, ['-e', "process.stdout.write(require('./src/config').EMAIL_PROVIDER)"], {
    cwd: require('node:path').resolve(__dirname, '..'),
    env,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'gmail-api');
});

test('PostgreSQL authentication errors expose a safe code and retain the original code only in technical logs', () => {
  const response = {
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  const original = console.error;
  let logged = '';
  console.error = (...parts) => { logged = parts.join(' '); };
  try {
    errorHandler({ code: '28P01', message: 'sensitive database diagnostic' }, {
      method: 'GET', path: '/api/session/me',
    }, response, () => {});
  } finally { console.error = original; }
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error.code, 'DATABASE_AUTH_FAILED');
  assert.match(logged, /28P01/);
  assert.doesNotMatch(logged, /sensitive database diagnostic/);
});

test('OTP cooldown returns a Retry-After header without exposing internal details', () => {
  const response = {
    headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  const original = console.error;
  console.error = () => {};
  try {
    const limited = new HttpError(429, 'Aguarde.', undefined, 'OTP_RESEND_WAIT');
    limited.retryAfterSeconds = 42;
    errorHandler(limited,
      { method: 'POST', path: '/api/session/resend' }, response, () => {});
  } finally { console.error = original; }
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers['Retry-After'], '42');
  assert.deepEqual(response.body, { error: { message: 'Aguarde.', code: 'OTP_RESEND_WAIT' } });
});

test('unexpected client errors do not expose messages, codes or details from dependencies', () => {
  const response = {
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  const original = console.error;
  console.error = () => {};
  try {
    errorHandler({ status: 400, code: 'PRIVATE_PROVIDER_CODE', details: { token: 'private' }, message: 'private diagnostic' },
      { method: 'POST', path: '/api/session/challenge' }, response, () => {});
  } finally { console.error = original; }
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, { error: { message: 'Não foi possível processar a solicitação.' } });
});

test('email delivery failure exposes only its safe public code', () => {
  const response = {
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
  const original = console.error;
  console.error = () => {};
  try {
    errorHandler({ status: 503, code: 'EMAIL_DELIVERY_FAILED', message: 'private provider error' },
      { method: 'POST', path: '/api/session/challenge' }, response, () => {});
  } finally { console.error = original; }
  assert.deepEqual(response.body, { error: { message: 'Erro interno do servidor.', code: 'EMAIL_DELIVERY_FAILED' } });
  assert.equal(response.statusCode, 503);
});
