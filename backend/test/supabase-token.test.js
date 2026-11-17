const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://project.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY = 'public-test-key';

const supabase = require('@supabase/supabase-js');
const user = { id: 'e9b65593-8a85-44b5-a7a7-742f9e3cf74f' };
let authResult = { data: { user }, error: null };
const originalCreateClient = supabase.createClient;
supabase.createClient = () => ({ auth: { getUser: async () => authResult } });
const { verifyAccessToken } = require('../src/services/supabase.service');
supabase.createClient = originalCreateClient;

const claims = (changes = {}) => ({
  sub: user.id,
  iss: 'https://project.supabase.co/auth/v1',
  aud: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 600,
  session_id: '9ad4049a-6918-4e60-b55a-ebc9c6072fd7',
  ...changes,
});
const token = (payload) => `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

test('accepts only a token verified by Supabase with matching unexpired claims', async () => {
  authResult = { data: { user }, error: null };
  assert.equal((await verifyAccessToken(token(claims())))?.user.id, user.id);
  assert.equal(await verifyAccessToken(token(claims({ exp: Math.floor(Date.now() / 1000) - 1 }))), null);
  assert.equal(await verifyAccessToken(token(claims({ sub: '173874fb-1110-4294-a462-0e73553ef7ba' }))), null);
  assert.equal(await verifyAccessToken(token(claims({ session_id: 'invalid' }))), null);
  assert.equal(await verifyAccessToken(token(claims({ iss: 'https://other.example/auth/v1' }))), null);
  authResult = { data: { user: null }, error: new Error('invalid token') };
  assert.equal(await verifyAccessToken(token(claims())), null);
});
