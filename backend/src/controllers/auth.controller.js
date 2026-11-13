const authService = require('../services/auth.service');
const emailService = require('../services/email.service');

const publicUser = authService.publicUser;

const register = async (request, response) => {
  response.status(201).json(await authService.register(request.body || {}));
};

const login = async (request, response) => {
  response.json(await authService.login(request.body || {}));
};

const verifyCode = async (request, response) => {
  const { device, ...session } = await authService.verifyCode(request.body || {}, request);
  if (device?.cookieValue) response.cookie(device.cookieName, device.cookieValue, device.cookieOptions);
  response.json(session);
  if (device?.isNew) {
    void emailService.sendNewAccessAlert({ email: session.user.email, name: session.user.nome, ...device.event })
      .catch(() => console.error('Falha ao enviar alerta de novo acesso.'));
  }
};

const resendCode = async (request, response) => {
  response.json(await authService.resendCode(request.body || {}));
};

const cancelChallenge = (request, response) => {
  authService.cancelChallenge(request.body || {});
  response.json({ message: 'Tentativa cancelada.' });
};

const googleNonce = (request, response) => {
  response.json(require('../services/google-identity.service').issueNonce(request.ip));
};

const googleLogin = async (request, response) => {
  response.json(await authService.googleLogin(request.body || {}, request.ip));
};

const linkGoogle = async (request, response) => {
  response.json(await authService.linkGoogle(request.user, request.body || {}, request.ip, request.session));
};

const getMe = (request, response) => {
  response.json({ user: publicUser(request.user), expiresAt: request.session.expiresAt });
};

const logout = (request, response) => {
  authService.logout(request.session);
  response.json({ message: 'Sessão encerrada com sucesso.' });
};

module.exports = {
  cancelChallenge, getMe, googleLogin, googleNonce, linkGoogle, login, logout, register, resendCode, verifyCode,
};
