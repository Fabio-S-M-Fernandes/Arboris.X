const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const production = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3001);
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(TRUST_PROXY_HOPS) || TRUST_PROXY_HOPS < 0 || TRUST_PROXY_HOPS > 5) throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 5.');
const RATE_LIMIT_STORAGE = process.env.RATE_LIMIT_STORAGE || (production ? 'postgres' : 'memory');
if (!['memory', 'postgres'].includes(RATE_LIMIT_STORAGE) || (production && RATE_LIMIT_STORAGE !== 'postgres')) {
  throw new Error('RATE_LIMIT_STORAGE precisa ser postgres em produção; memória é permitida somente fora de produção.');
}
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT precisa ser um número inteiro entre 1 e 65535.');
if (production && !process.env.FRONTEND_URL) throw new Error('FRONTEND_URL é obrigatória em produção.');
const FRONTEND_URLS = (process.env.FRONTEND_URL || 'http://localhost:5000,http://127.0.0.1:5000,http://localhost:5174')
  .split(',').map((url) => url.trim()).filter(Boolean);
if (!FRONTEND_URLS.length || FRONTEND_URLS.some((url) => {
  try { const parsed = new URL(url); return !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== url; }
  catch { return true; }
})) throw new Error('FRONTEND_URL precisa conter origens HTTP(S) exatas, separadas por vírgulas.');

if (production && FRONTEND_URLS.some((url) => new URL(url).protocol !== 'https:')) {
  throw new Error('FRONTEND_URL deve conter somente origens HTTPS em produção.');
}
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const DATABASE_URL = process.env.DATABASE_URL || '';
const configuredEmailProvider = process.env.EMAIL_PROVIDER || (production ? 'gmail-api' : 'smtp');
const EMAIL_PROVIDER = configuredEmailProvider === 'gmail_api' ? 'gmail-api' : configuredEmailProvider;
if (!['smtp', 'gmail-api'].includes(EMAIL_PROVIDER)) throw new Error('EMAIL_PROVIDER precisa ser smtp ou gmail-api.');
if (production && EMAIL_PROVIDER !== 'gmail-api') throw new Error('Produção exige EMAIL_PROVIDER=gmail-api; SMTP não está disponível no Render gratuito.');
const EMAIL_FROM = process.env.EMAIL_FROM || '';
const OTP_SECRET = process.env.OTP_SECRET || (production ? '' : crypto.randomBytes(48).toString('hex'));
if (production && Buffer.byteLength(OTP_SECRET) < 32) throw new Error('OTP_SECRET precisa conter pelo menos 32 bytes aleatórios em produção.');
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
if (!Number.isInteger(SMTP_PORT) || SMTP_PORT < 1 || SMTP_PORT > 65535) throw new Error('SMTP_PORT precisa ser um número de porta válido.');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || '';
const GMAIL_SENDER_EMAIL = process.env.GMAIL_SENDER_EMAIL || '';

// Production uses Supabase Auth and session authorization. Reject incomplete
// configuration before accepting traffic.
if (production) {
  const required = {
    SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, DATABASE_URL, EMAIL_FROM,
  };
  const missing = Object.entries(required).filter(([, value]) => !value.trim()).map(([name]) => name);
  if (missing.length) throw new Error(`Missing required production configuration: ${missing.join(', ')}.`);
  let supabaseUrl;
  try { supabaseUrl = new URL(SUPABASE_URL); } catch { throw new Error('SUPABASE_URL must be a valid HTTPS URL in production.'); }
  if (supabaseUrl.protocol !== 'https:' || !supabaseUrl.hostname) throw new Error('SUPABASE_URL must be a valid HTTPS URL in production.');
  if (!/^postgres(?:ql)?:\/\//i.test(DATABASE_URL)) throw new Error('DATABASE_URL must use PostgreSQL in production.');
  const gmailRequired = { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL };
  const missingGmail = Object.entries(gmailRequired).filter(([, value]) => !value.trim()).map(([name]) => name);
  if (missingGmail.length) throw new Error(`Missing required production email configuration: ${missingGmail.join(', ')}.`);
}

if (EMAIL_PROVIDER === 'smtp' && (SMTP_PORT !== 587 || SMTP_SECURE)) {
  throw new Error('Gmail SMTP local exige SMTP_PORT=587 e SMTP_SECURE=false para STARTTLS.');
}

module.exports = {
  DATABASE_URL, EMAIL_FROM, EMAIL_PROVIDER, FRONTEND_URLS, GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL,
  OTP_SECRET, PORT, SMTP_HOST,
  SMTP_PASSWORD, SMTP_PORT, SMTP_SECURE, SMTP_USER, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL,
  RATE_LIMIT_STORAGE, TRUST_PROXY_HOPS,
};
