const crypto = require('node:crypto');
const { OAuth2Client } = require('google-auth-library');
const { GOOGLE_CLIENT_ID } = require('../config');
const HttpError = require('../utils/httpError');

const NONCE_TTL_MS = 5 * 60 * 1000;
const nonces = new Map();
let verifier;

const cleanup = () => {
  const now = Date.now();
  for (const [nonce, entry] of nonces) if (entry.expiresAt <= now) nonces.delete(nonce);
};

const issueNonce = (ipAddress) => {
  if (!GOOGLE_CLIENT_ID) throw new HttpError(503, 'O Login com Google ainda não está configurado.', undefined, 'GOOGLE_UNAVAILABLE');
  cleanup();
  if (nonces.size >= 5000) nonces.delete(nonces.keys().next().value);
  const nonce = crypto.randomBytes(32).toString('base64url');
  nonces.set(nonce, { ipAddress, expiresAt: Date.now() + NONCE_TTL_MS });
  return { nonce, expiresAt: Date.now() + NONCE_TTL_MS };
};

const validateCredential = async ({ idToken, nonce }, ipAddress) => {
  if (!GOOGLE_CLIENT_ID) throw new HttpError(503, 'O Login com Google ainda não está configurado.', undefined, 'GOOGLE_UNAVAILABLE');
  if (typeof idToken !== 'string' || idToken.length > 8192 || typeof nonce !== 'string' || nonce.length > 128) {
    throw new HttpError(422, 'Não foi possível validar a conta Google.', undefined, 'GOOGLE_INVALID');
  }
  cleanup();
  const issued = nonces.get(nonce);
  if (!issued || issued.expiresAt <= Date.now() || issued.ipAddress !== ipAddress) {
    throw new HttpError(401, 'A tentativa do Google expirou. Tente novamente.', undefined, 'GOOGLE_NONCE_INVALID');
  }
  try {
    verifier ||= new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await verifier.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload || typeof payload.sub !== 'string' || !payload.sub || payload.email_verified !== true
      || typeof payload.email !== 'string' || !payload.email.includes('@') || payload.nonce !== nonce
      || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
      throw new Error('Invalid Google identity claims.');
    }
    return {
      sub: payload.sub,
      email: payload.email.trim().toLowerCase(),
      nome: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim().slice(0, 120) : payload.email.split('@')[0],
      consumeNonce: () => nonces.delete(nonce),
    };
  } catch {
    throw new HttpError(401, 'Não foi possível validar a conta Google. Tente novamente.', undefined, 'GOOGLE_INVALID');
  }
};

module.exports = { issueNonce, validateCredential };
