const nodemailer = require('nodemailer');
const {
  SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER,
} = require('../config');
const HttpError = require('../utils/httpError');
const { sendEmailWithResend } = require('./resend.service');

let transporter;

const plainText = (value) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
const escapeHtml = (value) => plainText(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const getTransporter = ({ unavailableMessage = 'O envio de códigos está indisponível. Tente novamente mais tarde.', unavailableCode = 'EMAIL_UNAVAILABLE' } = {}) => {
  if (!SMTP_HOST || !SMTP_FROM || (SMTP_USER && !SMTP_PASS) || (!SMTP_USER && SMTP_PASS)) {
    throw new HttpError(503, unavailableMessage, undefined, unavailableCode);
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      requireTLS: !SMTP_SECURE,
      ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      pool: false,
    });
  }
  return transporter;
};

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
  const expiry = `Este código expira em ${expiresInMinutes} ${expiresInMinutes === 1 ? 'minuto' : 'minutos'}.`;
  const text = [
    greeting, '',
    'Para proteger sua conta Arboris.X, confirme sua identidade utilizando o código abaixo.', '',
    code, '', expiry, '',
    'Nunca compartilhe seu código. Se você não solicitou este acesso, ignore esta mensagem.', '',
    'ARBORIS.X', 'INTELIGÊNCIA AMBIENTAL',
  ].join('\n');
  const html = renderEmail({
    eyebrow: 'VERIFICAÇÃO DE SEGURANÇA',
    title: 'Confirme seu acesso.',
    content: `<p style="margin:0 0 14px;color:#f1faf5">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 20px">Para proteger sua conta Arboris.X, confirme sua identidade utilizando o código abaixo.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px">
        <tr><td class="email-code" align="center" style="padding:20px 12px;border:1px solid #21d991;border-radius:12px;background:#071510;color:#21d991;font-family:Arial,Helvetica,sans-serif;font-size:36px;font-weight:700;letter-spacing:.28em;line-height:1.2">${code}</td></tr>
      </table>
      <p style="margin:0 0 22px;text-align:center;color:#c1d8cb;font-size:13px">${escapeHtml(expiry)}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#071510" style="width:100%;border:1px solid #174633;border-radius:10px;background:#071510">
        <tr><td style="padding:14px 16px;color:#b8cfc2;font-size:12px;line-height:1.6"><strong style="color:#dcece3">Nunca compartilhe seu código.</strong> Se você não solicitou este acesso, ignore esta mensagem.</td></tr>
      </table>`,
  });
  return {
    from: SMTP_FROM,
    to: email,
    subject: 'Confirme seu acesso.',
    text,
    html,
  };
};

const sendVerificationCode = async (details) => {
  const message = buildVerificationMessage(details);
  try {
    await sendEmailWithResend(message);
  } catch (error) {
    transporter = undefined;
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

const buildNewAccessMessage = ({
  email, name, deviceType, browser, operatingSystem, approximateLocation, accessedAt,
}) => {
  const greeting = greetingFor(name);
  const details = [
    ['Dispositivo', plainText(deviceType) || 'Dispositivo não identificado'],
    ['Navegador', plainText(browser) || 'Navegador não identificado'],
    ['Sistema operacional', plainText(operatingSystem) || 'Sistema operacional não identificado'],
    ['Localização aproximada', plainText(approximateLocation) || 'Localização não identificada'],
    ['Data e horário', formatAccessTime(accessedAt)],
  ];
  const text = [
    greeting, '', 'Identificamos um novo acesso à sua conta Arboris.X.', '',
    ...details.map(([label, value]) => `${label}: ${value}`), '',
    'Se foi você, nenhuma ação adicional é necessária.',
    'Se não reconhecer este acesso, altere sua senha e procure o administrador da plataforma.', '',
    'ARBORIS.X', 'INTELIGÊNCIA AMBIENTAL',
  ].join('\n');
  const detailRows = details.map(([label, value]) => `<tr><th scope="row" align="left" style="padding:9px 12px;border-bottom:1px solid #174633;color:#a6c5b4;font-size:12px;font-weight:600">${escapeHtml(label)}</th><td style="padding:9px 12px;border-bottom:1px solid #174633;color:#f1faf5;font-size:13px">${escapeHtml(value)}</td></tr>`).join('');
  const html = renderEmail({
    eyebrow: 'ALERTA DE SEGURANÇA',
    title: 'Novo acesso detectado.',
    content: `<p style="margin:0 0 14px;color:#f1faf5">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 20px">Identificamos um novo acesso à sua conta Arboris.X.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#071510" style="width:100%;margin:0 0 20px;border:1px solid #174633;border-radius:10px;background:#071510;border-collapse:collapse">${detailRows}</table>
      <p style="margin:0 0 12px">Se foi você, nenhuma ação adicional é necessária.</p>
      <p style="margin:0;color:#b8cfc2;font-size:13px;line-height:1.6">Se não reconhecer este acesso, altere sua senha e procure o administrador da plataforma.</p>`,
  });
  return { from: SMTP_FROM, to: email, subject: 'Novo acesso detectado — Arboris.X', text, html };
};

const sendNewAccessAlert = async (details) => {
  const message = buildNewAccessMessage(details);
  try {
    await sendEmailWithResend(message, { alert: true });
  } catch (error) {
    transporter = undefined;
    throw new HttpError(503, 'O alerta de segurança não pôde ser enviado.', undefined, 'SECURITY_ALERT_DELIVERY_FAILED');
  }
};

module.exports = { buildNewAccessMessage, buildVerificationMessage, sendNewAccessAlert, sendVerificationCode };
