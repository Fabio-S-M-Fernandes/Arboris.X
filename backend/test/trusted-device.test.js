const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const postgresStore = require('../src/store/postgres');
const devices = [];
const authorizations = new Map();
let nextId = 1;
const query = async (sql, values = []) => {
  const statement = sql.replace(/\s+/g, ' ').trim().toLowerCase();
  if (['begin', 'commit', 'rollback'].includes(statement)
    || statement.startsWith('select pg_advisory_xact_lock')
    || statement.startsWith('update public.login_challenges')
    || statement.startsWith('insert into public.security_events')) return { rows: [], rowCount: 1 };
  if (statement.startsWith('insert into public.known_devices')) {
    devices.push({ id: nextId++, user_id: values[0], device_hash: values[1],
      label: 'Navegador confiável', trusted_at: new Date(), last_seen_at: new Date(),
      expires_at: values[2], revoked_at: null });
    return { rows: [], rowCount: 1 };
  }
  if (statement.startsWith('select id, expires_at from public.known_devices')) {
    const row = devices.find((device) => device.user_id === values[0]
      && device.device_hash.equals(values[1]) && device.trusted_at
      && !device.revoked_at && device.expires_at > new Date());
    return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
  }
  if (statement.startsWith('select revoked_at from public.authorized_sessions')) {
    const state = authorizations.get(`${values[0]}:${values[1]}`);
    return { rows: state ? [{ revoked_at: state === 'revoked' ? new Date() : null }] : [], rowCount: state ? 1 : 0 };
  }
  if (statement.startsWith('select 1 from auth.sessions')) return { rows: [{}], rowCount: 1 };
  if (statement.startsWith('select 1 from public.authorized_sessions')) {
    const allowed = authorizations.get(`${values[0]}:${values[1]}`) === 'authorized';
    return { rows: allowed ? [{}] : [], rowCount: allowed ? 1 : 0 };
  }
  if (statement.startsWith('select count(*)::int as count from public.known_devices')) {
    const count = devices.filter((device) => device.user_id === values[0]
      && device.trusted_at && !device.revoked_at && device.expires_at > new Date()).length;
    return { rows: [{ count }], rowCount: 1 };
  }
  if (statement.startsWith('update public.known_devices set device_hash')) {
    const row = devices.find((device) => device.id === values[0]);
    row.device_hash = values[1];
    row.last_seen_at = new Date();
    return { rows: [], rowCount: 1 };
  }
  if (statement.startsWith('insert into public.authorized_sessions')) {
    authorizations.set(`${values[0]}:${values[1]}`, 'authorized');
    return { rows: [], rowCount: 1 };
  }
  if (statement.startsWith('select id, label, trusted_at')) {
    const rows = devices.filter((device) => device.user_id === values[0] && !device.revoked_at && device.expires_at > new Date());
    return { rows, rowCount: rows.length };
  }
  if (statement.startsWith('update public.known_devices set revoked_at')) {
    const row = devices.find((device) => String(device.id) === String(values[0]) && device.user_id === values[1] && !device.revoked_at);
    if (row) row.revoked_at = new Date();
    return { rows: row ? [{ device_hash: row.device_hash }] : [], rowCount: row ? 1 : 0 };
  }
  throw new Error(`Unexpected query: ${statement}`);
};
postgresStore.getPool = () => ({ query, connect: async () => ({ query, release() {} }) });
const service = require('../src/services/trusted-device.service');

test('trust requires the right user, an unexpired verifier, and rotates on use', async () => {
  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();
  const sessionA = crypto.randomUUID();
  authorizations.set(`${userA}:${sessionA}`, 'authorized');
  const original = await service.register({ userId: userA, sessionId: sessionA });
  assert.notEqual(devices[0].device_hash.toString('hex'), original.token);
  assert.equal(await service.tryAuthorize({ userId: userB, sessionId: crypto.randomUUID(), token: original.token }), null);
  const used = await service.tryAuthorize({ userId: userA, sessionId: sessionA, token: original.token });
  assert.ok(used?.token);
  assert.notEqual(used.token, original.token);
  assert.equal(authorizations.get(`${userA}:${sessionA}`), 'authorized');
  assert.equal(await service.tryAuthorize({ userId: userA, sessionId: crypto.randomUUID(), token: original.token }), null);
  devices[0].expires_at = new Date(Date.now() - 1000);
  assert.equal(await service.tryAuthorize({ userId: userA, sessionId: crypto.randomUUID(), token: used.token }), null);
});

test('revoked session cannot be reauthorized and device revocation is scoped to owner', async () => {
  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();
  const session = crypto.randomUUID();
  authorizations.set(`${userA}:${session}`, 'authorized');
  const trust = await service.register({ userId: userA, sessionId: session });
  const id = devices.at(-1).id;
  authorizations.set(`${userA}:${session}`, 'revoked');
  await assert.rejects(service.tryAuthorize({ userId: userA, sessionId: session, token: trust.token }), { status: 401 });
  await assert.rejects(service.revoke({ userId: userB, deviceId: id, token: trust.token }), { status: 404 });
  assert.equal((await service.list({ userId: userA })).length, 1);
  assert.equal(await service.revoke({ userId: userA, deviceId: id, token: trust.token }), true);
  assert.equal((await service.list({ userId: userA })).length, 0);
  assert.equal(await service.tryAuthorize({ userId: userA, sessionId: crypto.randomUUID(), token: trust.token }), null);
});

test('malformed cookie values never become trusted device tokens', () => {
  assert.equal(service.readToken({ headers: { cookie: '__Host-arboris-trusted=not-a-token' } }), null);
  assert.equal(service.readToken({ headers: { cookie: '' } }), null);
});

test('enrollment requires an authorized active session and caps active devices', async () => {
  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  await assert.rejects(service.register({ userId, sessionId }), { status: 401 });
  authorizations.set(`${userId}:${sessionId}`, 'authorized');
  for (let index = 0; index < 20; index += 1) await service.register({ userId, sessionId });
  await assert.rejects(service.register({ userId, sessionId }), { status: 409, code: 'TRUSTED_DEVICE_LIMIT' });
  assert.equal((await service.list({ userId })).length, 20);
});
