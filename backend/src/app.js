const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { FRONTEND_URLS, TRUST_PROXY_HOPS } = require('./config');
const HttpError = require('./utils/httpError');
const { requireHttpsInProduction } = require('./middleware/httpsOnly');
const authRoutes = require('./routes/auth.routes');
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
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || FRONTEND_URLS.includes(origin)) return callback(null, true);
    return callback(new HttpError(403, 'Origem não autorizada.'));
  },
}));
app.use(express.json({ limit: '16kb' }));
// Sem query strings, corpos, credenciais ou tokens nos logs de acesso.
app.use(morgan(':method :status :response-time ms', { skip: () => process.env.NODE_ENV === 'test' }));

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok', service: 'arboris-x-api', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
