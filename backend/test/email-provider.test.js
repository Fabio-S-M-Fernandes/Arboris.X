const test = require('node:test');
const assert = require('node:assert/strict');
const { createEmailProvider } = require('../src/services/email-provider.service');

const message = {
  from: 'Arboris.X <sender@example.test>',
  to: 'person@example.com',
  subject: 'Confirme seu acesso.',
  text: 'Olá, pessoa.',
  html: '<p>Olá, pessoa.</p>',
};

test('local Gmail SMTP requires STARTTLS, valid certificates, and sends through nodemailer', async () => {
  let transportOptions;
  let sentMessage;
  const provider = createEmailProvider({
    provider: 'smtp', emailFrom: message.from, smtpHost: 'smtp.gmail.com', smtpPort: 587,
    smtpSecure: false, smtpUser: 'sender@example.test', smtpPassword: 'test-only',
  }, {
    smtpTransportFactory(options) {
      transportOptions = options;
      return { async sendMail(value) { sentMessage = value; return { messageId: 'mock-id' }; } };
    },
  });

  await provider.send(message);

  assert.equal(transportOptions.host, 'smtp.gmail.com');
  assert.equal(transportOptions.port, 587);
  assert.equal(transportOptions.secure, false);
  assert.equal(transportOptions.requireTLS, true);
  assert.deepEqual(transportOptions.tls, { rejectUnauthorized: true, minVersion: 'TLSv1.2' });
  assert.equal(transportOptions.auth.pass, 'test-only');
  assert.equal(sentMessage, message);
});

test('Gmail API provider fails closed without silently switching providers', async () => {
  let smtpCalled = false;
  const provider = createEmailProvider({
    provider: 'gmail-api', emailFrom: message.from, gmailClientId: 'client',
    gmailClientSecret: 'secret', gmailRefreshToken: 'refresh', gmailSenderEmail: 'sender@example.test',
  }, {
    smtpTransportFactory() { smtpCalled = true; throw new Error('must not be used'); },
    async fetchImpl(url) {
      if (String(url).includes('/token')) return new Response('{"access_token":"test-access"}', { status: 200 });
      return new Response('{"error":{"message":"mock failure"}}', { status: 503 });
    },
  });

  await assert.rejects(provider.send(message), (error) => error.code === 'GMAIL_API_UNAVAILABLE');
  assert.equal(smtpCalled, false);
});

test('five concurrent Gmail sends share one OAuth refresh and keep five separate messages', async () => {
  let refreshes = 0;
  const recipients = [];
  const provider = createEmailProvider({
    provider: 'gmail-api', emailFrom: message.from, gmailClientId: 'client',
    gmailClientSecret: 'secret', gmailRefreshToken: 'refresh', gmailSenderEmail: 'sender@example.test',
  }, {
    async fetchImpl(url, options) {
      if (String(url).includes('/token')) {
        refreshes += 1;
        await new Promise((resolve) => setTimeout(resolve, 15));
        return new Response(JSON.stringify({ access_token: 'test-access', expires_in: 3600 }), { status: 200 });
      }
      recipients.push(Buffer.from(JSON.parse(options.body).raw, 'base64url').toString('utf8'));
      return new Response(JSON.stringify({ id: `mock-${recipients.length}` }), { status: 200 });
    },
  });
  await Promise.all(Array.from({ length: 5 }, (_, index) =>
    provider.send({ ...message, to: `person${index}@example.test` })));
  assert.equal(refreshes, 1);
  assert.equal(recipients.length, 5);
  for (let index = 0; index < 5; index += 1) {
    assert.ok(recipients.some((raw) => raw.includes(`person${index}@example.test`)));
  }
  await provider.send({ ...message, to: 'later@example.test' });
  assert.equal(refreshes, 1);
});

test('a rejected Gmail access token is discarded before the next send', async () => {
  let refreshes = 0;
  const provider = createEmailProvider({
    provider: 'gmail-api', emailFrom: message.from, gmailClientId: 'client',
    gmailClientSecret: 'secret', gmailRefreshToken: 'refresh', gmailSenderEmail: 'sender@example.test',
  }, {
    async fetchImpl(url) {
      if (String(url).includes('/token')) {
        refreshes += 1;
        return new Response(JSON.stringify({ access_token: `token-${refreshes}`, expires_in: 3600 }), { status: 200 });
      }
      if (refreshes === 1) return new Response(JSON.stringify({ error: { status: 'UNAUTHENTICATED' } }), { status: 401 });
      return new Response(JSON.stringify({ id: 'mock-sent' }), { status: 200 });
    },
  });
  await assert.rejects(provider.send(message), (error) => error.code === 'GMAIL_AUTHORIZATION_FAILED');
  await provider.send(message);
  assert.equal(refreshes, 2);
});

