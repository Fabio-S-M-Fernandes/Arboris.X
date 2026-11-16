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

  await assert.rejects(provider.send(message), (error) => error.code === 'GMAIL_DELIVERY_FAILED');
  assert.equal(smtpCalled, false);
});

test('Gmail API provider rejects a From address different from the authorized sender', () => {
  assert.throws(() => createEmailProvider({
    provider: 'gmail-api', emailFrom: 'Arboris.X <other@gmail.com>', gmailClientId: 'client',
    gmailClientSecret: 'secret', gmailRefreshToken: 'refresh', gmailSenderEmail: 'sender@example.test',
  }), /EMAIL_FROM precisa corresponder/);
});
