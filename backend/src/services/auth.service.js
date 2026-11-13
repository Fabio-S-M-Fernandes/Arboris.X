const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_EXPIRES_IN, JWT_SECRET } = require('../config');
const userRepository = require('../repositories/user.repository');
const HttpError = require('../utils/httpError');
const { validateCredentials } = require('../validators/auth.validator');
const verificationService = require('./verification.service');
const googleIdentityService = require('./google-identity.service');
const deviceService = require('./device.service');

const publicUser = (user) => ({ id: user.id, nome: user.nome, email: user.email, criadoEm: user.criadoEm, googleLinked: Boolean(user.googleSub) });
const createAccessToken = (user, authMethod) => jwt.sign({
  sub: user.id,
  amr: authMethod === 'google' ? ['google', 'otp'] : ['pwd', 'otp'],
}, JWT_SECRET, { algorithm: 'HS256', jwtid: crypto.randomUUID(), expiresIn: JWT_EXPIRES_IN });

const unavailableAccount = () => new HttpError(409, 'Não foi possível criar a conta com os dados informados.');

const register = async (data) => {
  validateCredentials(data, true);
  const normalizedEmail = String(data.email).trim().toLowerCase();
  if (userRepository.findByEmail(normalizedEmail)) throw unavailableAccount();
  const passwordHash = await bcrypt.hash(data.senha, 12);
  const user = userRepository.createIfUnique({
    id: crypto.randomUUID(), nome: String(data.nome).trim(), email: normalizedEmail,
    passwordHash, criadoEm: new Date().toISOString(),
  });
  if (!user) throw unavailableAccount();
  try {
    return { ...(await verificationService.begin(user, { authMethod: 'password' })), method: 'password' };
  } catch (error) {
    userRepository.removeIfId(user.id);
    throw error;
  }
};

const login = async (data) => {
  validateCredentials(data, false);
  const user = userRepository.findByEmail(String(data.email).trim().toLowerCase());
  if (typeof user?.passwordHash !== 'string' || !await bcrypt.compare(data.senha, user.passwordHash)) {
    throw new HttpError(401, 'E-mail ou senha inválidos.');
  }
  return { ...(await verificationService.begin(user, { authMethod: 'password' })), method: 'password' };
};

const verifyCode = async (data, request) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(422, 'Informe o código de seis dígitos.');
  let googleIdentity;
  if (data.googleCredential !== undefined) {
    googleIdentity = await googleIdentityService.validateCredential(data.googleCredential, request.ip);
  }
  const { userId, authMethod } = verificationService.verify(data.challengeId, data.code, ({ userId: challengeUserId, authMethod: challengeAuthMethod }) => {
    if (!googleIdentity) return;
    if (challengeAuthMethod !== 'password') {
      googleIdentity.consumeNonce();
      throw new HttpError(409, 'Reautentique a conta com e-mail e senha antes de vincular o Google.', undefined, 'GOOGLE_PASSWORD_REAUTH_REQUIRED');
    }
    const account = userRepository.findById(challengeUserId);
    if (!account?.passwordHash || googleIdentity.email !== account.email.trim().toLowerCase()) {
      googleIdentity.consumeNonce();
      throw new HttpError(409, 'A conta Google precisa corresponder à conta Arboris.X autenticada.', undefined, 'GOOGLE_EMAIL_MISMATCH');
    }
    if (account.googleSub && account.googleSub !== googleIdentity.sub) {
      googleIdentity.consumeNonce();
      throw new HttpError(409, 'Esta conta Arboris.X já está vinculada a outra identidade Google.', undefined, 'GOOGLE_ALREADY_LINKED');
    }
    const linkedAccount = userRepository.findByGoogleSub(googleIdentity.sub);
    if (linkedAccount && linkedAccount.id !== account.id) {
      googleIdentity.consumeNonce();
      throw new HttpError(409, 'Esta identidade Google já está vinculada a outra conta Arboris.X.', undefined, 'GOOGLE_ALREADY_LINKED');
    }
    if (!userRepository.attachGoogleSubIfUnlinked(account.id, googleIdentity.sub)) {
      googleIdentity.consumeNonce();
      throw new HttpError(409, 'Não foi possível vincular esta conta Google.', undefined, 'GOOGLE_LINK_CONFLICT');
    }
    account.googleSub = googleIdentity.sub;
    googleIdentity.consumeNonce();
  });
  const user = userRepository.findById(userId);
  if (!user) throw new HttpError(401, 'Código inválido ou expirado. Inicie o acesso novamente.');
  const device = deviceService.recognize(user, request);
  return { user: publicUser(user), token: createAccessToken(user, authMethod), device };
};

