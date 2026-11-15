import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if (!supabaseConfigured && import.meta.env.PROD) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY para autenticação.');
}

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
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
