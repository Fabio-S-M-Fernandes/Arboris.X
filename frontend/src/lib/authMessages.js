const codeMessages = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  EMAIL_CONFIRMATION_REQUIRED: 'Confirme seu e-mail antes de entrar.',
  user_already_exists: 'Não foi possível criar a conta com esses dados. Confira as informações ou entre na sua conta.',
  email_exists: 'Não foi possível criar a conta com esses dados. Confira as informações ou entre na sua conta.',
  OTP_INCORRECT: 'Código incorreto. Confira os seis dígitos e tente novamente.',
  OTP_INVALID: 'Este código expirou ou já foi usado. Inicie o acesso novamente.',
  OTP_INVALID_FORMAT: 'Digite os seis números do código.',
  OTP_ATTEMPTS_EXHAUSTED: 'Você atingiu o limite de tentativas. Inicie o acesso novamente.',
  OTP_RESEND_WAIT: 'Aguarde o contador para pedir outro código.',
  OTP_RESEND_LIMIT: 'Limite de reenvios atingido. Tente novamente mais tarde.',
  OTP_SEND_LIMIT: 'Muitas solicitações de código. Tente novamente mais tarde.',
  EMAIL_DELIVERY_FAILED: 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  RATE_LIMIT_STORE_UNAVAILABLE: 'O serviço está temporariamente indisponível. Tente novamente em alguns minutos.',
  REQUEST_TIMEOUT: 'A resposta demorou mais que o esperado. Verifique sua conexão e tente novamente.',
  otp_expired: 'Este link expirou. Solicite outro.',
  token_already_used: 'Este link já foi utilizado. Solicite outro se ainda precisar.',
  invalid_token: 'Este link é inválido. Solicite outro.',
  callback_invalid: 'Este link é inválido ou está incompleto. Solicite outro.',
  access_denied: 'O acesso com Google foi cancelado. Você pode tentar novamente.',
  oauth_denied: 'O acesso com Google foi cancelado. Você pode tentar novamente.',
  identity_already_exists: 'Esta conta Google já está vinculada. Entre com a conta correspondente.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
  refresh_token_not_found: 'Sua sessão expirou. Entre novamente.',
  GOOGLE_LINK_REQUIRED: 'Esta conta já existe. Entre com e-mail e senha para vincular o Google.',
  GOOGLE_TERMS_REQUIRED: 'Aceite os termos para continuar com Google.',
  TERMS_REQUIRED: 'Aceite os termos para continuar.',
};

const fallbackMessages = {
  login: 'Não foi possível entrar agora. Tente novamente.',
  signup: 'Não foi possível criar sua conta agora. Tente novamente.',
  otp: 'Não foi possível confirmar o código. Tente novamente.',
  resend: 'Não foi possível reenviar o código agora. Tente novamente.',
  google: 'Não foi possível continuar com Google. Tente novamente.',
  recovery: 'Não foi possível solicitar a recuperação agora. Tente novamente mais tarde.',
  password: 'Não foi possível atualizar a senha. Solicite um novo link.',
  link: 'Este link é inválido, expirou ou já foi usado. Solicite outro.',
  session: 'Não foi possível confirmar seu acesso. Tente novamente.',
  email: 'Não foi possível solicitar o e-mail agora. Tente novamente.',
};

export function authErrorMessage(error, context = 'session') {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (context === 'recovery' || context === 'email') {
    if (error?.status === 429) return codeMessages.RATE_LIMITED;
    if (code === 'REQUEST_TIMEOUT' || error?.name === 'AbortError') return codeMessages.REQUEST_TIMEOUT;
    return fallbackMessages[context];
  }
  if (code && Object.hasOwn(codeMessages, code)) return codeMessages[code];
  if (error?.status === 429) return codeMessages.RATE_LIMITED;
  if (error?.name === 'AbortError') return codeMessages.REQUEST_TIMEOUT;
  if (error?.status === 401) return context === 'login' ? codeMessages.invalid_credentials : 'Sua sessão expirou. Entre novamente.';
  if (error?.status === 403) return 'Confirme seu acesso para continuar.';
  if (error?.status === 503) return 'O serviço está temporariamente indisponível. Tente novamente em alguns minutos.';
  return fallbackMessages[context] || fallbackMessages.session;
}
