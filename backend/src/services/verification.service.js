const crypto = require('node:crypto');
const { OTP_SECRET } = require('../config');
const emailService = require('./email.service');
const HttpError = require('../utils/httpError');

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_INTERVAL_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 5;
const SEND_WINDOW_MS = 15 * 60 * 1000;
const challenges = new Map();
const activeByUser = new Map();
const sendsByUser = new Map();

const maskEmail = (email) => {
  const [local, domain] = String(email).split('@');
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
};

const hashCode = (challengeId, code) => crypto.createHmac('sha256', OTP_SECRET).update(`${challengeId}:${code}`).digest();
const newCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
const newChallengeId = () => crypto.randomBytes(32).toString('base64url');

const cleanup = () => {
  const now = Date.now();
  for (const [id, challenge] of challenges) {
    if (challenge.expiresAt <= now) {
      challenges.delete(id);
      if (activeByUser.get(challenge.userId) === id) activeByUser.delete(challenge.userId);
    }
  }
  for (const [userId, entry] of sendsByUser) if (now - entry.startedAt >= SEND_WINDOW_MS) sendsByUser.delete(userId);
};
const cleanupTimer = setInterval(cleanup, 60_000);
cleanupTimer.unref?.();

const sendCountFor = (userId) => {
  const now = Date.now();
  let entry = sendsByUser.get(userId);
  if (!entry || now - entry.startedAt >= SEND_WINDOW_MS) {
    entry = { startedAt: now, count: 0 };
    sendsByUser.set(userId, entry);
  }
  if (entry.count >= MAX_SENDS_PER_WINDOW) throw new HttpError(429, 'Limite de envio atingido. Tente novamente mais tarde.', { retryAfterSeconds: Math.ceil((SEND_WINDOW_MS - (now - entry.startedAt)) / 1000) }, 'OTP_SEND_LIMIT');
  entry.count += 1;
};

const describe = (challenge) => ({
  challengeId: challenge.id,
  maskedEmail: maskEmail(challenge.email),
  expiresAt: challenge.expiresAt,
  resendAvailableAt: challenge.sentAt + RESEND_INTERVAL_MS,
});

const sendFor = async (challenge, { resetExpiry = false } = {}) => {
  sendCountFor(challenge.userId);
  const code = newCode();
  challenge.codeHash = hashCode(challenge.id, code);
  challenge.sentAt = Date.now();
  if (resetExpiry) challenge.expiresAt = challenge.sentAt + CODE_TTL_MS;
  try {
    await emailService.sendVerificationCode({ email: challenge.email, name: challenge.name, code });
  } catch (error) {
    challenges.delete(challenge.id);
    if (activeByUser.get(challenge.userId) === challenge.id) activeByUser.delete(challenge.userId);
    throw error;
  }
};

const begin = async (user, { email = user.email, name = user.nome, authMethod = 'password' } = {}) => {
  cleanup();
  const activeId = activeByUser.get(user.id);
  const active = activeId && challenges.get(activeId);
  if (active && active.expiresAt > Date.now()) return describe(active);

  const id = newChallengeId();
  const now = Date.now();
  const challenge = {
    id, userId: user.id, email: String(email).trim().toLowerCase(), name: String(name || user.nome || 'Olá'), authMethod,
    codeHash: Buffer.alloc(32), createdAt: now, sentAt: now, expiresAt: now + CODE_TTL_MS, attempts: 0, resends: 0,
  };
  if (challenges.size >= 10_000) challenges.delete(challenges.keys().next().value);
  challenges.set(id, challenge);
  activeByUser.set(user.id, id);
  try {
    await sendFor(challenge);
  } catch (error) {
    challenges.delete(id);
    if (activeByUser.get(user.id) === id) activeByUser.delete(user.id);
    throw error;
  }
  return describe(challenge);
};

const verify = (challengeId, code, beforeConsume) => {
  cleanup();
  if (typeof challengeId !== 'string' || challengeId.length < 40 || challengeId.length > 64 || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    throw new HttpError(422, 'Informe o código de seis dígitos.', undefined, 'OTP_INVALID_FORMAT');
  }
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.expiresAt <= Date.now()) throw new HttpError(400, 'Código inválido ou expirado. Solicite um novo código.', undefined, 'OTP_INVALID');
  const candidate = hashCode(challengeId, code);
  if (!crypto.timingSafeEqual(candidate, challenge.codeHash)) {
    challenge.attempts += 1;
    if (challenge.attempts >= MAX_ATTEMPTS) {
      challenges.delete(challengeId);
      if (activeByUser.get(challenge.userId) === challengeId) activeByUser.delete(challenge.userId);
      throw new HttpError(429, 'Limite de tentativas atingido. Inicie o acesso novamente.', undefined, 'OTP_ATTEMPTS_EXHAUSTED');
    }
    throw new HttpError(400, 'Código incorreto. Confira os dígitos e tente novamente.', { remainingAttempts: MAX_ATTEMPTS - challenge.attempts }, 'OTP_INCORRECT');
  }
  beforeConsume?.({ userId: challenge.userId, authMethod: challenge.authMethod });
  challenges.delete(challengeId);
  if (activeByUser.get(challenge.userId) === challengeId) activeByUser.delete(challenge.userId);
  return { userId: challenge.userId, authMethod: challenge.authMethod };
};

const resend = async (challengeId) => {
  cleanup();
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.expiresAt <= Date.now()) throw new HttpError(400, 'Código inválido ou expirado. Inicie o acesso novamente.', undefined, 'OTP_INVALID');
  const retryAfterSeconds = Math.ceil((challenge.sentAt + RESEND_INTERVAL_MS - Date.now()) / 1000);
  if (retryAfterSeconds > 0) throw new HttpError(429, 'Aguarde antes de solicitar outro código.', { retryAfterSeconds }, 'OTP_RESEND_WAIT');
  if (challenge.resends >= 4) throw new HttpError(429, 'Limite de reenvios atingido. Inicie o acesso novamente.', undefined, 'OTP_RESEND_LIMIT');
  challenge.resends += 1;
  await sendFor(challenge, { resetExpiry: true });
  return describe(challenge);
};

const cancel = (challengeId) => {
  const challenge = challenges.get(challengeId);
  if (challenge) {
    challenges.delete(challengeId);
    if (activeByUser.get(challenge.userId) === challengeId) activeByUser.delete(challenge.userId);
  }
};

module.exports = { begin, cancel, cleanup, resend, verify };
