const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SMTP_FROM = 'Arboris.X <no-reply@example.com>';
const { buildNewAccessMessage, buildVerificationMessage } = require('../src/services/email.service');

test('verification email has Arboris.X identity, responsive HTML, plain text, and no active content', () => {
  const message = buildVerificationMessage({ email: 'person@example.com', name: '<Pessoa & Companhia>', code: '004207' });
  assert.equal(message.to, 'person@example.com');
  assert.equal(message.from, process.env.SMTP_FROM);
  assert.equal(message.subject, 'Seu código de segurança — Arboris.X');
  assert.match(message.text, /<Pessoa & Companhia>/);
  assert.match(message.text, /004207/);
  assert.match(message.text, /expira em 5 minutos/);
  assert.match(message.html, /name="viewport"/);
  assert.match(message.html, /&lt;Pessoa &amp; Companhia&gt;/);
  assert.match(message.html, /004207/);
  assert.doesNotMatch(message.html, /<script|<img/i);
  assert.throws(() => buildVerificationMessage({ email: 'person@example.com', name: 'Pessoa', code: '4207' }));
});

test('new-device alert is branded, escapes HTML, and contains no credential fields', () => {
  const message = buildNewAccessMessage({
    email: 'person@example.com', name: '<Pessoa & Companhia>', deviceType: 'Computador',
    browser: 'Google Chrome', operatingSystem: 'Windows',
    approximateLocation: 'Localização não identificada', accessedAt: '2026-11-13T12:00:00.000Z',
  });
  assert.equal(message.to, 'person@example.com');
  assert.equal(message.subject, 'Novo acesso detectado — Arboris.X');
  assert.match(message.text, /Localização não identificada/);
  assert.match(message.html, /&lt;Pessoa &amp; Companhia&gt;/);
  assert.match(message.html, /Google Chrome/);
  assert.doesNotMatch(message.html, /<script|idToken|password|\btoken\b/i);
  assert.doesNotMatch(message.text, /idToken|password|\btoken\b/i);
});
