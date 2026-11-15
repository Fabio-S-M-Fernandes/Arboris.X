const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { validateCredentials } = require('../src/validators/auth.validator');
const { requireHttpsInProduction } = require('../src/middleware/httpsOnly');
const { errorHandler } = require('../src/middleware/errorHandler');

test('authentication validation accepts valid login and registration credentials', () => {
  assert.doesNotThrow(() => validateCredentials({
    email: 'person@example.com',
    senha: 'senha-segura',
  }, false));

  assert.doesNotThrow(() => validateCredentials({
    nome: 'Pessoa',
    email: 'person@example.com',
    senha: 'senha-segura',
    termosAceitos: true,
  }, true));
});

test('registration validation still requires a name and accepted terms', () => {
  assert.throws(() => validateCredentials({
    email: 'person@example.com',
    senha: 'senha-segura',
  }, true));
});

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
    JWT_SECRET: 'j'.repeat(48),
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
