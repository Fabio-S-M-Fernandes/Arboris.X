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
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.doesNotMatch(response.headers.get('content-security-policy'), /unsafe-inline|unsafe-eval/);
  assert.equal(response.headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');

  const legacyTokenResponse = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/me`, {
    headers: { Authorization: 'Bearer legacy-token-value' },
  });
  assert.equal(legacyTokenResponse.status, 410);
  assert.equal((await legacyTokenResponse.json()).error.code, 'LEGACY_AUTH_DISABLED');

  const allowedOrigin = require('../src/config').FRONTEND_URLS[0];
  const preflight = await fetch(`http://127.0.0.1:${server.address().port}/api/session/me`, {
    method: 'OPTIONS',
    headers: { Origin: allowedOrigin, 'Access-Control-Request-Method': 'GET' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), allowedOrigin);
  assert.match(preflight.headers.get('access-control-expose-headers'), /X-Request-ID/);

  const forbidden = await fetch(`http://127.0.0.1:${server.address().port}/api/health`, {
    headers: { Origin: 'https://untrusted.example.test' },
  });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('access-control-allow-origin'), null);
});
