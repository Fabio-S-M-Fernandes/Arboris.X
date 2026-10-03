const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { readDatabase } = require('../store/jsonStore');
const HttpError = require('../utils/httpError');

const getTokenFromRequest = (request) => {
  const authorization = request.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim();
};

const requireAuth = (request, response, next) => {
  try {
    const token = getTokenFromRequest(request);
    if (!token) throw new HttpError(401, 'Token de acesso não informado.');

    const payload = jwt.verify(token, JWT_SECRET);
    const user = readDatabase().users.find((item) => item.id === payload.sub);
    if (!user) throw new HttpError(401, 'Sessão inválida ou usuário não encontrado.');

    request.user = user;
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    return next(new HttpError(401, 'Token de acesso inválido ou expirado.'));
  }
};

module.exports = { requireAuth };
