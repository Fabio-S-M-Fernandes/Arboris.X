const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRawMessage } = require('../src/services/email-provider.service');

process.env.EMAIL_PROVIDER = 'gmail-api';
process.env.EMAIL_FROM = 'Arboris.X <sender@example.test>';
process.env.GMAIL_CLIENT_ID = 'client-id-for-tests';
process.env.GMAIL_CLIENT_SECRET = 'client-secret-for-tests';
process.env.GMAIL_REFRESH_TOKEN = 'refresh-token-for-tests';
process.env.GMAIL_SENDER_EMAIL = 'sender@example.test';
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

const decodeMimeHeader = (value) => value
  .replace(/\r\n[ \t]+/g, ' ')
  .replace(/\?= (?==\?)/g, '?=')
  .replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_word, charset, encoding, encoded) => {
    const bytes = encoding.toLowerCase() === 'b'
      ? Buffer.from(encoded, 'base64')
      : Buffer.from(encoded.replace(/_/g, ' ').replace(/=([a-f\d]{2})/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16))), 'binary');
    return new TextDecoder(charset).decode(bytes);
  });

const decodeQuotedPrintable = (value) => Buffer.from(
  value.replace(/=\r?\n/g, '').replace(/=([a-f\d]{2})/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16))),
  'binary',
).toString('utf8');

const parseMime = (raw) => {
  assert.match(raw, /^[A-Za-z0-9_-]+$/);
  const source = Buffer.from(raw, 'base64url').toString('utf8');
  assert.equal(Buffer.from(source, 'utf8').toString('base64url'), raw);
  assertNoMojibake(source);
  const headerBlock = source.slice(0, source.indexOf('\r\n\r\n'));
  const headers = headerBlock.replace(/\r\n[ \t]+/g, ' ');
  const getHeader = (name) => headers.split('\r\n').find((line) => line.toLowerCase().startsWith(`${name.toLowerCase()}:`))?.slice(name.length + 1).trim() || '';
  const boundary = /boundary="([^"]+)"/i.exec(getHeader('content-type'))?.[1];
  assert.ok(boundary);
  const parts = source.split(`--${boundary}`).slice(1)
    .filter((section) => !section.startsWith('--'))
    .map((section) => {
      const normalized = section.replace(/^\r\n/, '').replace(/\r\n$/, '');
      const separator = normalized.indexOf('\r\n\r\n');
      assert.ok(separator >= 0);
      const partHeaders = normalized.slice(0, separator);
      const body = normalized.slice(separator + 4);
      assert.match(partHeaders, /charset=utf-8/i);
      assert.match(partHeaders, /Content-Transfer-Encoding: quoted-printable/i);
      return decodeQuotedPrintable(body);
    });
  return {
    from: decodeMimeHeader(getHeader('from')),
    subject: decodeMimeHeader(getHeader('subject')),
    parts,
  };
};

test('UTF-8 phrases survive RFC MIME headers, UTF-8 body parts, and Gmail Base64URL encoding', async () => {
  const phrases = [
    'Ol\u00e1!',
    'Confirme seu acesso.',
    'C\u00f3digo de seguran\u00e7a.',
    'Redefini\u00e7\u00e3o de senha.',
    'Intelig\u00eancia ambiental.',
    'Integra\u00e7\u00e3o conclu\u00edda com sucesso.',
  ];
  const raw = await buildRawMessage({
    from: '\u00c1rvore Ambiental <sender@example.test>',
    to: 'person@example.test',
    subject: 'Integra\u00e7\u00e3o conclu\u00edda com sucesso',
    text: phrases.join('\n'),
    html: `<meta charset="utf-8">${phrases.map((phrase) => `<p>${phrase}</p>`).join('')}`,
  });
  const decoded = parseMime(raw);
  assert.equal(decoded.from, '\u00c1rvore Ambiental <sender@example.test>');
  assert.equal(decoded.subject, 'Integra\u00e7\u00e3o conclu\u00edda com sucesso');
  assert.equal(decoded.parts.length, 2);
  for (const phrase of phrases) {
    assert.ok(decoded.parts[0].includes(phrase), `plain-text MIME should preserve ${phrase}`);
    assert.ok(decoded.parts[1].includes(phrase), `HTML MIME should preserve ${phrase}`);
  }
});