const resendCode = (data) => verificationService.resend(data?.challengeId);
const cancelChallenge = (data) => verificationService.cancel(data?.challengeId);

const googleLogin = async (data, ipAddress) => {
  const identity = await googleIdentityService.validateCredential(data, ipAddress);
  let user = userRepository.findByGoogleSub(identity.sub);
  let isNewUser = false;
  if (!user) {
    const emailAccount = userRepository.findByEmail(identity.email);
    if (emailAccount) {
      throw new HttpError(409, 'Esta conta já existe. Entre com e-mail e senha e confirme o código enviado para vincular o Google.', undefined, 'GOOGLE_LINK_REQUIRED');
    }
    if (data.termsAccepted !== true) {
      throw new HttpError(428, 'Aceite os Termos de Uso e a Política de Privacidade para criar sua conta.', {
        code: 'GOOGLE_TERMS_REQUIRED',
        nome: identity.nome,
        maskedEmail: `${identity.email.slice(0, 2)}***@${identity.email.split('@')[1]}`,
      }, 'GOOGLE_TERMS_REQUIRED');
    }
    user = userRepository.createIfUnique({
      id: crypto.randomUUID(), nome: identity.nome, email: identity.email,
      googleSub: identity.sub, criadoEm: new Date().toISOString(),
    });
    if (!user) {
      user = userRepository.findByGoogleSub(identity.sub);
      if (!user && userRepository.findByEmail(identity.email)) {
        identity.consumeNonce();
        throw new HttpError(409, 'Esta conta já existe. Entre com e-mail e senha e confirme o código enviado para vincular o Google.', undefined, 'GOOGLE_LINK_REQUIRED');
      }
      if (!user) throw unavailableAccount();
    } else isNewUser = true;
  }
  identity.consumeNonce();
  try {
    return {
      ...(await verificationService.begin(user, { email: identity.email, name: identity.nome, authMethod: 'google' })),
      method: 'google', isNewUser,
    };
  } catch (error) {
    if (isNewUser) userRepository.removeIfId(user.id);
    throw error;
  }
};

const linkGoogle = async (user, data, ipAddress, session) => {
  const reauthenticatedRecently = Number.isInteger(session?.authenticatedAt)
    && Date.now() - session.authenticatedAt * 1000 <= 5 * 60 * 1000
    && Date.now() >= session.authenticatedAt * 1000;
  if (!user.passwordHash || !reauthenticatedRecently
    || !session.authenticationMethods?.includes('pwd') || !session.authenticationMethods?.includes('otp')) {
    throw new HttpError(428, 'Entre novamente com e-mail, senha e código de segurança antes de vincular o Google.', undefined, 'GOOGLE_REAUTH_REQUIRED');
  }
  const identity = await googleIdentityService.validateCredential(data, ipAddress);
  if (identity.email !== user.email.trim().toLowerCase()) {
    identity.consumeNonce();
    throw new HttpError(409, 'A conta Google precisa usar o mesmo e-mail da conta Arboris.X.', undefined, 'GOOGLE_EMAIL_MISMATCH');
  }
  if (user.googleSub && user.googleSub !== identity.sub) {
    identity.consumeNonce();
    throw new HttpError(409, 'Esta conta Arboris.X já está vinculada a outra identidade Google.', undefined, 'GOOGLE_ALREADY_LINKED');
  }
  const linkedUser = userRepository.findByGoogleSub(identity.sub);
  if (linkedUser && linkedUser.id !== user.id) {
    identity.consumeNonce();
    throw new HttpError(409, 'Esta identidade Google já está vinculada a outra conta Arboris.X.', undefined, 'GOOGLE_ALREADY_LINKED');
  }
  identity.consumeNonce();
  if (!userRepository.attachGoogleSubIfUnlinked(user.id, identity.sub)) {
    throw new HttpError(409, 'Não foi possível vincular esta conta Google.', undefined, 'GOOGLE_LINK_CONFLICT');
  }
  return { message: 'Conta Google vinculada com sucesso.' };
};

const logout = ({ token, expiresAt }) => require('../store/revokedTokens').revoke(token, expiresAt);

module.exports = {
  cancelChallenge, googleLogin, linkGoogle, login, logout, publicUser, register, resendCode, verifyCode,
};
