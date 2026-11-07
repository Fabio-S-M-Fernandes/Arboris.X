const authService = require('../services/auth.service');

const publicUser = authService.publicUser;

const register = async (request, response) => {
  response.status(201).json(await authService.register(request.body || {}));
};

const login = async (request, response) => {
  response.json(await authService.login(request.body || {}));
};

const getMe = (request, response) => {
  response.json({ user: publicUser(request.user) });
};

const logout = (request, response) => {
  response.json({ message: 'Sessão encerrada com sucesso.' });
};

module.exports = { getMe, login, logout, register };
