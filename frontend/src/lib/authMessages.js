const codeMessages = {
  invalid_credentials: 'Não foi possível localizar uma conta com esses dados. Confira se o e-mail está correto e se a senha corresponde. Se ainda não tem conta, crie uma; se esqueceu a senha, use “Esqueceu sua senha?”.',
  email_not_confirmed: 'Confirme o e-mail pelo link enviado antes de entrar. Confira também a caixa de spam.',
  EMAIL_CONFIRMATION_REQUIRED: 'Confirme o e-mail pelo link enviado antes de entrar. Confira também a caixa de spam.',
  user_already_exists: 'Este e-mail já está cadastrado. Clique em “Entrar” para acessar a conta ou recupere a senha; se usa Google, escolha essa opção na tela de login.',
  email_exists: 'Este e-mail já está cadastrado. Clique em “Entrar” para acessar a conta ou recupere a senha; se usa Google, escolha essa opção na tela de login.',
  user_already_registered: 'Este e-mail já está cadastrado. Clique em “Entrar” para acessar a conta ou recupere a senha; se usa Google, escolha essa opção na tela de login.',
  email_address_invalid: 'Confira o formato do e-mail e tente novamente.',
  weak_password: 'Escolha uma senha mais forte e tente novamente.',
  signup_disabled: 'O cadastro está temporariamente desativado. Tente novamente mais tarde.',
  email_provider_disabled: 'O cadastro por e-mail está indisponível. Tente entrar com Google ou contate o suporte.',
  over_email_send_rate_limit: 'Muitos e-mails foram solicitados em pouco tempo. Aguarde antes de tentar novamente.',
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
    if (code === 'over_email_send_rate_limit') return codeMessages[code];
    if (code === 'REQUEST_TIMEOUT' || error?.name === 'AbortError') return codeMessages.REQUEST_TIMEOUT;
    return fallbackMessages[context];
  }
  if (code && Object.hasOwn(codeMessages, code)) return codeMessages[code];
  if (error?.status === 429) return codeMessages.RATE_LIMITED;
  if (error?.name === 'AbortError') return codeMessages.REQUEST_TIMEOUT;
  if (error?.code === 'REQUEST_TIMEOUT') return codeMessages.REQUEST_TIMEOUT;
  if (error?.status === 400) return 'Confira os dados informados e tente novamente.';
  if (error?.status === 401) return context === 'login' ? codeMessages.invalid_credentials : 'Sua sessão expirou. Entre novamente.';
  if (error?.status === 403) return 'Confirme seu acesso para continuar.';
  if (error?.status === 404) return 'Não foi possível encontrar esta solicitação. Volte e tente novamente.';
  if (error?.status === 409) return 'Esta solicitação já foi concluída ou entrou em conflito. Atualize a página e confira o estado atual.';
  if (error?.status === 500) return 'Ocorreu um erro no serviço. Tente novamente em alguns minutos.';
  if (error?.status === 503) return 'O serviço está temporariamente indisponível. Tente novamente em alguns minutos.';
  return fallbackMessages[context] || fallbackMessages.session;
}
