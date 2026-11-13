const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const production = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3001);
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(TRUST_PROXY_HOPS) || TRUST_PROXY_HOPS < 0 || TRUST_PROXY_HOPS > 5) throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 5.');
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT precisa ser um número inteiro entre 1 e 65535.');
if (production && !process.env.FRONTEND_URL) throw new Error('FRONTEND_URL é obrigatória em produção.');
const FRONTEND_URLS = (process.env.FRONTEND_URL || 'http://localhost:5000,http://127.0.0.1:5000,http://localhost:5174')
  .split(',').map((url) => url.trim()).filter(Boolean);
if (!FRONTEND_URLS.length || FRONTEND_URLS.some((url) => {
  try { const parsed = new URL(url); return !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== url; }
  catch { return true; }
})) throw new Error('FRONTEND_URL precisa conter origens HTTP(S) exatas, separadas por vírgulas.');

// Sem segredo público fixo: em desenvolvimento, reiniciar a API encerra as sessões.
if (production && FRONTEND_URLS.some((url) => new URL(url).protocol !== 'https:')) {
  throw new Error('FRONTEND_URL deve conter somente origens HTTPS em produção.');
}

const JWT_SECRET = process.env.JWT_SECRET || (production ? '' : crypto.randomBytes(48).toString('hex'));
if (production && (Buffer.byteLength(JWT_SECRET) < 32 || /change.?me|dev-secret|your.?secret|exemplo/i.test(JWT_SECRET))) {
  throw new Error('JWT_SECRET precisa ser um segredo aleatório de pelo menos 32 bytes em produção.');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const duration = /^([1-9]\d*)(s|m|h|d)$/.exec(JWT_EXPIRES_IN);
const ttl = duration ? Number(duration[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[duration[2]] : 0;
if (!ttl || ttl > 86400) throw new Error('JWT_EXPIRES_IN precisa estar entre 1s e 24h.');
const DATA_FILE = process.env.DATA_FILE ? path.resolve(process.cwd(), process.env.DATA_FILE) : path.resolve(__dirname, '../data/db.json');
const REVOCATION_FILE = path.join(path.dirname(DATA_FILE), 'revoked-tokens.json');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const OTP_SECRET = process.env.OTP_SECRET || (production ? '' : crypto.randomBytes(48).toString('hex'));
if (production && Buffer.byteLength(OTP_SECRET) < 32) throw new Error('OTP_SECRET precisa conter pelo menos 32 bytes aleatórios em produção.');
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
if (!Number.isInteger(SMTP_PORT) || SMTP_PORT < 1 || SMTP_PORT > 65535) throw new Error('SMTP_PORT precisa ser um número de porta válido.');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';
const SMTP_SECURE = process.env.SMTP_SECURE === undefined ? SMTP_PORT === 465 : process.env.SMTP_SECURE === 'true';

module.exports = {
  DATA_FILE, FRONTEND_URLS, GOOGLE_CLIENT_ID, JWT_EXPIRES_IN, JWT_SECRET, OTP_SECRET, PORT,
  REVOCATION_FILE, SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER, TRUST_PROXY_HOPS,
};
