import { getAuthCallbackUrl, getEmailConfirmationUrl, supabase } from './supabase';
import { fetchWithTimeout } from './fetchWithTimeout';

const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '')).replace(/\/$/, '');
export const CURRENT_TERMS_VERSION = '2026-11-15';
export const CURRENT_PRIVACY_VERSION = '2026-11-15';

const logSupabaseAuthFailure = (operation, error) => {
  const code = String(error?.code || 'unknown');
  console.warn('[supabase-auth]', {
    operation,
    code: /^[A-Za-z0-9_.-]{1,64}$/.test(code) ? code : 'unknown',
    status: Number.isInteger(error?.status) ? error.status : undefined,
  });
};

const assertSecureProductionTransport = () => {
  if (!import.meta.env.PROD) return;
  if (!API_BASE_URL) throw new Error('Configure VITE_API_URL com a URL HTTPS da API para produção.');
  const apiProtocol = new URL(API_BASE_URL, window.location.origin).protocol;
  if (window.location.protocol !== 'https:' || apiProtocol !== 'https:') {
    throw new Error('A autenticação exige HTTPS. Configure certificados válidos para a aplicação e a API.');
  }
};

export const sessionRequest = async (path, options = {}) => {
  assertSecureProductionTransport();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw Object.assign(new Error('Sessão inválida ou expirada.'), { status: 401 });
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${data.session.access_token}`);
  let response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/session${path}`, { ...options, headers, credentials: 'omit' });
  } catch (error) {
    if (error.code === 'REQUEST_TIMEOUT' || error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar à API. Tente novamente.', { cause: error });
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || 'A API recusou a solicitação.'), {
    status: response.status, code: payload.error?.code, details: payload.error?.details || {},
  });
  return payload;
};

export const beginSupabaseChallenge = (signal) => sessionRequest('/challenge', { method: 'POST', body: '{}', signal });

export const loginWithApi = async (credentials) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email.trim(), password: credentials.senha,
  });
  if (error) {
    logSupabaseAuthFailure('password_login', error);
    if (error.code === 'invalid_credentials') {
      throw Object.assign(new Error(
        'Não foi possível autenticar. Confira o e-mail e a senha. Se você costuma entrar com Google, use essa opção ou solicite a recuperação para definir uma senha.',
      ), { code: error.code, status: error.status });
    }
    throw error;
  }
  if (!data.session) throw new Error('Confirme seu e-mail antes de entrar.');
  localStorage.removeItem('token');
  localStorage.removeItem('logado');
  try {
    return { ...(await beginSupabaseChallenge()), method: 'supabase' };
  } catch (challengeError) {
    await supabase.auth.signOut({ scope: 'local' });
    throw challengeError;
  }
};

export const verifyCodeWithApi = async (challenge) => {
  await sessionRequest('/verify', { method: 'POST', body: JSON.stringify({ challengeId: challenge.challengeId, code: challenge.code }) });
  const result = await sessionRequest('/me');
  return { authorized: true, user: { nome: result.user?.userMetadata?.full_name || result.user?.userMetadata?.name || '' } };
};

export const resendCodeWithApi = (challengeId) => sessionRequest('/resend', { method: 'POST', body: JSON.stringify({ challengeId }) });

export const cancelChallengeWithApi = async () => {
  try { await sessionRequest('/logout', { method: 'POST', body: '{}' }); }
  finally { await supabase.auth.signOut(); }
};

export const loginWithGoogle = async ({ termsAccepted } = {}) => {
  if (termsAccepted !== true) throw new Error('Aceite os Termos de Uso e a Política de Privacidade para continuar.');
  sessionStorage.setItem('arboris-google-terms-pending', '1');
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getAuthCallbackUrl('google') } });
  if (error) {
    logSupabaseAuthFailure('google_oauth_start', error);
    sessionStorage.removeItem('arboris-google-terms-pending');
    throw error;
  }
  return { redirecting: true };
};

export const registerWithApi = async (credentials) => {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email.trim(), password: credentials.senha,
    options: {
      data: {
        full_name: credentials.nome.trim(),
        terms_accepted: credentials.termosAceitos === true,
        ...(credentials.termosAceitos === true ? {
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
        } : {}),
      },
      emailRedirectTo: getEmailConfirmationUrl(),
    },
  });
  if (error) { logSupabaseAuthFailure('signup', error); throw error; }
  if (!data.session) return { requiresEmailConfirmation: true };
  return { ...(await beginSupabaseChallenge()), method: 'supabase', isNewUser: true };
};

export const requestPasswordRecovery = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getAuthCallbackUrl('recovery'),
  });
  if (error) { logSupabaseAuthFailure('password_recovery', error); throw error; }
};

export const getSessionWithApi = async (signal) => {
  const result = await sessionRequest('/me', { signal });
  const { data } = await supabase.auth.getSession();
  return { ...result, expiresAt: data.session?.expires_at };
};
export const logoutSupabaseWithApi = async () => {
  try { await sessionRequest('/logout', { method: 'POST', body: '{}' }); }
  finally { await supabase.auth.signOut(); }
};
