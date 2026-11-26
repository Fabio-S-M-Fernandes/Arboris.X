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
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    subject: message.subject,
    text: { content: String(message.text ?? ''), contentType: 'text/plain; charset=utf-8' },
    ...(message.html ? { html: { content: String(message.html), contentType: 'text/html; charset=utf-8' } } : {}),
    textEncoding: 'quoted-printable',
    date: new Date(),
  }).compile();
  composer.build((error, buffer) => error ? reject(error) : resolve(buffer.toString('base64url')));
});

const responseJson = async (response) => {
  try { return await response.json(); } catch { return {}; }
};

const safeCode = (value) => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(value)
  ? value.toLowerCase() : '';

const gmailDiagnostic = ({ stage, status, payload = {}, transportError }) => {
  const errorBody = payload?.error;
  const googleCode = safeCode(typeof errorBody === 'string' ? errorBody : errorBody?.status);
  const reasons = Array.isArray(errorBody?.errors) ? errorBody.errors.map((item) => safeCode(item?.reason)) : [];
  const reason = reasons.find(Boolean) || '';
  const googleMessage = String(typeof errorBody === 'object' ? errorBody?.message || '' : payload?.error_description || '').toLowerCase();
  let code = 'GMAIL_PROVIDER_ERROR';
  let category = 'provider';
  let message = 'O Google recusou o envio do e-mail.';

  if (transportError) {
    const transportCode = ['REQUEST_TIMEOUT', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(transportError.code)
      ? transportError.code : transportError.name === 'TimeoutError' || transportError.name === 'AbortError' ? 'REQUEST_TIMEOUT' : 'GMAIL_NETWORK_ERROR';
    return {
      code: transportCode,
      category: 'network',
      message: transportCode === 'REQUEST_TIMEOUT' ? 'A comunicação com o Google excedeu o tempo limite.' : 'Não foi possível alcançar o serviço do Google.',
    };
  }

  if (stage === 'oauth') {
    const oauthMessages = {
      invalid_grant: ['GMAIL_INVALID_GRANT', 'authorization', 'O Google recusou o refresh token; confira se ele corresponde ao client OAuth configurado e continua válido.'],
      invalid_client: ['GMAIL_INVALID_CLIENT', 'configuration', 'O Google recusou o client OAuth; confirme se ID e segredo pertencem ao mesmo client.'],
      unauthorized_client: ['GMAIL_UNAUTHORIZED_CLIENT', 'authorization', 'O client OAuth não está autorizado para este fluxo.'],
      invalid_scope: ['GMAIL_INVALID_SCOPE', 'authorization', 'A autorização OAuth não inclui o escopo necessário para enviar e-mails.'],
      access_denied: ['GMAIL_ACCESS_DENIED', 'authorization', 'A conta remetente não concedeu autorização ao aplicativo.'],
      temporarily_unavailable: ['GMAIL_OAUTH_UNAVAILABLE', 'google_service', 'O serviço OAuth do Google está temporariamente indisponível.'],
      server_error: ['GMAIL_OAUTH_UNAVAILABLE', 'google_service', 'O serviço OAuth do Google está temporariamente indisponível.'],
    };
    const mapped = oauthMessages[googleCode];
    if (mapped) [code, category, message] = mapped;
    else if (status >= 500) [code, category, message] = ['GMAIL_OAUTH_UNAVAILABLE', 'google_service', 'O serviço OAuth do Google está temporariamente indisponível.'];
    else [code, category, message] = ['GMAIL_OAUTH_REJECTED', 'authorization', 'O Google recusou a renovação da autorização OAuth.'];
    return { code, category, message };
  }

  if (status === 429 || ['ratelimitexceeded', 'userratelimitexceeded', 'dailylimitexceeded', 'quotaexceeded'].includes(reason)) {
    [code, category, message] = ['GMAIL_RATE_LIMITED', 'rate_limit', 'O Google limitou temporariamente o envio de e-mails.'];
  } else if (reason === 'insufficientpermissions' || googleCode === 'permission_denied'
    || /insufficient.{0,24}(scope|permission)/.test(googleMessage)) {
    [code, category, message] = ['GMAIL_INSUFFICIENT_SCOPE', 'authorization', 'A autorização OAuth não inclui o escopo Gmail gmail.send.'];
  } else if (reason === 'accessnotconfigured') {
    [code, category, message] = ['GMAIL_API_NOT_ENABLED', 'configuration', 'A Gmail API não está habilitada no projeto Google Cloud do client OAuth.'];
  } else if (reason === 'autherror' || status === 401) {
    [code, category, message] = ['GMAIL_AUTHORIZATION_FAILED', 'authorization', 'O Google não autorizou o envio; confira a conta e a autorização OAuth.'];
  } else if (status === 403 && /from header|sender|send as/.test(googleMessage)) {
    [code, category, message] = ['GMAIL_SENDER_REJECTED', 'sender', 'O Gmail rejeitou o remetente; ele precisa estar autorizado na conta autenticada.'];
  } else if (status === 403) {
    [code, category, message] = ['GMAIL_FORBIDDEN', 'authorization', 'O Google recusou o envio; confira o escopo gmail.send e a autorização do remetente.'];
  } else if (reason === 'invalidargument' && /from header|sender/.test(googleMessage)) {
    [code, category, message] = ['GMAIL_SENDER_REJECTED', 'sender', 'O Gmail rejeitou o remetente; ele precisa estar autorizado na conta autenticada.'];
  } else if (status >= 500) {
    [code, category, message] = ['GMAIL_API_UNAVAILABLE', 'google_service', 'A Gmail API está temporariamente indisponível.'];
  } else if (status) {
    code = `GMAIL_HTTP_${status}`;
  }
  return { code, category, message };
};

const providerError = (diagnostic, status) => {
  const error = new Error(diagnostic.message);
  error.code = diagnostic.code;
  // O status é o do provedor externo; nunca deve ser usado como status da nossa API.
  if (Number.isInteger(status)) error.providerStatus = status;
  error.gmailDiagnostic = diagnostic;
  return error;
};

const emailConfigurationError = (message, code, category, safeMessage) => {
  const error = new Error(message);
  error.gmailDiagnostic = { code, category, message: safeMessage };
  return error;
};

const createEmailProvider = (config, {
  fetchImpl = fetchWithTimeout,
  smtpTransportFactory = nodemailer.createTransport,
} = {}) => {
  let transporter;
  let accessToken;
  let accessTokenExpiresAt = 0;
  let refreshPromise;

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
    if (required.some((value) => !value)) throw emailConfigurationError(
      'Gmail API não está configurada.', 'GMAIL_CONFIG_MISSING', 'configuration',
      'Falta configurar uma ou mais variáveis obrigatórias do Gmail API.',
    );
    if (!validAddress(config.gmailSenderEmail) || addressFrom(config.emailFrom) !== config.gmailSenderEmail.toLowerCase()) {
      throw emailConfigurationError(
        'EMAIL_FROM precisa corresponder ao GMAIL_SENDER_EMAIL.', 'GMAIL_SENDER_CONFIG_MISMATCH', 'sender',
        'EMAIL_FROM e GMAIL_SENDER_EMAIL precisam identificar o mesmo remetente autorizado.',
      );
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

  const refreshAccessToken = async () => {
    const body = new URLSearchParams({
      client_id: config.gmailClientId,
      client_secret: config.gmailClientSecret,
      refresh_token: config.gmailRefreshToken,
      grant_type: 'refresh_token',
    });
    let response;
    try {
      response = await fetchImpl(GMAIL_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw providerError(gmailDiagnostic({ stage: 'oauth', transportError: error }));
    }
    const payload = await responseJson(response);
    if (!response.ok || typeof payload.access_token !== 'string' || !payload.access_token) {
      const diagnostic = gmailDiagnostic({ stage: 'oauth', status: response.status, payload });
      throw providerError(diagnostic, response.status);
    }
    if (typeof payload.scope === 'string' && !payload.scope.split(/\s+/).includes(GMAIL_SEND_SCOPE)) {
      throw providerError({ code: 'GMAIL_INSUFFICIENT_SCOPE', category: 'authorization', message: 'A autorização OAuth não inclui o escopo Gmail gmail.send.' });
    }
    const lifetimeSeconds = Number(payload.expires_in);
    if (Number.isFinite(lifetimeSeconds) && lifetimeSeconds > 60) {
      accessToken = payload.access_token;
      accessTokenExpiresAt = Date.now() + (lifetimeSeconds - 60) * 1000;
    }
    return payload.access_token;
  };

  const getAccessToken = () => {
    if (accessToken && Date.now() < accessTokenExpiresAt) return Promise.resolve(accessToken);
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => { refreshPromise = undefined; });
    }
    return refreshPromise;
  };

  return {
    async send(message) {
      if (!validAddress(addressFrom(message.to))) throw new Error('Destinatário de e-mail inválido.');
      if (config.provider === 'smtp') return getTransporter().sendMail(message);

      const token = await getAccessToken();
      const raw = await buildRawMessage(message);
      let response;
      try {
        response = await fetchImpl(GMAIL_SEND_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (error) {
        throw providerError(gmailDiagnostic({ stage: 'send', transportError: error }));
      }
      const payload = await responseJson(response);
      if (response.status === 401) {
        accessToken = undefined;
        accessTokenExpiresAt = 0;
      }
      if (!response.ok) throw providerError(gmailDiagnostic({ stage: 'send', status: response.status, payload }), response.status);
      if (typeof payload.id !== 'string' || !payload.id) {
        throw providerError({ code: 'GMAIL_INVALID_RESPONSE', category: 'provider', message: 'O Google não confirmou o recebimento do e-mail.' }, response.status);
      }
      return payload;
    },
  };
};

module.exports = { GMAIL_SEND_SCOPE, buildRawMessage, createEmailProvider };
