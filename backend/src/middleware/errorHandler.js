const HttpError = require('../utils/httpError');

const notFound = (request, response, next) => {
  next(new HttpError(404, `Rota não encontrada: ${request.method} ${request.originalUrl}`));
};

const errorHandler = (error, request, response, _next) => {
  const status = error.status || 500;
  const isServerError = status >= 500;

  if (isServerError) console.error(error);

  response.status(status).json({
    error: {
      message: isServerError ? 'Erro interno do servidor.' : error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
};

module.exports = { errorHandler, notFound };
