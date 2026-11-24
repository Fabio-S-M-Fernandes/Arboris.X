import { createClient } from '@supabase/supabase-js';
import { fetchWithTimeout } from './fetchWithTimeout';

const retryAfterByOperation = new Map();

const parseRetryAfter = (value) => {
  if (!value) return null;
  if (/^\d{1,5}$/.test(value)) return Math.max(1, Number(value));
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const seconds = Math.ceil((timestamp - Date.now()) / 1000);
  return seconds > 0 && seconds <= 86_400 ? seconds : null;
};

export const takeAuthRetryAfter = (operation) => {
  const expiresAt = retryAfterByOperation.get(operation);
  retryAfterByOperation.delete(operation);
  return expiresAt > Date.now() ? Math.ceil((expiresAt - Date.now()) / 1000) : null;
};

const authOperationFor = (path, init, requestUrl) => {
  if (path === '/auth/v1/recover') return 'password_recovery';
  if (path === '/auth/v1/signup') return 'signup';
  if (path === '/auth/v1/resend') return 'email_resend';
  if (path === '/auth/v1/authorize') return 'google_oauth';
  if (path === '/auth/v1/token') {
    try {
      const grantType = new URL(requestUrl).searchParams.get('grant_type')
        || JSON.parse(init?.body || '{}').grant_type;
      if (grantType === 'password') return 'password_login';
      if (grantType === 'refresh_token') return 'session_refresh';
    } catch { /* Never retain or log an unrecognized request body. */ }
  }
  return null;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const diagnosticAuthFetch = async (input, init) => {
  const requestUrl = typeof input === 'string' ? input : input.url;
  let requestPath;
  try { requestPath = new URL(requestUrl).pathname; } catch { return fetchWithTimeout(input, init); }
  const operation = authOperationFor(requestPath, init, requestUrl);
  const diagnosticRecovery = operation === 'password_recovery';
  if (diagnosticRecovery) console.info('[supabase-auth-request]', {
    operation,
    path: requestPath,
    method: init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'POST'),
  });
  try {
    const response = await fetchWithTimeout(input, init);
    if (response.status === 429 && operation) {
      const retryAfterSeconds = parseRetryAfter(response.headers.get('Retry-After'));
      if (retryAfterSeconds) {
        if (retryAfterByOperation.size >= 32) retryAfterByOperation.delete(retryAfterByOperation.keys().next().value);
        retryAfterByOperation.set(operation, Date.now() + retryAfterSeconds * 1000);
      }
    }
    if (diagnosticRecovery) console.info('[supabase-auth-response]', { operation, status: response.status });
    return response;
  } catch (error) {
    if (diagnosticRecovery && error.code === 'REQUEST_TIMEOUT') {
      console.warn('[supabase-auth-request]', { operation, outcome: 'timeout' });
      throw error;
    }
    if (diagnosticRecovery) console.warn('[supabase-auth-request]', { operation, outcome: 'network_error' });
    throw error;
  }
};

export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if (!supabaseConfigured && import.meta.env.PROD) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para autenticação.');
}

if (supabaseConfigured && import.meta.env.PROD) {
  let secureSupabaseUrl = false;
  try { secureSupabaseUrl = new URL(supabaseUrl).protocol === 'https:'; } catch { /* URL inválida. */ }
  if (window.location.protocol !== 'https:' || !secureSupabaseUrl) {
    throw new Error('A autenticação em produção exige HTTPS na aplicação e no Supabase.');
  }
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      fetch: diagnosticAuthFetch,
      flowType: 'pkce',
      persistSession: true,
      storageKey: 'arboris-supabase-auth',
    },
  })
  : null;

export const getAuthCallbackUrl = (flow = 'google') => {
  if (!['google', 'recovery', 'link'].includes(flow)) throw new Error('Fluxo de autenticação inválido.');
  return `${window.location.origin}/auth/callback?flow=${flow}`;
};

export const getEmailConfirmationUrl = () => `${window.location.origin}/auth/confirm`;
