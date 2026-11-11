const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'arboris-x-smoke-'));
process.env.DATA_FILE = path.join(temporaryDirectory, 'db.json');
const app = require('../src/app');

const request = (port, method, route, body, token) => new Promise((resolve, reject) => {
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
    },
  }, (res) => {
    let content = '';
    res.on('data', (chunk) => { content += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(content) }));
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
    assert.ok(registration.body.token);

    const session = await request(address.port, 'GET', '/api/auth/me', null, registration.body.token);
    assert.equal(session.status, 200);
    assert.equal(session.body.user.email, email);

    const login = await request(address.port, 'POST', '/api/auth/login', { email, senha: 'senha-segura' });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);

    const logout = await request(address.port, 'POST', '/api/auth/logout', null, login.body.token);
    assert.equal(logout.status, 200);

    const database = JSON.parse(fs.readFileSync(process.env.DATA_FILE, 'utf8'));
    assert.equal(database.users.length, 1);
    assert.equal(database.users[0].email, email);

    console.log('Smoke test aprovado: health, cadastro, login, JWT, sessão e logout.');
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
