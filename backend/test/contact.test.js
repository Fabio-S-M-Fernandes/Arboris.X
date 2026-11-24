const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_STORAGE = 'memory';
process.env.EMAIL_PROVIDER = 'gmail-api';
process.env.EMAIL_FROM = 'Arboris.X <sender@example.test>';
process.env.GMAIL_CLIENT_ID = 'client-for-test';
process.env.GMAIL_CLIENT_SECRET = 'secret-for-test';
process.env.GMAIL_REFRESH_TOKEN = 'refresh-for-test';
process.env.GMAIL_SENDER_EMAIL = 'sender@example.test';

let accept = true;
const sent = [];
const providerModule = require('../src/services/email-provider.service');
providerModule.createEmailProvider = () => ({
  send: async (message) => { sent.push(message); return accept ? { id: 'accepted-by-provider' } : {}; },
});
const HttpError = require('../src/utils/httpError');
const sessionMiddleware = require('../src/middleware/supabaseSession');
sessionMiddleware.requireSupabaseIdentity = (request, _response, next) => {
  const match = /^Bearer ([\w-]+)$/.exec(request.get('Authorization') || '');
  if (!match) return next(new HttpError(401, 'Sessão inválida.'));
  request.supabaseUser = { id: match[1], email: 'authorized@example.test',
    ...(match[1] === 'unconfirmed' ? {} : { email_confirmed_at: new Date().toISOString() }) };
  request.supabaseSession = { sessionId: 'session-for-test' };
  next();
};
sessionMiddleware.requireAuthorizedSupabaseSession = (request, _response, next) => {
  if (request.supabaseUser.id === 'denied') return next(new HttpError(403, 'Confirme o acesso.'));
  next();
};
const { buildContactMessage } = require('../src/services/email.service');
const consentService = require('../src/services/account-consent.service');
const app = require('../src/app');
const fields = {
  name: 'Pessoa Teste', email: 'resposta@example.test', subject: 'Uma sugestão',
  category: 'Sugestões', message: 'Gostaria de compartilhar uma ideia para o projeto.',
};

test('contact message validates input and fixes recipient and verified Reply-To', () => {
  const message = buildContactMessage(fields, 'authorized@example.test', new Date('2026-11-21T12:00:00Z'));
  assert.equal(message.to, 'arborisx@gmail.com');
  assert.equal(message.replyTo, 'authorized@example.test');
  assert.equal(message.from, process.env.EMAIL_FROM);
  assert.match(message.subject, /Sugestões — Uma sugestão/);
  assert.match(message.text, /E-mail para resposta: resposta@example.test/);
  assert.match(message.text, /2026-11-21T12:00:00.000Z/);
  assert.match(message.html, /CENTRAL DE CONTATO/);
  assert.match(message.html, /Nova mensagem recebida/);
  assert.match(message.html, /resposta@example\.test/);
  assert.throws(() => buildContactMessage({ ...fields, subject: 'Assunto\r\nBcc: other@example.test' }, 'authorized@example.test'), { status: 400 });
  assert.throws(() => buildContactMessage({ ...fields, category: 'Qualquer outra' }, 'authorized@example.test'), { status: 400 });
  assert.throws(() => buildContactMessage({ ...fields, email: 'inválido' }, 'authorized@example.test'), { status: 400 });
});

test('contact route requires authorized session, accepts provider confirmation, fails closed and limits sends', async () => {
  const requireAccepted = consentService.requireAccepted;
  consentService.requireAccepted = async () => {};
  const server = await new Promise((resolve) => { const started = app.listen(0, '127.0.0.1', () => resolve(started)); });
  const url = `http://127.0.0.1:${server.address().port}/api/session/contact`;
  const post = async (token, body = fields) => {
    const response = await fetch(url, { method: 'POST', headers: {
      'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  try {
    assert.equal((await post(null)).status, 401);
    assert.equal((await post('denied')).status, 403);
    assert.equal((await post('unconfirmed')).status, 403);
    assert.equal(sent.length, 0);
    assert.equal((await post('invalid-input', { ...fields, subject: 'X' })).status, 400);
    assert.equal(sent.length, 0);
    accept = false;
    assert.equal((await post('provider-failure')).status, 503);
    accept = true;
    for (let index = 0; index < 5; index += 1) {
      const result = await post('rate-limited');
      assert.equal(result.status, 202);
      assert.equal(result.body.message, 'Mensagem enviada com sucesso.');
    }
    assert.equal((await post('rate-limited')).status, 429);
    assert.equal(sent.length, 6);
    assert.equal(sent.at(-1).to, 'arborisx@gmail.com');
  } finally {
    consentService.requireAccepted = requireAccepted;
    await new Promise((resolve) => server.close(resolve));
  }
});
