const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { validateCredentials } = require('../src/validators/auth.validator');
const { requireHttpsInProduction } = require('../src/middleware/httpsOnly');

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
