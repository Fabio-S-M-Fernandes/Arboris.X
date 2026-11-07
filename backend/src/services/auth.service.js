const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_EXPIRES_IN, JWT_SECRET } = require('../config');
const userRepository = require('../repositories/user.repository');
const HttpError = require('../utils/httpError');
const { validateCredentials } = require('../validators/auth.validator');

const publicUser = (user) => ({ id: user.id, nome: user.nome, email: user.email, criadoEm: user.criadoEm });
const createAccessToken = (user) => jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const register = async (data) => {
  validateCredentials(data, true);
  const normalizedEmail = String(data.email).trim().toLowerCase();
  if (userRepository.findByEmail(normalizedEmail)) throw new HttpError(409, 'Já existe uma conta com este e-mail.', { email: 'E-mail já cadastrado.' });
  const user = await userRepository.create({
    id: crypto.randomUUID(), nome: String(data.nome).trim(), email: normalizedEmail,
    passwordHash: await bcrypt.hash(String(data.senha), 12), criadoEm: new Date().toISOString(),
  });
  return { user: publicUser(user), token: createAccessToken(user) };
};

const login = async (data) => {
  validateCredentials(data, false);
  const user = userRepository.findByEmail(String(data.email).trim().toLowerCase());
  if (!user || !(await bcrypt.compare(String(data.senha), user.passwordHash))) throw new HttpError(401, 'E-mail ou senha inválidos.');
  return { user: publicUser(user), token: createAccessToken(user) };
};

module.exports = { login, publicUser, register };
