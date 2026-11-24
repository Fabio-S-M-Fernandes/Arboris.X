const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'public-test-key';

const supabase = require('@supabase/supabase-js');
const user = { id: 'e9b65593-8a85-44b5-a7a7-742f9e3cf74f' };
let authResult = { data: { claims: {} }, error: null };
let claimsCalls = 0;
const originalCreateClient = supabase.createClient;
supabase.createClient = () => ({ auth: { getClaims: async () => { claimsCalls += 1; return authResult; } } });
const { verifyAccessToken } = require('../src/services/supabase.service');
supabase.createClient = originalCreateClient;

const claims = (changes = {}) => ({
  sub: user.id,
  iss: 'https://project.supabase.co/auth/v1',
  aud: 'authenticated',
  role: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 600,
  session_id: '9ad4049a-6918-4e60-b55a-ebc9c6072fd7',
  ...changes,
});
const token = (payload, alg = 'ES256') => `${Buffer.from(JSON.stringify({ alg, kid: 'test-key' })).toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

test('accepts only matching unexpired claims returned by Supabase verification', async () => {
  const verifyClaims = async (payload) => {
    authResult = { data: { claims: payload }, error: null };
    return verifyAccessToken(token(payload));
  };
  assert.equal((await verifyClaims(claims()))?.user.id, user.id);
  assert.equal(await verifyClaims(claims({ exp: Math.floor(Date.now() / 1000) - 1 })), null);
  assert.equal(await verifyClaims(claims({ sub: 'not-a-uuid' })), null);
  assert.equal(await verifyClaims(claims({ session_id: 'invalid' })), null);
  assert.equal(await verifyClaims(claims({ iss: 'https://other.example/auth/v1' })), null);
  assert.equal(await verifyClaims(claims({ role: 'anon' })), null);
  authResult = { data: { claims: null }, error: Object.assign(new Error('invalid token'), { status: 401 }) };
  assert.equal(await verifyAccessToken(token(claims())), null);
});

test('preserves temporary Supabase outages as service unavailable', async () => {
  for (const status of [undefined, 503]) {
    authResult = {
      data: { claims: null },
      error: Object.assign(new Error('private upstream details'), status ? { status } : {}),
    };
    await assert.rejects(verifyAccessToken(token(claims())), {
      status: 503,
      code: 'SUPABASE_AUTH_UNAVAILABLE',
      message: 'A verificação de identidade está temporariamente indisponível.',
    });
  }

  authResult = Promise.reject(new Error('private network details'));
  await assert.rejects(verifyAccessToken(token(claims())), {
    status: 503,
    code: 'SUPABASE_AUTH_UNAVAILABLE',
  });
});

test('preserves Supabase 429 and verifies claims locally from cached symmetric-token verification', async () => {
  authResult = { data: { claims: null }, error: Object.assign(new Error('limited'), { status: 429, retryAfterSeconds: 23 }) };
  await assert.rejects(verifyAccessToken(token(claims())), {
    status: 429,
    code: 'SUPABASE_RATE_LIMITED',
    retryAfterSeconds: 23,
  });

  const symmetricToken = token(claims(), 'HS256');
  authResult = { data: { claims: claims() }, error: null };
  const before = claimsCalls;
  assert.equal((await verifyAccessToken(symmetricToken)).user.id, user.id);
  assert.equal((await verifyAccessToken(symmetricToken)).user.id, user.id);
  assert.equal(claimsCalls, before + 1);
});