test('verification email has Arboris.X identity, responsive HTML, plain text, and no active content', () => {
  const message = buildVerificationMessage({
    email: 'person@example.com', name: '<Pessoa & Companhia>', code: '004207', expiresInMinutes: 5,
  });
  assert.equal(message.to, 'person@example.com');
  assert.equal(message.from, process.env.EMAIL_FROM);
  assert.equal(message.subject, 'Confirme seu acesso — Arboris.X');
  assert.match(message.text, /Olá, <Pessoa & Companhia>!/);
  assert.match(message.text, /Seu código de segurança:/);
  assert.match(message.text, /004207/);
  assert.match(message.text, /Válido por 5 minutos/);
  assert.match(message.text, /Nunca compartilhe seu código/);
  assert.match(message.text, /INTELIGÊNCIA AMBIENTAL/);
  assert.match(message.html, /<meta charset="utf-8">/);
  assert.match(message.html, /name="viewport"/);
  assert.match(message.html, /Confirme seu acesso/);
  assert.match(message.html, /SEGURANÇA DA CONTA/);
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
  assert.match(message.text, /Sua conta Arboris.X recebeu um novo acesso/);
  assert.match(message.text, /INTELIGÊNCIA AMBIENTAL/);
  assert.match(message.html, /&lt;Pessoa &amp; Companhia&gt;/);
  assert.doesNotMatch(message.html, /Google Chrome|Centro & Norte|Windows/);
  assert.match(message.html, /ALERTA DE SEGURANÇA/);
  assert.match(message.html, /background:#071510/);
  assert.match(message.html, /background:#0b261a/);
  assert.doesNotMatch(message.html, /<script|idToken|password|\btoken\b/i);
  assert.doesNotMatch(message.text, /idToken|password|\btoken\b/i);
  assertNoMojibake(message);
});

test('Gmail API sends UTF-8 MIME through mocked HTTPS calls', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes('/token')) return new Response('{"access_token":"access-token-for-tests","expires_in":3600}', {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
    return new Response('{"id":"mock-message-id"}', {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    await emailService.sendVerificationCode({
      email: 'person@example.com', name: 'Jo\u00e3o', code: '004207', expiresInMinutes: 5,
    });
    await emailService.sendNewAccessAlert({
      email: 'person@example.com', name: 'Jo\u00e3o', accessedAt: '2026-11-13T12:00:00.000Z',
    });
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(requests.length, 4);
  assert.ok(requests[0].url.endsWith('oauth2.googleapis.com/token'));
  assert.ok(requests[1].url.endsWith('gmail.googleapis.com/gmail/v1/users/me/messages/send'));
  assert.ok(requests[2].url.endsWith('oauth2.googleapis.com/token'));
  assert.ok(requests[3].url.endsWith('gmail.googleapis.com/gmail/v1/users/me/messages/send'));
  assert.ok(new Headers(requests[0].options.headers).get('content-type').includes('application/x-www-form-urlencoded'));
  assert.equal(new Headers(requests[1].options.headers).get('authorization'), 'Bearer access-token-for-tests');
  const payload = JSON.parse(requests[1].options.body);
  const otpMime = parseMime(payload.raw);
  assert.equal(otpMime.subject, 'Confirme seu acesso — Arboris.X');
  assert.ok(otpMime.parts[0].includes('Ol\u00e1, Jo\u00e3o!'));
  assert.ok(otpMime.parts[0].includes('004207'));
  assert.ok(otpMime.parts[0].includes('INTELIG\u00caNCIA AMBIENTAL'));
  assert.ok(otpMime.parts[1].includes('Confirme seu acesso'));
  assert.ok(otpMime.parts[1].includes('Ol\u00e1, Jo\u00e3o!'));
  assert.ok(otpMime.parts[1].includes('SEGURAN\u00c7A DA CONTA'));
  const alertPayload = JSON.parse(requests[3].options.body);
  const alertMime = parseMime(alertPayload.raw);
  assert.equal(alertMime.subject, 'Novo acesso detectado \u2014 Arboris.X');
  assert.ok(alertMime.parts[0].includes('Ol\u00e1, Jo\u00e3o!'));
  assert.ok(alertMime.parts[0].includes('INTELIG\u00caNCIA AMBIENTAL'));
  assert.ok(alertMime.parts[1].includes('ALERTA DE SEGURAN\u00c7A'));
  assert.ok(alertMime.parts[1].includes('Jo\u00e3o'));
});

test('OTP delivery logs only a sanitized Gmail diagnosis on authorization failure', async () => {
  const originalFetch = global.fetch;
  const originalConsoleError = console.error;
  const logs = [];
  global.fetch = async (url) => String(url).includes('/token')
    ? new Response('{"access_token":"temporary-test-access"}', { status: 200 })
    : new Response(JSON.stringify({ error: {
      status: 'PERMISSION_DENIED',
      message: 'Request had insufficient authentication scopes. secret-response-body',
      errors: [{ reason: 'insufficientPermissions' }],
    } }), { status: 403 });
  console.error = (...values) => logs.push(values.join(' '));
  try {
    await assert.rejects(emailService.sendVerificationCode({
      email: 'person@example.com', name: 'Pessoa', code: '004207', expiresInMinutes: 5,
    }), (error) => error.code === 'EMAIL_DELIVERY_FAILED' && error.status === 503);
  } finally {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  }
  assert.equal(logs.length, 1);
  assert.match(logs[0], /^\[email-delivery\] /);
  const diagnostic = JSON.parse(logs[0].slice('[email-delivery] '.length));
  assert.deepEqual(Object.keys(diagnostic).sort(), ['category', 'code', 'message']);
  assert.deepEqual(diagnostic, {
    code: 'GMAIL_INSUFFICIENT_SCOPE', category: 'authorization',
    message: 'A autorização OAuth não inclui o escopo Gmail gmail.send.',
  });
  assert.doesNotMatch(logs[0], /temporary-test-access|secret-response-body|004207|person@example\.com|Pessoa/);
});
