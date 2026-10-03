const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');

export const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('Não foi possível conectar à API. Inicie o backend na porta 3001.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'A API recusou a solicitação.');
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

export const registerWithApi = (credentials) => apiRequest('/auth/register', {
  method: 'POST',
  body: JSON.stringify(credentials),
});
