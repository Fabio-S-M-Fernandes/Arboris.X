const { createClient } = require('@supabase/supabase-js');
const crypto = require('node:crypto');
const { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } = require('../config');
const fetchWithTimeout = require('../utils/fetchWithTimeout');
const HttpError = require('../utils/httpError');

const SYMMETRIC_CLAIMS_CACHE_MS = 10 * 60 * 1000;
const MAX_CACHED_TOKENS = 4096;
let client;
const symmetricClaimsCache = new Map();
const retryAfterByToken = new Map();

const tokenKey = (token) => crypto.createHash('sha256').update(token).digest('hex');
const decodeTokenHeader = (token) => {
  try { return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')); }
  catch { return null; }
};
const parseRetryAfter = (value) => {
  if (!value) return null;
  if (/^\d{1,5}$/.test(value)) return Math.max(1, Number(value));
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  const seconds = Math.ceil((date - Date.now()) / 1000);
  return seconds > 0 && seconds <= 86_400 ? seconds : null;
};
const getHeader = (headers, name) => {
  if (headers instanceof Headers) return headers.get(name);
  const key = Object.keys(headers || {}).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : null;
};

const supabaseAuthFetch = async (input, init) => {
  const response = await fetchWithTimeout(input, init);
  if (response.status === 429) {
    const requestUrl = typeof input === 'string' ? input : input.url;
    const authorization = getHeader(init?.headers, 'authorization')
      || (typeof Request !== 'undefined' && input instanceof Request ? input.headers.get('authorization') : null);
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization || '');
    let isUserVerification = false;
    try { isUserVerification = new URL(requestUrl).pathname.endsWith('/auth/v1/user'); } catch { /* Ignore malformed URLs. */ }
    const retryAfterSeconds = isUserVerification ? parseRetryAfter(response.headers.get('Retry-After')) : null;
    if (match && retryAfterSeconds) {
      if (retryAfterByToken.size >= MAX_CACHED_TOKENS) retryAfterByToken.delete(retryAfterByToken.keys().next().value);
      retryAfterByToken.set(tokenKey(match[1]), retryAfterSeconds);
    }
  }
  return response;
};

const retryAfterFor = (key) => {
  const seconds = retryAfterByToken.get(key);
  retryAfterByToken.delete(key);
  return seconds;
};

const validateClaims = (claims) => {
  const expectedIssuer = `${SUPABASE_URL.replace(/\/$/, '')}/auth/v1`;
  const audienceValid = claims?.aud === 'authenticated'
    || (Array.isArray(claims?.aud) && claims.aud.includes('authenticated'));
  if (typeof claims?.sub !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(claims.sub)
    || claims.iss !== expectedIssuer || !audienceValid || claims.role !== 'authenticated'
    || !Number.isInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)
    || typeof claims.session_id !== 'string'
    || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(claims.session_id)) return null;
  return claims;
};

const cacheSymmetricClaims = (key, claims) => {
  const expiresAt = Math.min(Date.now() + SYMMETRIC_CLAIMS_CACHE_MS, claims.exp * 1000);
  if (expiresAt <= Date.now()) return;
  if (symmetricClaimsCache.size >= MAX_CACHED_TOKENS) symmetricClaimsCache.delete(symmetricClaimsCache.keys().next().value);
  symmetricClaimsCache.set(key, { claims, expiresAt });
};

const getSupabaseAuthClient = () => {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error('Supabase server authentication is not configured.');
  client ||= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: supabaseAuthFetch },
  });
  return client;
};

const claimsToUser = (claims) => {
  const appMetadata = claims.app_metadata && typeof claims.app_metadata === 'object' ? claims.app_metadata : {};
  const userMetadata = claims.user_metadata && typeof claims.user_metadata === 'object' ? claims.user_metadata : {};
  const providers = Array.isArray(appMetadata.providers) ? appMetadata.providers : [appMetadata.provider].filter(Boolean);
  return {
    id: claims.sub,
    email: claims.email,
    user_metadata: userMetadata,
    app_metadata: appMetadata,
    identities: providers.map((provider) => ({ provider })),
  };
};

const verificationServiceError = (error, key) => {
  const status = Number(error?.status);
  if (status === 429) {
    const limited = new HttpError(429, 'O serviço de identidade limitou temporariamente as verificações.', undefined, 'SUPABASE_RATE_LIMITED');
    const retryAfterSeconds = retryAfterFor(key) || error?.retryAfterSeconds;
    if (Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0) limited.retryAfterSeconds = retryAfterSeconds;
    return limited;
  }
  if (!Number.isInteger(status) || status === 0 || status === 408 || status >= 500) {
    return new HttpError(503, 'A verifica\u00e7\u00e3o de identidade est\u00e1 temporariamente indispon\u00edvel.', undefined, 'SUPABASE_AUTH_UNAVAILABLE');
  }
  retryAfterFor(key);
  return null;
};

const verifyAccessToken = async (accessToken) => {
  const key = tokenKey(accessToken);
  const jwtHeader = decodeTokenHeader(accessToken);
  const symmetric = typeof jwtHeader?.alg === 'string' && jwtHeader.alg.startsWith('HS');
  if (symmetric) {
    const cached = symmetricClaimsCache.get(key);
    if (cached?.expiresAt > Date.now()) {
      const claims = validateClaims(cached.claims);
      if (claims) return { user: claimsToUser(claims), sessionId: claims.session_id, claims };
    }
    symmetricClaimsCache.delete(key);
  }

  let result;
  try {
    result = await getSupabaseAuthClient().auth.getClaims(accessToken);
  } catch (error) {
    const serviceError = verificationServiceError(error, key);
    if (serviceError) throw serviceError;
    return null;
  }

  const { data, error } = result || {};
  if (error) {
    const serviceError = verificationServiceError(error, key);
    if (serviceError) throw serviceError;
    return null;
  }
  const claims = validateClaims(data?.claims);
  if (!claims) return null;
  if (symmetric) cacheSymmetricClaims(key, claims);
  return { user: claimsToUser(claims), sessionId: claims.session_id, claims };
};

module.exports = { verifyAccessToken };
