const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../src/store/postgres');

const calls = [];
let pending = true;
let accepted = false;
let optionalCookiesAccepted = false;
let authorized = false;
let deleted = false;
const query = async (source, values) => {
  const sql = source.replace(/\s+/g, ' ').trim().toLowerCase();
  calls.push({ sql, values });
  if (sql.startsWith('select accepted_at')) return { rows: pending ? [{ accepted_at: accepted ? new Date() : null, optional_cookies_accepted: optionalCookiesAccepted }] : [], rowCount: pending ? 1 : 0 };
  if (sql.startsWith('select 1 from public.authorized_sessions')) return { rows: authorized ? [{}] : [], rowCount: authorized ? 1 : 0 };
  if (sql.startsWith('update public.account_consent set optional_cookies_accepted')) {
    if (!pending || !accepted) return { rows: [], rowCount: 0 };
    optionalCookiesAccepted = values[1];
    return { rows: [{ optional_cookies_accepted: optionalCookiesAccepted }], rowCount: 1 };
  }
  if (sql.startsWith('update public.account_consent')) { accepted = true; return { rowCount: 1 }; }
  if (sql.startsWith('delete from auth.users')) { deleted = true; pending = false; return { rowCount: 1 }; }
  return { rows: [], rowCount: 1 };
};
store.getPool = () => ({ query, connect: async () => ({ query, release() {} }) });
const consent = require('../src/services/account-consent.service');

test('new accounts remain blocked until both mandatory documents are accepted', async () => {
  pending = true; accepted = false; calls.length = 0;
  assert.deepEqual(await consent.status('user-id'), { required: true, optionalCookiesAccepted: false, canManageOptionalCookies: false });
  await assert.rejects(consent.requireAccepted('user-id'), { code: 'TERMS_REQUIRED' });
  await consent.accept('user-id', false);
  assert.equal((await consent.status('user-id')).required, false);
  assert.ok(calls.some(({ sql, values }) => sql.startsWith('insert into public.terms_acceptances')
    && values[1] === '2026-11-22' && values[2] === '2026-11-22'));
});

test('older accounts without a consent row do not receive optional cookies automatically', async () => {
  pending = false; accepted = false;
  assert.deepEqual(await consent.status('existing-user'), { required: false, optionalCookiesAccepted: false, canManageOptionalCookies: false });
});

test('accepted accounts can change only their optional cookie preference', async () => {
  pending = true; accepted = true; optionalCookiesAccepted = false;
  assert.deepEqual(await consent.updateOptionalCookies('user-id', true), { optionalCookiesAccepted: true });
  assert.equal((await consent.status('user-id')).optionalCookiesAccepted, true);
  assert.deepEqual(await consent.updateOptionalCookies('user-id', false), { optionalCookiesAccepted: false });
  pending = false;
  await assert.rejects(consent.updateOptionalCookies('older-user', true), { code: 'CONSENT_NOT_AVAILABLE' });
});

test('declining removes only an unaccepted, unauthorized account', async () => {
  pending = true; accepted = false; authorized = false; deleted = false;
  await consent.decline('new-user');
  assert.equal(deleted, true);
  pending = true; accepted = true; deleted = false;
  await assert.rejects(consent.decline('accepted-user'), { code: 'CONSENT_NOT_PENDING' });
  assert.equal(deleted, false);
  accepted = false; authorized = true;
  await assert.rejects(consent.decline('authorized-user'), { code: 'ACCOUNT_ALREADY_AUTHORIZED' });
  assert.equal(deleted, false);
});
