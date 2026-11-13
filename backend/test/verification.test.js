const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

process.env.OTP_SECRET = crypto.randomBytes(48).toString('hex');
const emailService = require('../src/services/email.service');
const sentCodes = [];
emailService.sendVerificationCode = async (message) => sentCodes.push(message);
const verificationService = require('../src/services/verification.service');
const account = () => ({ id: crypto.randomUUID(), nome: 'Teste', email: `${crypto.randomUUID()}@example.com` });

test('challenge is masked, OTP is six digits, and a valid code can be consumed once', async () => {
  const user = account();
  const challenge = await verificationService.begin(user);
  const code = sentCodes.at(-1).code;
  assert.match(code, /^\d{6}$/);
  assert.equal(challenge.maskedEmail, `${user.email.slice(0, 2)}***@example.com`);
  assert.equal('code' in challenge, false);
  assert.deepEqual(verificationService.verify(challenge.challengeId, code), { userId: user.id, authMethod: 'password' });
  assert.throws(() => verificationService.verify(challenge.challengeId, code), { code: 'OTP_INVALID' });
});

test('resend invalidates the previous code without restoring attempts', async (context) => {
  let now = Date.now();
  context.mock.method(Date, 'now', () => now);
  const user = account();
  const challenge = await verificationService.begin(user);
  const oldCode = sentCodes.at(-1).code;
  const wrong = String((Number(oldCode) + 1) % 1_000_000).padStart(6, '0');
  assert.throws(() => verificationService.verify(challenge.challengeId, wrong), { code: 'OTP_INCORRECT' });
  now += 60_001;
  const resent = await verificationService.resend(challenge.challengeId);
  const newCode = sentCodes.at(-1).code;
  assert.notEqual(newCode, oldCode);
  assert.throws(() => verificationService.verify(challenge.challengeId, oldCode), { code: 'OTP_INCORRECT' });
  assert.equal(verificationService.verify(resent.challengeId, newCode).userId, user.id);
});

test('the fifth incorrect code attempt invalidates the challenge', async () => {
  const user = account();
  const challenge = await verificationService.begin(user);
  const issuedCode = sentCodes.at(-1).code;
  const wrong = String((Number(issuedCode) + 1) % 1_000_000).padStart(6, '0');
  for (let attempt = 1; attempt < 5; attempt += 1) {
    assert.throws(() => verificationService.verify(challenge.challengeId, wrong), { code: 'OTP_INCORRECT' });
  }
  assert.throws(() => verificationService.verify(challenge.challengeId, wrong), { code: 'OTP_ATTEMPTS_EXHAUSTED' });
  assert.throws(() => verificationService.verify(challenge.challengeId, issuedCode), { code: 'OTP_INVALID' });
});

test('expired challenge is removed and cannot be confirmed', async (context) => {
  let now = Date.now();
  context.mock.method(Date, 'now', () => now);
  const challenge = await verificationService.begin(account());
  now = challenge.expiresAt + 1;
  verificationService.cleanup();
  assert.throws(() => verificationService.verify(challenge.challengeId, '000000'), { code: 'OTP_INVALID' });
});
