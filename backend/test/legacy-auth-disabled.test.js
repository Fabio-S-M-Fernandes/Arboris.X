const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.LEGACY_AUTH_ENABLED = 'true';
const app = require('../src/app');

test('legacy authentication cannot be re-enabled by environment variable', () => {
  assert.equal(require('../src/config').LEGACY_AUTH_ENABLED, undefined);
});

test('retired JWT API returns 410 instead of authenticating or creating JSON users', async (context) => {
  const server = app.listen(0, '127.0.0.1');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: 'Teste', email: 'legacy@example.test', senha: 'not-a-real-password', termosAceitos: true }),
  });
  const body = await response.json();
  assert.equal(response.status, 410);
  assert.equal(body.error.code, 'LEGACY_AUTH_DISABLED');
  assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/i);

  const legacyTokenResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/me`, {
    headers: { Authorization: 'Bearer legacy-token-value' },
  });
  assert.equal(legacyTokenResponse.status, 410);
  assert.equal((await legacyTokenResponse.json()).error.code, 'LEGACY_AUTH_DISABLED');
});
