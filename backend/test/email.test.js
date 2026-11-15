const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SMTP_FROM = 'Arboris.X <no-reply@example.com>';
process.env.RESEND_API_KEY = 're_test_only';
process.env.EMAIL_FROM = 'Arboris.X <no-reply@example.com>';
const { buildNewAccessMessage, buildVerificationMessage } = require('../src/services/email.service');
const emailService = require('../src/services/email.service');
const mojibakeMarkers = [
  'Ol\u00c3\u00a1', 'c\u00c3\u00b3digo', 'seguran\u00c3\u00a7a',
  'voc\u00c3\u00aa', 'n\u00c3\u00a3o', 'INTELIG\u00c3\u0160NCIA',
];
const assertNoMojibake = (value) => {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  assert.equal(mojibakeMarkers.some((marker) => serialized.includes(marker)), false);
  assert.equal(serialized.includes(String.fromCharCode(0xfffd)), false);
};

test('verification email has Arboris.X identity, responsive HTML, plain text, and no active content', () => {
  const message = buildVerificationMessage({
    email: 'person@example.com', name: '<Pessoa & Companhia>', code: '004207', expiresInMinutes: 5,
  });
  assert.equal(message.to, 'person@example.com');
  assert.equal(message.from, process.env.SMTP_FROM);
  assert.equal(message.subject, 'Confirme seu acesso.');
  assert.match(message.text, /Olá, <Pessoa & Companhia>!/);
  assert.match(message.text, /confirme sua identidade utilizando o código abaixo/);
  assert.match(message.text, /004207/);
  assert.match(message.text, /expira em 5 minutos/);
  assert.match(message.text, /Nunca compartilhe seu código/);
  assert.match(message.text, /INTELIGÊNCIA AMBIENTAL/);
  assert.match(message.html, /<meta charset="utf-8">/);
  assert.match(message.html, /name="viewport"/);
  assert.match(message.html, /Confirme seu acesso\./);
  assert.match(message.html, /VERIFICAÇÃO DE SEGURANÇA/);
  assert.match(message.html, /Olá, &lt;Pessoa &amp; Companhia&gt;!/);
  assert.match(message.html, /004207/);
  assert.match(message.html, /background:#071510/);
  assert.match(message.html, /background:#0b261a/);
  assert.match(message.html, /#21d991/);
  assert.match(message.html, /max-width:580px/);
  assert.match(message.html, /role="presentation"/);
  assert.doesNotMatch(message.html, /<script|<img/i);
  assertNoMojibake(message);
  assert.deepEqual(JSON.parse(JSON.stringify(message)), message);
  assert.throws(() => buildVerificationMessage({ email: 'person@example.com', name: 'Pessoa', code: '4207' }));
  assert.throws(() => buildVerificationMessage({ email: 'person@example.com', name: 'Pessoa', code: '004207', expiresInMinutes: 0 }));
});

test('new-device alert is branded, escapes HTML, and contains no credential fields', () => {
  const message = buildNewAccessMessage({
    email: 'person@example.com', name: '<Pessoa & Companhia>', deviceType: 'Computador',
    browser: '<script>Google Chrome</script>', operatingSystem: 'Windows',
    approximateLocation: '<Centro & Norte>', accessedAt: '2026-11-13T12:00:00.000Z',
  });
  assert.equal(message.to, 'person@example.com');
  assert.equal(message.subject, 'Novo acesso detectado — Arboris.X');
  assert.match(message.text, /<Centro & Norte>/);
  assert.match(message.text, /Identificamos um novo acesso à sua conta/);
  assert.match(message.text, /INTELIGÊNCIA AMBIENTAL/);
  assert.match(message.html, /&lt;Pessoa &amp; Companhia&gt;/);
  assert.match(message.html, /&lt;script&gt;Google Chrome&lt;\/script&gt;/);
  assert.match(message.html, /&lt;Centro &amp; Norte&gt;/);
  assert.match(message.html, /ALERTA DE SEGURANÇA/);
  assert.match(message.html, /background:#071510/);
  assert.match(message.html, /background:#0b261a/);
  assert.doesNotMatch(message.html, /<script|idToken|password|\btoken\b/i);
  assert.doesNotMatch(message.text, /idToken|password|\btoken\b/i);
  assertNoMojibake(message);
});

test('Resend JSON payload preserves UTF-8 without making an external request', async () => {
  const originalFetch = global.fetch;
  let requestBody;
  let contentType;
  global.fetch = async (url, options) => {
    requestBody = options.body;
    contentType = new Headers(options.headers).get('content-type');
    return new Response('{"id":"test-email-id"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    await emailService.sendVerificationCode({
      email: 'person@example.com', name: 'João', code: '004207', expiresInMinutes: 5,
    });
  } finally {
    global.fetch = originalFetch;
  }
  const payload = JSON.parse(requestBody);
  assert.match(contentType, /application\/json/i);
  assert.match(payload.text, /Olá, João!/);
  assert.match(payload.html, /Olá, João!/);
  assert.match(payload.html, /VERIFICAÇÃO DE SEGURANÇA/);
  assertNoMojibake(requestBody);
});
