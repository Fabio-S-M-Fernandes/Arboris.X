import { createClient } from '@supabase/supabase-js';
import { fetchWithTimeout } from './fetchWithTimeout';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const diagnosticAuthFetch = async (input, init) => {
  const requestUrl = typeof input === 'string' ? input : input.url;
  let requestPath;
  try { requestPath = new URL(requestUrl).pathname; } catch { return fetchWithTimeout(input, init); }
  if (requestPath !== '/auth/v1/recover') return fetchWithTimeout(input, init);

  console.info('[supabase-auth-request]', {
    operation: 'password_recovery',
    path: '/auth/v1/recover',
    method: init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'POST'),
  });
  try {
    const response = await fetchWithTimeout(input, init);
    console.info('[supabase-auth-response]', { operation: 'password_recovery', status: response.status });
    return response;
  } catch (error) {
    if (error.code === 'REQUEST_TIMEOUT') {
      console.warn('[supabase-auth-request]', { operation: 'password_recovery', outcome: 'timeout' });
      throw error;
    }
    console.warn('[supabase-auth-request]', { operation: 'password_recovery', outcome: 'network_error' });
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
