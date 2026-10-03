const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'arboris-x-smoke-'));
process.env.DATA_FILE = path.join(temporaryDirectory, 'db.json');
const app = require('../src/app');

const request = (server, method, path, body, token) => new Promise((resolve, reject) => {
  const http = require('node:http');
  const payload = body ? JSON.stringify(body) : null;
  const req = http.request({ host: '127.0.0.1', port: server.port, method, path, headers: { ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } }, (res) => {
    let content = '';
    res.on('data', (chunk) => { content += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(content) }));
  });
  req.on('error', reject);
  if (payload) req.write(payload);
  req.end();
});

(async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    const health = await request(address, 'GET', '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.body.status, 'ok');

    const summary = await request(address, 'GET', '/api/dashboard/resumo');
    assert.equal(summary.status, 200);
    assert.equal(summary.body.sensoresAtivos, 42);

    const email = `smoke-${Date.now()}@arboris.local`;
    const registration = await request(address, 'POST', '/api/auth/register', { nome: 'Smoke Test', email, senha: 'senha-segura', termosAceitos: true });
    assert.equal(registration.status, 201);
    assert.ok(registration.body.token);

    const session = await request(address, 'GET', '/api/auth/me', null, registration.body.token);
    assert.equal(session.status, 200);
    assert.equal(session.body.user.email, email);

    const sensors = await request(address, 'GET', '/api/dashboard/sensores');
    assert.equal(sensors.status, 200);
    assert.ok(sensors.body.meta.total > 0);

    console.log('Smoke test aprovado: health, resumo, autenticação e sensores respondendo corretamente.');
  } finally {
    server.close();
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
