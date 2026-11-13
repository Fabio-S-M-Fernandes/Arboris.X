const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const userRepository = require('../repositories/user.repository');
const { isRevoked } = require('../store/revokedTokens');
const HttpError = require('../utils/httpError');

const requireAuth = (request, response, next) => {
  try {
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization || '');
    if (!match || match[1].length > 4096) throw new HttpError(401, 'Sess?o inv?lida ou expirada.');
    const token = match[1];
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (!payload || typeof payload.sub !== 'string' || !Number.isInteger(payload.exp) || isRevoked(token)) {
      throw new HttpError(401, 'Sess?o inv?lida ou expirada.');
    }
    const user = userRepository.findById(payload.sub);
    if (!user) throw new HttpError(401, 'Sess?o inv?lida ou expirada.');
    request.user = user;
    request.session = {
      token,
      expiresAt: payload.exp,
      authenticatedAt: payload.iat,
      authenticationMethods: Array.isArray(payload.amr) ? payload.amr : [],
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError || error instanceof jwt.NotBeforeError) {
      return next(new HttpError(401, 'Sess?o inv?lida ou expirada.'));
    }
    return next(error);
  }
};
module.exports = { requireAuth };
