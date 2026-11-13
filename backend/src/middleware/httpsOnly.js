const HttpError = require('../utils/httpError');

const requireHttpsInProduction = (request, response, next) => {
  if (process.env.NODE_ENV !== 'production' || request.secure) return next();
  return next(new HttpError(426, 'A API aceita conexões somente por HTTPS.', undefined, 'HTTPS_REQUIRED'));
};

module.exports = { requireHttpsInProduction };
