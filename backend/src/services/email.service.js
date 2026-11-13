const nodemailer = require('nodemailer');
const {
  SMTP_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER,
} = require('../config');
const HttpError = require('../utils/httpError');

let transporter;

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
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

const buildVerificationMessage = ({ email, name, code }) => {
  if (!/^\d{6}$/.test(code)) throw new Error('Invalid verification code format.');
  const safeName = escapeHtml(name || 'Olá');
  const text = `Olá, ${name || 'Olá'}!\n\nSeu código de acesso ao Arboris.X é:\n${code}\n\nEste código expira em 5 minutos.\nSe você não solicitou este acesso, ignore esta mensagem. Nunca compartilhe seu código de segurança.`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px;background:#06110d;color:#eaf5ee;font-family:Arial,sans-serif"><main style="max-width:520px;margin:0 auto;padding:32px;border:1px solid #176947;border-radius:18px;background:#09251a"><p style="margin:0 0 12px;color:#76dca8;letter-spacing:.14em;font-size:12px">ARBORIS.X</p><h1 style="margin:0 0 20px;font-size:22px">Confirme seu acesso</h1><p>Olá, ${safeName}!</p><p>Seu código de acesso ao Arboris.X é:</p><p style="margin:24px 0;padding:18px;text-align:center;border:1px solid #176947;border-radius:12px;background:#031a11;color:#55efaa;font-size:32px;font-weight:700;letter-spacing:.28em">${code}</p><p>Este código expira em 5 minutos.</p><p style="color:#afc8ba;font-size:13px">Se você não solicitou este acesso, ignore esta mensagem. Nunca compartilhe seu código de segurança.</p></main></body></html>`;
  return {
    from: SMTP_FROM,
    to: email,
    subject: 'Seu código de segurança — Arboris.X',
    text,
    html,
  };
};

const sendVerificationCode = async (details) => {
  const message = buildVerificationMessage(details);
  try {
    await getTransporter().sendMail(message);
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
  const safeName = escapeHtml(name || 'Olá');
  const details = [
    ['Dispositivo', deviceType || 'Dispositivo não identificado'],
    ['Navegador', browser || 'Navegador não identificado'],
    ['Sistema operacional', operatingSystem || 'Sistema operacional não identificado'],
    ['Localização aproximada', approximateLocation || 'Localização não identificada'],
    ['Data e horário', formatAccessTime(accessedAt)],
  ];
  const text = [
    `Olá, ${name || 'Olá'}!`, '', 'Identificamos um novo acesso à sua conta Arboris.X.', '',
    ...details.map(([label, value]) => `${label}: ${value}`), '',
    'Se foi você, nenhuma ação adicional é necessária.',
    'Se não reconhecer este acesso, altere sua senha e procure o administrador da plataforma.', '',
    'Equipe Arboris.X', 'INTELIGÊNCIA AMBIENTAL',
  ].join('\n');
  const detailRows = details.map(([label, value]) => `<tr><th align="left" style="padding:8px 12px;color:#a9c9b7;font-size:13px">${escapeHtml(label)}</th><td style="padding:8px 12px;color:#f0f8f3;font-size:13px">${escapeHtml(value)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:20px;background:#06110d;color:#eaf5ee;font-family:Arial,sans-serif"><main style="max-width:560px;margin:0 auto;padding:28px 24px;border:1px solid #176947;border-radius:18px;background:#09251a"><p style="margin:0;color:#55efaa;font-size:17px;font-weight:700;letter-spacing:.14em">ARBORIS<span style="color:#d9f6e6">.X</span></p><p style="margin:5px 0 24px;color:#a9c9b7;font-size:10px;letter-spacing:.18em">INTELIGÊNCIA AMBIENTAL</p><h1 style="margin:0 0 14px;font-size:21px">Novo acesso detectado</h1><p style="line-height:1.6">Olá, ${safeName}! Identificamos um novo acesso à sua conta Arboris.X.</p><table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #176947;background:#061b13">${detailRows}</table><p style="margin:22px 0 8px;line-height:1.55">Se foi você, nenhuma ação adicional é necessária.</p><p style="margin:0;color:#b4cdbd;font-size:13px;line-height:1.55">Se não reconhecer este acesso, altere sua senha e procure o administrador da plataforma.</p><p style="margin:24px 0 0;color:#9eb9aa;font-size:12px">Equipe Arboris.X</p></main></body></html>`;
  return { from: SMTP_FROM, to: email, subject: 'Novo acesso detectado — Arboris.X', text, html };
};

const sendNewAccessAlert = async (details) => {
  const message = buildNewAccessMessage(details);
  try {
    await getTransporter({
      unavailableMessage: 'O alerta de segurança não está disponível.',
      unavailableCode: 'SECURITY_ALERT_UNAVAILABLE',
    }).sendMail(message);
  } catch (error) {
    transporter = undefined;
    throw new HttpError(503, 'O alerta de segurança não pôde ser enviado.', undefined, 'SECURITY_ALERT_DELIVERY_FAILED');
  }
};

module.exports = { buildNewAccessMessage, buildVerificationMessage, sendNewAccessAlert, sendVerificationCode };
