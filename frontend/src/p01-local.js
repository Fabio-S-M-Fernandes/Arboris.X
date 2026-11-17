import { supabase, supabaseConfigured } from './lib/supabase';
import { fetchWithTimeout } from './lib/fetchWithTimeout';

const allowedAccounts = new Map([
  ['12dc7118b779c97c3bff28104024d104b465dd3cc7d1ff808e6a0c154f0a9ace', 'A'],
  ['30f6f59336f6edbca4108afd09572f620213cc1edc05321a9dbb090da2e31c09', 'B'],
]);
const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const result = document.querySelector('#result');
let captured = null;

const show = (summary) => { result.textContent = JSON.stringify(summary, null, 2); };
const fail = () => show({ resultado: 'inconclusivo', motivo: 'Falha de conexão ou sessão indisponível.' });

const accountLabel = async (email) => {
  const bytes = new TextEncoder().encode(String(email || '').trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return allowedAccounts.get(hex) || null;
};

const currentTestSession = async () => {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase indisponível.');
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Sem identidade Supabase.');
  const account = await accountLabel(userData.user.email);
  if (!account) throw new Error('Conta fora do conjunto de teste.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) throw new Error('Sem sessão Supabase.');
  return { account, userId: userData.user.id, session: sessionData.session };
};

const readApis = async (token, userId) => {
  const headers = { Authorization: `Bearer ${token}` };
  const [express, dataApi] = await Promise.all([
    fetchWithTimeout(`${apiBase}/session/me`, { headers, credentials: 'omit' }),
    fetchWithTimeout(`${supabase.supabaseUrl}/rest/v1/profiles?select=id`, {
      headers: { ...headers, apikey: supabase.supabaseKey }, credentials: 'omit',
    }),
  ]);
  const rows = await dataApi.json().catch(() => null);
  const profiles = Array.isArray(rows) ? rows : null;
  return {
    express: express.status,
    dataApi: dataApi.status,
    perfis: profiles?.length ?? null,
    perfisDeOutroUsuario: profiles ? profiles.filter((row) => row.id !== userId).length : null,
  };
};

const classifyRead = (phase, values) => {
  if (values.perfisDeOutroUsuario > 0) return 'falha de isolamento';
  if (phase === 'before' && values.express === 403
    && ((values.dataApi === 200 && values.perfis === 0)
      || [401, 403].includes(values.dataApi))) return 'bloqueado antes do OTP';
  if (phase === 'after' && values.express === 200 && values.dataApi === 200
    && values.perfis === 1 && values.perfisDeOutroUsuario === 0) return 'autorizado e isolado';
  return 'inconclusivo';
};

const run = async (button, handler) => {
  button.disabled = true;
  try { await handler(); } catch { fail(); } finally { button.disabled = false; }
};

document.querySelector('#read').addEventListener('click', (event) => run(event.currentTarget, async () => {
  const { account, userId, session } = await currentTestSession();
  const phase = document.querySelector('#phase').value;
  const values = await readApis(session.access_token, userId);
  show({ conta: account, fase: phase === 'before' ? 'antes do OTP' : 'após o OTP',
    ...values, isolamento: classifyRead(phase, values) });
}));

document.querySelector('#capture').addEventListener('click', (event) => run(event.currentTarget, async () => {
  const { account, userId, session } = await currentTestSession();
  const values = await readApis(session.access_token, userId);
  if (classifyRead('after', values) !== 'autorizado e isolado') {
    show({ conta: account, ...values, captura: 'recusada: confirme o OTP e o isolamento primeiro' });
    return;
  }
  captured = { account, userId, token: session.access_token, expiresAt: session.expires_at };
  show({ conta: account, ...values, captura: 'pronta; clique em Sair na outra aba' });
}));

document.querySelector('#revoked').addEventListener('click', (event) => run(event.currentTarget, async () => {
  if (!captured) { show({ resultado: 'inconclusivo', motivo: 'Capture a sessão de teste antes do logout.' }); return; }
  const previous = captured;
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    show({ conta: previous.account, resultado: 'inconclusivo', motivo: 'A sessão local ainda existe. Clique em Sair na aplicação.' });
    return;
  }
  captured = null;
  if (!Number.isFinite(previous.expiresAt) || previous.expiresAt <= Date.now() / 1000) {
    show({ conta: previous.account, resultado: 'inconclusivo', motivo: 'O JWT expirou antes da verificação.' });
    return;
  }
  const values = await readApis(previous.token, previous.userId);
  const blocked = [401, 403].includes(values.express)
    && ((values.dataApi === 200 && values.perfis === 0) || [401, 403].includes(values.dataApi));
  show({ conta: previous.account, ...values,
    revogacao: values.perfisDeOutroUsuario > 0 || values.perfis > 0 || values.express === 200
      ? 'falha: JWT antigo ainda acessa dados'
      : blocked ? 'JWT antigo bloqueado nas duas APIs' : 'inconclusivo' });
}));

document.querySelector('#discard').addEventListener('click', () => {
  captured = null;
  show({ captura: 'descartada' });
});

if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  document.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  show({ resultado: 'indisponível fora do ambiente local' });
}
