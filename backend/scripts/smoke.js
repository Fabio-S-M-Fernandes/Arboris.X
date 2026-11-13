const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'arboris-x-smoke-'));
process.env.DATA_FILE = path.join(temporaryDirectory, 'db.json');
process.env.OTP_SECRET = crypto.randomBytes(48).toString('hex');
process.env.GOOGLE_CLIENT_ID = 'smoke-client.apps.googleusercontent.com';
const sentEmails = [];
const sentAlerts = [];
let alertDeliveryFails = false;
const emailService = require('../src/services/email.service');
emailService.sendVerificationCode = async (message) => sentEmails.push(message);
emailService.sendNewAccessAlert = async (details) => {
  if (alertDeliveryFails) throw new Error('Mock SMTP failure with no credentials.');
  sentAlerts.push(details);
};
const app = require('../src/app');

const request = (port, method, route, body, token, cookie) => new Promise((resolve, reject) => {
  const http = require('node:http');
  const payload = body ? JSON.stringify(body) : null;
  const req = http.request({
    host: '127.0.0.1',
    port,
    method,
    path: route,
    headers: {
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36',
    },
  }, (res) => {
    let content = '';
    res.on('data', (chunk) => { content += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(content), headers: res.headers }));
  });
  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

(async () => {
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const address = server.address();
    const health = await request(address.port, 'GET', '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');

    const email = `smoke-${Date.now()}@arboris.local`;
    const registration = await request(address.port, 'POST', '/api/auth/register', {
      nome: 'Smoke Test',
      email,
      senha: 'senha-segura',
      termosAceitos: true,
    });
    assert.equal(registration.status, 201);
    assert.ok(registration.body.challengeId);
    assert.equal('token' in registration.body, false);
    assert.match(registration.body.maskedEmail, /^sm\*\*\*@arboris\.local$/);
    assert.equal(sentEmails.at(-1).email, email);
    assert.match(sentEmails.at(-1).code, /^\d{6}$/);
    assert.equal(JSON.stringify(registration.body).includes(sentEmails.at(-1).code), false);
    const registeredUser = JSON.parse(fs.readFileSync(process.env.DATA_FILE, 'utf8')).users[0];
    assert.match(registeredUser.passwordHash, /^\$2[aby]\$12\$/);
    assert.equal(await bcrypt.compare('senha-segura', registeredUser.passwordHash), true);
    assert.equal(JSON.stringify(registration.body).includes(registeredUser.passwordHash), false);
    assert.equal(JSON.stringify(registration.body).includes('senha-segura'), false);

    const beforeConfirmation = await request(address.port, 'GET', '/api/auth/me', null);
    assert.equal(beforeConfirmation.status, 401);

    const code = sentEmails.at(-1).code;
    const wrongCode = String((Number(code) + 1) % 1_000_000).padStart(6, '0');
    const rejectedCode = await request(address.port, 'POST', '/api/auth/verify', {
      challengeId: registration.body.challengeId,
      code: wrongCode,
    });
    assert.equal(rejectedCode.status, 400);

    const confirmed = await request(address.port, 'POST', '/api/auth/verify', {
      challengeId: registration.body.challengeId,
      code,
    });
    assert.equal(confirmed.status, 200);
    assert.ok(confirmed.body.token);
    assert.equal(JSON.stringify(confirmed.body).includes(registeredUser.passwordHash), false);
    assert.match(confirmed.headers['set-cookie'][0], /^arboris_device=.*HttpOnly/);
    assert.match(confirmed.headers['set-cookie'][0], /SameSite=Lax/);
    const deviceCookie = confirmed.headers['set-cookie'][0].split(';')[0];
    const savedUser = JSON.parse(fs.readFileSync(process.env.DATA_FILE, 'utf8')).users[0];
    assert.equal(savedUser.devices.length, 1);
    assert.equal('tokenHash' in savedUser.devices[0], true);
    assert.equal(JSON.stringify(savedUser.devices).includes(deviceCookie.split('=')[1]), false);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(sentAlerts.length, 1);

    const reusedCode = await request(address.port, 'POST', '/api/auth/verify', {
      challengeId: registration.body.challengeId,
      code,
    });
    assert.equal(reusedCode.status, 400);

    const session = await request(address.port, 'GET', '/api/auth/me', null, confirmed.body.token);
    assert.equal(session.status, 200);
    assert.equal(session.body.user.email, email);
    assert.equal(JSON.stringify(session.body).includes(registeredUser.passwordHash), false);

    const login = await request(address.port, 'POST', '/api/auth/login', { email, senha: 'senha-segura' });
    assert.equal(login.status, 200);
    assert.ok(login.body.challengeId);
    assert.equal('token' in login.body, false);
    const loginCode = sentEmails.at(-1).code;
    const loginConfirmation = await request(address.port, 'POST', '/api/auth/verify', {
      challengeId: login.body.challengeId,
      code: loginCode,
    }, undefined, deviceCookie);
    assert.equal(loginConfirmation.status, 200);
    assert.ok(loginConfirmation.body.token);
    assert.equal(loginConfirmation.headers['set-cookie'][0].split(';')[0], deviceCookie);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(sentAlerts.length, 1);

    const newDeviceLogin = await request(address.port, 'POST', '/api/auth/login', { email, senha: 'senha-segura' });
    const newDeviceConfirmation = await request(address.port, 'POST', '/api/auth/verify', {
      challengeId: newDeviceLogin.body.challengeId,
      code: sentEmails.at(-1).code,
    });
    assert.equal(newDeviceConfirmation.status, 200);
    const secondDeviceCookie = newDeviceConfirmation.headers['set-cookie'][0].split(';')[0];
    assert.notEqual(secondDeviceCookie, deviceCookie);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(sentAlerts.length, 2);

    alertDeliveryFails = true;
    const mailFailureLogin = await request(address.port, 'POST', '/api/auth/login', { email, senha: 'senha-segura' });
    const mailFailureConfirmation = await request(address.port, 'POST', '/api/auth/verify', {
      challengeId: mailFailureLogin.body.challengeId,
      code: sentEmails.at(-1).code,
    });
    assert.equal(mailFailureConfirmation.status, 200);
    assert.ok(mailFailureConfirmation.body.token);
    alertDeliveryFails = false;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(sentAlerts.length, 2);

    const logout = await request(address.port, 'POST', '/api/auth/logout', null, loginConfirmation.body.token);
    assert.equal(logout.status, 200);

    const database = JSON.parse(fs.readFileSync(process.env.DATA_FILE, 'utf8'));
    assert.equal(database.users.length, 1);
    assert.equal(database.users[0].email, email);

    const googleNonce = await request(address.port, 'POST', '/api/auth/google/nonce', {});
    assert.equal(googleNonce.status, 200);
    const invalidGoogle = await request(address.port, 'POST', '/api/auth/google', {
      idToken: 'not-a-google-token', nonce: googleNonce.body.nonce,
    });
    assert.equal(invalidGoogle.status, 401);

    const googleIdentityService = require('../src/services/google-identity.service');
    googleIdentityService.validateCredential = async () => ({
      sub: 'smoke-google-sub', email, nome: 'Smoke Test', consumeNonce: () => {},
    });
    const loginNonce = await request(address.port, 'POST', '/api/auth/google/nonce', {});
    const automaticLink = await request(address.port, 'POST', '/api/auth/google', {
      idToken: 'smoke-valid-token', nonce: loginNonce.body.nonce,
    });
    assert.equal(automaticLink.status, 409);
    assert.equal(automaticLink.body.error.code, 'GOOGLE_LINK_REQUIRED');

    const reauthentication = await request(address.port, 'POST', '/api/auth/login', { email, senha: 'senha-segura' });
    assert.equal(reauthentication.status, 200);
    const linkNonce = await request(address.port, 'POST', '/api/auth/google/nonce', {});
    const linked = await request(address.port, 'POST', '/api/auth/verify', {
      challengeId: reauthentication.body.challengeId,
      code: sentEmails.at(-1).code,
      googleCredential: { idToken: 'smoke-valid-token', nonce: linkNonce.body.nonce },
    }, undefined, deviceCookie);
    assert.equal(linked.status, 200);
    const linkedSession = await request(address.port, 'GET', '/api/auth/me', null, linked.body.token);
    assert.equal(linkedSession.body.user.googleLinked, true);
    assert.equal(JSON.stringify(linked.body).includes(registeredUser.passwordHash), false);

    googleIdentityService.validateCredential = async () => ({
      sub: 'smoke-google-only-sub', email: 'google-only@arboris.local', nome: 'Google Only', consumeNonce: () => {},
    });
    const googleOnlyNonce = await request(address.port, 'POST', '/api/auth/google/nonce', {});
    const googleOnlyLogin = await request(address.port, 'POST', '/api/auth/google', {
      idToken: 'smoke-google-only-token', nonce: googleOnlyNonce.body.nonce, termsAccepted: true,
    });
    assert.equal(googleOnlyLogin.status, 200);
    assert.equal('token' in googleOnlyLogin.body, false);
    const googleOnlyCode = sentEmails.at(-1).code;
    const googleOnlyConfirmed = await request(address.port, 'POST', '/api/auth/verify', {
      challengeId: googleOnlyLogin.body.challengeId, code: googleOnlyCode,
    });
    assert.equal(googleOnlyConfirmed.status, 200);
    const googleOnlyUser = JSON.parse(fs.readFileSync(process.env.DATA_FILE, 'utf8')).users
      .find((user) => user.email === 'google-only@arboris.local');
    assert.ok(googleOnlyUser);
    assert.equal('passwordHash' in googleOnlyUser, false);
    assert.equal(JSON.stringify(googleOnlyConfirmed.body).includes('passwordHash'), false);

    console.log('Smoke test aprovado: OTP no cadastro e login, sessão só após confirmação, código de uso único, logout e rejeição de token Google inválido.');
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
