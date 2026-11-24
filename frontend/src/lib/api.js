import { getAuthCallbackUrl, getEmailConfirmationUrl, supabase, takeAuthRetryAfter } from './supabase';
import { fetchWithTimeout } from './fetchWithTimeout';

const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '')).replace(/\/$/, '');

const attachRetryAfter = (error, operation) => {
  if (error?.status !== 429) return error;
  const retryAfterSeconds = takeAuthRetryAfter(operation);
  return Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0
    ? Object.assign(error, { retryAfterSeconds }) : error;
};

const parseRetryAfter = (value) => {
  if (!value) return null;
  if (/^\d{1,5}$/.test(value)) return Math.max(1, Number(value));
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const seconds = Math.ceil((timestamp - Date.now()) / 1000);
  return seconds > 0 && seconds <= 86_400 ? seconds : null;
};

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
  const { sessionSnapshot, ...requestOptions } = options;
  const { data, error } = sessionSnapshot
    ? { data: { session: sessionSnapshot }, error: null }
    : await supabase.auth.getSession();
  if (error) throw attachRetryAfter(error, 'session_refresh');
  if (!data.session?.access_token) throw Object.assign(new Error('Sessão inválida ou expirada.'), { status: 401 });
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${data.session.access_token}`);
  let response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}/session${path}`, { ...requestOptions, headers, credentials: 'include' });
  } catch (error) {
    if (error.code === 'REQUEST_TIMEOUT' || error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar à API. Tente novamente.', { cause: error });
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || 'A API recusou a solicitação.'), {
    status: response.status, code: payload.error?.code, details: payload.error?.details || {},
    ...(response.status === 429 && parseRetryAfter(response.headers.get('Retry-After'))
      ? { retryAfterSeconds: parseRetryAfter(response.headers.get('Retry-After')) } : {}),
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
      throw Object.assign(new Error('Não foi possível localizar uma conta com esses dados. Confira se o e-mail está correto e se a senha corresponde.'), { code: error.code, status: error.status });
    }
    throw attachRetryAfter(error, 'password_login');
  }
  if (!data.session) throw new Error('Confirme seu e-mail antes de entrar.');
  localStorage.removeItem('token');
  localStorage.removeItem('logado');
  // A falha do desafio não invalida a identidade Supabase. O acesso continua
  // bloqueado pelo backend e a mesma sessão pode tentar novamente.
  return { ...(await beginSupabaseChallenge()), method: 'supabase' };
};

export const verifyCodeWithApi = async (challenge) => {
  const verified = await sessionRequest('/verify', { method: 'POST', body: JSON.stringify({
    challengeId: challenge.challengeId, code: challenge.code, trustDevice: challenge.trustDevice === true,
  }) });
  const result = await sessionRequest('/me');
  return { authorized: true, trustedDeviceRegistered: verified.trustedDeviceRegistered === true,
    user: { nome: result.user?.userMetadata?.full_name || result.user?.userMetadata?.name || '' } };
};

export const resendCodeWithApi = (challengeId) => sessionRequest('/resend', { method: 'POST', body: JSON.stringify({ challengeId }) });

export const cancelChallengeWithApi = async () => {
  try { await sessionRequest('/logout', { method: 'POST', body: '{}' }); }
  finally { await supabase.auth.signOut(); }
};

export const loginWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getAuthCallbackUrl('google') } });
  if (error) {
    logSupabaseAuthFailure('google_oauth_start', error);
    throw attachRetryAfter(error, 'google_oauth');
  }
  return { redirecting: true };
};

export const registerWithApi = async (credentials) => {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email.trim(), password: credentials.senha,
    options: {
      data: {
        full_name: credentials.nome.trim(),
      },
      emailRedirectTo: getEmailConfirmationUrl(),
    },
  });
  if (error) { logSupabaseAuthFailure('signup', error); throw attachRetryAfter(error, 'signup'); }
  if (!data.session) return { requiresEmailConfirmation: true };
  if (!data.user?.email_confirmed_at && !data.user?.confirmed_at) {
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    if (signOutError) throw signOutError;
    return { requiresEmailConfirmation: true };
  }
  return { requiresAccountConsent: true, isNewUser: true };
};

export const requestPasswordRecovery = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: getAuthCallbackUrl('recovery'),
  });
  if (error) { logSupabaseAuthFailure('password_recovery', error); throw attachRetryAfter(error, 'password_recovery'); }
};

export const getSessionWithApi = async (signal, sessionSnapshot) => {
  const { data, error } = sessionSnapshot
    ? { data: { session: sessionSnapshot }, error: null }
    : await supabase.auth.getSession();
  if (error) throw attachRetryAfter(error, 'session_refresh');
  if (!data.session?.access_token) throw Object.assign(new Error('Sessão inválida ou expirada.'), { status: 401 });
  const result = await sessionRequest('/me', { signal, sessionSnapshot: data.session });
  return { ...result, expiresAt: data.session.expires_at };
};
export const logoutSupabaseWithApi = async () => {
  try { await sessionRequest('/logout', { method: 'POST', body: '{}' }); }
  finally { await supabase.auth.signOut(); }
};

export const listTrustedDevices = (signal) => sessionRequest('/trusted-devices', { signal });
export const revokeTrustedDevice = (id) => sessionRequest(`/trusted-devices/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const sendContactMessage = (fields) => sessionRequest('/contact', { method: 'POST', body: JSON.stringify(fields) });
export const getConsentStatus = (signal) => sessionRequest('/consent', { signal });
export const acceptConsent = (optionalCookiesAccepted) => sessionRequest('/consent', {
  method: 'POST', body: JSON.stringify({ termsAccepted: true, privacyAccepted: true, optionalCookiesAccepted }),
});
export const declineConsent = () => sessionRequest('/consent', { method: 'DELETE' });
