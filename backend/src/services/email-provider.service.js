const nodemailer = require('nodemailer');
const MailComposer = require('nodemailer/lib/mail-composer');
const fetchWithTimeout = require('../utils/fetchWithTimeout');

const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const TIMEOUT_MS = 10_000;

const addressFrom = (value) => {
  const text = String(value || '').replace(/[\r\n]/g, '').trim();
  const match = /<([^<>]+)>$/.exec(text);
  return (match ? match[1] : text).trim().toLowerCase();
};

const validAddress = (value) => /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);

const buildRawMessage = (message) => new Promise((resolve, reject) => {
  const composer = new MailComposer({
    from: message.from,
    to: message.to,
    subject: message.subject,
    text: { content: String(message.text ?? ''), contentType: 'text/plain; charset=utf-8' },
    html: { content: String(message.html ?? ''), contentType: 'text/html; charset=utf-8' },
    textEncoding: 'quoted-printable',
    date: new Date(),
  }).compile();
  composer.build((error, buffer) => error ? reject(error) : resolve(buffer.toString('base64url')));
});

const responseJson = async (response) => {
  try { return await response.json(); } catch { return {}; }
};

const createEmailProvider = (config, {
  fetchImpl = fetchWithTimeout,
  smtpTransportFactory = nodemailer.createTransport,
} = {}) => {
  let transporter;

  if (config.provider === 'smtp' && (!config.smtpUser || !config.smtpPassword || !config.emailFrom)) {
    throw new Error('SMTP local precisa de SMTP_USER, SMTP_PASSWORD e EMAIL_FROM.');
  }
  if (config.provider === 'smtp' && (config.smtpPort !== 587 || config.smtpSecure !== false)) {
    throw new Error('SMTP local precisa usar porta 587 com STARTTLS.');
  }
  if (config.provider === 'smtp' && (config.smtpHost !== 'smtp.gmail.com'
    || !validAddress(config.smtpUser) || addressFrom(config.emailFrom) !== config.smtpUser.toLowerCase())) {
    throw new Error('SMTP local precisa usar smtp.gmail.com e EMAIL_FROM deve corresponder à conta autenticada.');
  }
  if (config.provider === 'gmail-api') {
    const required = [config.gmailClientId, config.gmailClientSecret, config.gmailRefreshToken, config.gmailSenderEmail, config.emailFrom];
    if (required.some((value) => !value)) throw new Error('Gmail API não está configurada.');
    if (!validAddress(config.gmailSenderEmail) || addressFrom(config.emailFrom) !== config.gmailSenderEmail.toLowerCase()) {
      throw new Error('EMAIL_FROM precisa corresponder ao GMAIL_SENDER_EMAIL.');
    }
  }
  if (!['smtp', 'gmail-api'].includes(config.provider)) throw new Error('Provedor de e-mail inválido.');

  const getTransporter = () => {
    transporter ||= smtpTransportFactory({
      host: config.smtpHost,
      port: 587,
      secure: false,
      requireTLS: true,
      tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
      auth: { user: config.smtpUser, pass: config.smtpPassword },
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: 15_000,
      pool: false,
    });
    return transporter;
  };

  const getAccessToken = async () => {
    const body = new URLSearchParams({
      client_id: config.gmailClientId,
      client_secret: config.gmailClientSecret,
      refresh_token: config.gmailRefreshToken,
      grant_type: 'refresh_token',
    });
    const response = await fetchImpl(GMAIL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const payload = await responseJson(response);
    if (!response.ok || typeof payload.access_token !== 'string' || !payload.access_token) {
      const error = new Error('Gmail OAuth token refresh failed.');
      error.code = 'GMAIL_OAUTH_FAILED';
      throw error;
    }
    return payload.access_token;
  };

  return {
    async send(message) {
      if (!validAddress(addressFrom(message.to))) throw new Error('Destinatário de e-mail inválido.');
      if (config.provider === 'smtp') return getTransporter().sendMail(message);

      const token = await getAccessToken();
      const raw = await buildRawMessage(message);
      const response = await fetchImpl(GMAIL_SEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        const error = new Error('Gmail API delivery failed.');
        error.code = 'GMAIL_DELIVERY_FAILED';
        throw error;
      }
      return responseJson(response);
    },
  };
};

module.exports = { GMAIL_SEND_SCOPE, buildRawMessage, createEmailProvider };
