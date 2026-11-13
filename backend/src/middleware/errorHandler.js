const HttpError = require('../utils/httpError');

const notFound = (request, response, next) => {
  next(new HttpError(404, 'Rota não encontrada.'));
};

const errorHandler = (error, request, response, _next) => {
  const status = error.status || 500;
  const isServerError = status >= 500;

  if (isServerError) console.error('Falha interna ao processar a solicitação.');

  response.status(status).json({
    error: {
      message: isServerError ? 'Erro interno do servidor.' : error.type === 'entity.parse.failed' ? 'JSON inválido.' : error.type === 'entity.too.large' ? 'Requisição muito grande.' : error.message,
      ...(error.code && !isServerError ? { code: error.code } : {}),
      ...(!isServerError && error.details ? { details: error.details } : {}),
    },
  });
};

module.exports = { errorHandler, notFound };
