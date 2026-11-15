const { Resend } = require('resend');
const { EMAIL_FROM, RESEND_API_KEY } = require('../config');
const HttpError = require('../utils/httpError');

let resend;

const sendEmailWithResend = async (message, { alert = false } = {}) => {
  if (!RESEND_API_KEY || !EMAIL_FROM) {
    throw new HttpError(503, alert ? 'Alerta de segurança indisponível.' : 'Envio de códigos indisponível.', undefined,
      alert ? 'SECURITY_ALERT_UNAVAILABLE' : 'EMAIL_UNAVAILABLE');
  }
  resend ||= new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({ ...message, from: EMAIL_FROM });
  if (error) {
    throw new HttpError(503, alert ? 'O alerta de segurança não pôde ser enviado.' : 'Não foi possível enviar o código agora.', undefined,
      alert ? 'SECURITY_ALERT_DELIVERY_FAILED' : 'EMAIL_DELIVERY_FAILED');
  }
};

module.exports = { sendEmailWithResend };
