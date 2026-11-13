const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '')).replace(/\/$/, '');

const assertSecureProductionTransport = () => {
  if (!import.meta.env.PROD) return;
  if (!API_BASE_URL) throw new Error('Configure VITE_API_URL com a URL HTTPS da API para produção.');
  const apiProtocol = new URL(API_BASE_URL, window.location.origin).protocol;
  if (window.location.protocol !== 'https:' || apiProtocol !== 'https:') {
    throw new Error('A autenticação exige HTTPS. Configure certificados válidos para a aplicação e a API.');
  }
};

export const apiRequest = async (path, options = {}) => {
  assertSecureProductionTransport();
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar à API. Inicie o backend na porta 3001.', { cause: error });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'A API recusou a solicitação.');
    error.code = payload.error?.code;
    error.details = payload.error?.details || {};
    error.status = response.status;
    throw error;
  }

  return payload;
};

export const loginWithApi = (credentials) => apiRequest('/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const verifyCodeWithApi = (challenge) => apiRequest('/auth/verify', {
  method: 'POST',
  body: JSON.stringify(challenge),
});

export const resendCodeWithApi = (challengeId) => apiRequest('/auth/resend', {
  method: 'POST',
  body: JSON.stringify({ challengeId }),
});

export const cancelChallengeWithApi = (challengeId) => apiRequest('/auth/cancel', {
  method: 'POST',
  body: JSON.stringify({ challengeId }),
});

export const requestGoogleNonce = () => apiRequest('/auth/google/nonce', {
  method: 'POST',
  body: JSON.stringify({}),
});

export const loginWithGoogle = (credential) => apiRequest('/auth/google', {
  method: 'POST',
  body: JSON.stringify(credential),
});

export const linkGoogleAccount = (credential) => apiRequest('/auth/google/link', {
  method: 'POST',
  body: JSON.stringify(credential),
});

export const registerWithApi = (credentials) => apiRequest('/auth/register', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const getSessionWithApi = (signal) => apiRequest('/auth/me', { signal });
export const logoutWithApi = (token) => apiRequest('/auth/logout', {
  method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
});
