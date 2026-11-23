const express = require('express');
const crypto = require('node:crypto');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { FRONTEND_URLS, TRUST_PROXY_HOPS } = require('./config');
const HttpError = require('./utils/httpError');
const { requireHttpsInProduction } = require('./middleware/httpsOnly');
const sessionRoutes = require('./routes/session.routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
if (TRUST_PROXY_HOPS > 0) app.set('trust proxy', TRUST_PROXY_HOPS);
app.use(helmet({
  strictTransportSecurity: process.env.NODE_ENV === 'production'
    ? { maxAge: 31_536_000, includeSubDomains: false, preload: false }
    : false,
}));
app.use(requireHttpsInProduction);
app.use((request, response, next) => {
  request.requestId = crypto.randomUUID();
  response.set('X-Request-ID', request.requestId);
  next();
});
app.use(cors({
  credentials: true,
  exposedHeaders: ['Retry-After'],
  origin(origin, callback) {
    if (!origin || FRONTEND_URLS.includes(origin)) return callback(null, true);
    return callback(new HttpError(403, 'Origem não autorizada.'));
  },
}));
app.use(express.json({ limit: '16kb' }));
// Sem query strings, corpos, credenciais ou tokens nos logs de acesso.
morgan.token('request-id', (request) => request.requestId);
app.use(morgan(':request-id :method :status :response-time ms', { skip: () => process.env.NODE_ENV === 'test' }));

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok', service: 'arboris-x-api', timestamp: new Date().toISOString() });
});

app.use('/api/auth', (_request, response) => response.status(410).json({
  error: { code: 'LEGACY_AUTH_DISABLED', message: 'A autenticação legada foi desativada. Entre pelo fluxo de autenticação atual.' },
}));
app.use('/api/session', sessionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
