const {
  EMAIL_FROM, EMAIL_PROVIDER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN,
  GMAIL_SENDER_EMAIL, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_SECURE, SMTP_USER,
} = require('../config');
const HttpError = require('../utils/httpError');
const { createEmailProvider } = require('./email-provider.service');

let provider;

const plainText = (value) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
const escapeHtml = (value) => plainText(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const getProvider = () => provider ||= createEmailProvider({
  provider: EMAIL_PROVIDER,
  emailFrom: EMAIL_FROM,
  smtpHost: SMTP_HOST,
  smtpPort: SMTP_PORT,
  smtpSecure: SMTP_SECURE,
  smtpUser: SMTP_USER,
  smtpPassword: SMTP_PASSWORD,
  gmailClientId: GMAIL_CLIENT_ID,
  gmailClientSecret: GMAIL_CLIENT_SECRET,
  gmailRefreshToken: GMAIL_REFRESH_TOKEN,
  gmailSenderEmail: GMAIL_SENDER_EMAIL,
});

const renderEmail = ({ eyebrow, title, content }) => `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @media only screen and (max-width: 600px) {
      .email-card { padding: 26px 20px !important; }
      .email-code { font-size: 30px !important; letter-spacing: .2em !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#071510;color:#eef8f3;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#071510" style="width:100%;background:#071510">
    <tr>
      <td align="center" style="padding:28px 14px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:580px;margin:0 auto">
          <tr>
            <td class="email-card" bgcolor="#0b261a" style="padding:36px 32px;border:1px solid #174633;border-radius:16px;background:#0b261a">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding:0 0 24px">
                    <p style="margin:0;color:#f1faf5;font-size:20px;font-weight:700;letter-spacing:.16em">ARBORIS<span style="color:#21d991">.X</span></p>
                    <p style="margin:7px 0 0;color:#a6c5b4;font-size:10px;letter-spacing:.2em">INTELIGÊNCIA AMBIENTAL</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 0 10px;color:#21d991;font-size:11px;font-weight:700;letter-spacing:.16em">${eyebrow}</td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 0 22px">
                    <h1 style="margin:0;color:#f1faf5;font-size:24px;line-height:1.3;font-weight:600">${title}</h1>
                  </td>
                </tr>
                <tr><td style="color:#d7e8df;font-size:15px;line-height:1.7">${content}</td></tr>
                <tr>
                  <td align="center" style="padding:28px 0 0;border-top:1px solid #174633;color:#9bb8a8;font-size:11px;line-height:1.6">
                    Arboris.X · Inteligência Ambiental
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const greetingFor = (name) => {
  const safeName = plainText(name);
  return safeName ? `Olá, ${safeName}!` : 'Olá!';
};

const buildVerificationMessage = ({ email, name, code, expiresInMinutes = 5 }) => {
  if (!/^\d{6}$/.test(code)) throw new Error('Invalid verification code format.');
  if (!Number.isSafeInteger(expiresInMinutes) || expiresInMinutes < 1) throw new Error('Invalid verification expiry.');
  const greeting = greetingFor(name);
  const expiry = `Válido por ${expiresInMinutes} ${expiresInMinutes === 1 ? 'minuto' : 'minutos'}.`;
  const text = [
    greeting, '',
    'Seu código de segurança:', '',
    code, '', expiry, '',
    'Não solicitou este código? Ignore este e-mail. Nunca compartilhe seu código.', '',
    'ARBORIS.X', 'INTELIGÊNCIA AMBIENTAL',
  ].join('\n');
  const html = renderEmail({
    eyebrow: 'SEGURANÇA DA CONTA',
    title: 'Confirme seu acesso',
    content: `<p style="margin:0 0 14px;color:#f1faf5">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 20px">Seu código de segurança:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px">
        <tr><td class="email-code" align="center" style="padding:20px 12px;border:1px solid #21d991;border-radius:12px;background:#071510;color:#21d991;font-family:Arial,Helvetica,sans-serif;font-size:36px;font-weight:700;letter-spacing:.12em;line-height:1.2">${code}</td></tr>
      </table>
      <p style="margin:0 0 22px;text-align:center;color:#c1d8cb;font-size:13px">${escapeHtml(expiry)}</p>
      <p style="margin:0;color:#b8cfc2;font-size:12px;line-height:1.6">Não solicitou este código? Ignore este e-mail. Nunca compartilhe o código.</p>`,
  });
  return {
    from: EMAIL_FROM,
    to: email,
    subject: 'Confirme seu acesso — Arboris.X',
    text,
    html,
  };
};

const sendVerificationCode = async (details) => {
  const message = buildVerificationMessage(details);
  try {
    await getProvider().send(message);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, 'Não foi possível enviar o código agora. Tente novamente mais tarde.', undefined, 'EMAIL_DELIVERY_FAILED');
  }
};

const formatAccessTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não identificada';
  return `${new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC',
  }).format(date)} UTC`;
};

const buildNewAccessMessage = ({ email, name, accessedAt }) => {
  const greeting = greetingFor(name);
  const time = formatAccessTime(accessedAt);
  const text = [
    greeting, '', 'Sua conta Arboris.X recebeu um novo acesso.',
    `Quando: ${time}`, '',
    'Se foi você, nenhuma ação é necessária.',
    'Não reconhece este acesso? Altere sua senha.', '',
    'ARBORIS.X', 'INTELIGÊNCIA AMBIENTAL',
  ].join('\n');
  const html = renderEmail({
    eyebrow: 'ALERTA DE SEGURANÇA',
    title: 'Novo acesso à sua conta',
    content: `<p style="margin:0 0 14px;color:#f1faf5">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 18px">Sua conta Arboris.X recebeu um novo acesso.</p>
      <p style="margin:0 0 18px;color:#c1d8cb">Quando: ${escapeHtml(time)}</p>
      <p style="margin:0 0 12px">Se foi você, nenhuma ação é necessária.</p>
      <p style="margin:0;color:#b8cfc2;font-size:13px;line-height:1.6">Não reconhece este acesso? Altere sua senha.</p>`,
  });
  return { from: EMAIL_FROM, to: email, subject: 'Novo acesso detectado — Arboris.X', text, html };
};

const sendNewAccessAlert = async (details) => {
  const message = buildNewAccessMessage(details);
  try {
    await getProvider().send(message);
  } catch (error) {
    throw new HttpError(503, 'O alerta de segurança não pôde ser enviado.', undefined, 'SECURITY_ALERT_DELIVERY_FAILED');
  }
};

module.exports = { buildNewAccessMessage, buildVerificationMessage, sendNewAccessAlert, sendVerificationCode };
