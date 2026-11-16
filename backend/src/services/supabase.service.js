const { createClient } = require('@supabase/supabase-js');
const { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } = require('../config');
const fetchWithTimeout = require('../utils/fetchWithTimeout');

let client;

const getSupabaseAuthClient = () => {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error('Supabase server authentication is not configured.');
  client ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  });
  return client;
};

const verifyAccessToken = async (accessToken) => {
  const { data, error } = await getSupabaseAuthClient().auth.getUser(accessToken);
  if (error || !data.user?.id) return null;

  // The claim is only read after getUser has verified the token with Supabase.
  const claimsSegment = accessToken.split('.')[1];
  if (!claimsSegment) return null;
  let claims;
  try { claims = JSON.parse(Buffer.from(claimsSegment, 'base64url').toString('utf8')); } catch { return null; }
  const expectedIssuer = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;
  if (claims.sub !== data.user.id || claims.iss !== expectedIssuer || claims.aud !== 'authenticated'
    || !Number.isInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)
    || typeof claims.session_id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(claims.session_id)) return null;
  return { user: data.user, sessionId: claims.session_id, claims };
};

module.exports = { verifyAccessToken };