test('Gmail API keeps a safe diagnosis for a missing send scope', async () => {
  const provider = createEmailProvider({
    provider: 'gmail-api', emailFrom: message.from, gmailClientId: 'client',
    gmailClientSecret: 'secret', gmailRefreshToken: 'refresh', gmailSenderEmail: 'sender@example.test',
  }, {
    async fetchImpl(url) {
      if (String(url).includes('/token')) return new Response('{"access_token":"test-access"}', { status: 200 });
      return new Response(JSON.stringify({ error: {
        status: 'PERMISSION_DENIED', message: 'Request had insufficient authentication scopes. refresh-secret-value',
        errors: [{ reason: 'insufficientPermissions' }],
      } }), { status: 403 });
    },
  });

  await assert.rejects(provider.send(message), (error) => {
    assert.deepEqual(error.gmailDiagnostic, {
      code: 'GMAIL_INSUFFICIENT_SCOPE', category: 'authorization',
      message: 'A autorização OAuth não inclui o escopo Gmail gmail.send.',
    });
    assert.equal(error.message.includes('refresh-secret-value'), false);
    return true;
  });
});

test('Gmail OAuth invalid_grant is categorized without logging its raw description', async () => {
  const provider = createEmailProvider({
    provider: 'gmail-api', emailFrom: message.from, gmailClientId: 'client',
    gmailClientSecret: 'secret', gmailRefreshToken: 'refresh', gmailSenderEmail: 'sender@example.test',
  }, {
    async fetchImpl() {
      return new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'refresh-secret-value was revoked' }), { status: 400 });
    },
  });

  await assert.rejects(provider.send(message), (error) => {
    assert.deepEqual(error.gmailDiagnostic, {
      code: 'GMAIL_INVALID_GRANT', category: 'authorization',
      message: 'O Google recusou o refresh token; confira se ele corresponde ao client OAuth configurado e continua válido.',
    });
    assert.equal(error.message.includes('refresh-secret-value'), false);
    return true;
  });
});

test('Gmail refresh response without gmail.send scope fails before sending', async () => {
  let requestCount = 0;
  const provider = createEmailProvider({
    provider: 'gmail-api', emailFrom: message.from, gmailClientId: 'client',
    gmailClientSecret: 'secret', gmailRefreshToken: 'refresh', gmailSenderEmail: 'sender@example.test',
  }, {
    async fetchImpl() {
      requestCount += 1;
      return new Response(JSON.stringify({ access_token: 'test-access', scope: 'https://www.googleapis.com/auth/gmail.readonly' }), { status: 200 });
    },
  });

  await assert.rejects(provider.send(message), (error) => error.code === 'GMAIL_INSUFFICIENT_SCOPE');
  assert.equal(requestCount, 1);
});

test('Gmail identifies a sender rejected by the authenticated mailbox', async () => {
  const provider = createEmailProvider({
    provider: 'gmail-api', emailFrom: message.from, gmailClientId: 'client',
    gmailClientSecret: 'secret', gmailRefreshToken: 'refresh', gmailSenderEmail: 'sender@example.test',
  }, {
    async fetchImpl(url) {
      if (String(url).includes('/token')) return new Response('{"access_token":"test-access"}', { status: 200 });
      return new Response(JSON.stringify({ error: {
        message: 'Invalid From header: sender is not an authorized alias.',
        errors: [{ reason: 'invalidArgument' }],
      } }), { status: 400 });
    },
  });

  await assert.rejects(provider.send(message), (error) => {
    assert.deepEqual(error.gmailDiagnostic, {
      code: 'GMAIL_SENDER_REJECTED', category: 'sender',
      message: 'O Gmail rejeitou o remetente; ele precisa estar autorizado na conta autenticada.',
    });
    return true;
  });
});

test('Gmail API provider rejects a From address different from the authorized sender', () => {
  assert.throws(() => createEmailProvider({
    provider: 'gmail-api', emailFrom: 'Arboris.X <other@gmail.com>', gmailClientId: 'client',
    gmailClientSecret: 'secret', gmailRefreshToken: 'refresh', gmailSenderEmail: 'sender@example.test',
  }), /EMAIL_FROM precisa corresponder/);
});
