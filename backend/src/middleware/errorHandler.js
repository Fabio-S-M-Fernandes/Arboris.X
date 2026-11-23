const HttpError = require('../utils/httpError');
const safeServerCodes = new Set(['EMAIL_DELIVERY_FAILED']);

const notFound = (request, response, next) => {
  next(new HttpError(404, 'Rota não encontrada.'));
};

const errorHandler = (error, request, response, _next) => {
  const databaseCode = {
    '28P01': 'DATABASE_AUTH_FAILED',
    '42P01': 'DATABASE_SCHEMA_MISSING',
    '42703': 'DATABASE_SCHEMA_MISSING',
    '3D000': 'DATABASE_UNAVAILABLE',
    '08001': 'DATABASE_UNAVAILABLE',
    '08006': 'DATABASE_UNAVAILABLE',
    '57014': 'DATABASE_QUERY_TIMEOUT',
    ECONNREFUSED: 'DATABASE_UNAVAILABLE',
    ETIMEDOUT: 'DATABASE_UNAVAILABLE',
  }[error.code];
  const status = databaseCode ? 503 : error.status || 500;
  const isServerError = status >= 500;

  if (isServerError || ([401, 403, 429].includes(status) && /^\/api\/session(\/|$)/.test(request.path))) {
    const code = /^[A-Za-z0-9_.-]{1,64}$/.test(String(error.code || '')) ? error.code : undefined;
    console.error('[api-error]', JSON.stringify({
      requestId: request.requestId,
      method: request.method,
      path: request.path,
      status,
      ...(code ? { code } : {}),
    }));
  }

  if (status === 429 && Number.isInteger(error.retryAfterSeconds) && error.retryAfterSeconds > 0) {
    response.set('Retry-After', String(error.retryAfterSeconds));
  }

  response.status(status).json({
    error: {
      message: databaseCode ? 'Banco de dados indisponível. Verifique a configuração e as migrações.' : isServerError ? 'Erro interno do servidor.' : error.type === 'entity.parse.failed' ? 'JSON inválido.' : error.type === 'entity.too.large' ? 'Requisição muito grande.' : error.message,
      ...(databaseCode ? { code: databaseCode }
        : error.code && (!isServerError || safeServerCodes.has(error.code)) ? { code: error.code } : {}),
      ...(!isServerError && error.details ? { details: error.details } : {}),
    },
  });
};

module.exports = { errorHandler, notFound };
