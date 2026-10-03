const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_EXPIRES_IN, JWT_SECRET } = require('../config');
const { readDatabase, updateDatabase } = require('../store/jsonStore');
const HttpError = require('../utils/httpError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({
  id: user.id,
  nome: user.nome,
  email: user.email,
  criadoEm: user.criadoEm,
});

const createAccessToken = (user) => jwt.sign(
  { sub: user.id, email: user.email },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN },
);

const validateCredentials = ({ nome, email, senha, termosAceitos }, isRegistration) => {
  const errors = {};
  if (isRegistration && !String(nome || '').trim()) errors.nome = 'Nome obrigatório.';
  if (!String(email || '').trim()) errors.email = 'E-mail obrigatório.';
  else if (!EMAIL_REGEX.test(String(email).trim())) errors.email = 'Formato de e-mail inválido.';
  if (!senha) errors.senha = 'Senha obrigatória.';
  else if (String(senha).length < 6) errors.senha = 'A senha precisa ter no mínimo 6 caracteres.';
  if (isRegistration && termosAceitos !== true) errors.termos = 'Aceite os Termos de Uso e a Política de Privacidade.';
  if (Object.keys(errors).length) throw new HttpError(422, 'Revise os dados informados.', errors);
};

const register = async (request, response) => {
  const { nome, email, senha, termosAceitos } = request.body || {};
  validateCredentials({ nome, email, senha, termosAceitos }, true);
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = {
    id: crypto.randomUUID(),
    nome: String(nome).trim(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(String(senha), 12),
    criadoEm: new Date().toISOString(),
  };

  updateDatabase((current) => {
    if (current.users.some((item) => item.email === normalizedEmail)) {
      throw new HttpError(409, 'Já existe uma conta com este e-mail.', { email: 'E-mail já cadastrado.' });
    }
    current.users.push(user);
  });

  response.status(201).json({ user: publicUser(user), token: createAccessToken(user) });
};

const login = async (request, response) => {
  const { email, senha } = request.body || {};
  validateCredentials({ email, senha }, false);
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = readDatabase().users.find((item) => item.email === normalizedEmail);
  const passwordIsValid = user && await bcrypt.compare(String(senha), user.passwordHash);
  if (!user || !passwordIsValid) throw new HttpError(401, 'E-mail ou senha inválidos.');

  response.json({ user: publicUser(user), token: createAccessToken(user) });
};

const getMe = (request, response) => {
  response.json({ user: publicUser(request.user) });
};

const logout = (request, response) => {
  response.json({ message: 'Sessão encerrada com sucesso.' });
};

module.exports = { getMe, login, logout, register };
