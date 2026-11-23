export const AUTH_RETURN_TO_KEY = 'arboris-auth-return-to';

const DASHBOARD_SECTIONS = new Set([
  'overview', 'temperature', 'history', 'settings',
  'team', 'project', 'how', 'technology', 'security', 'faq', 'contact', 'quiz',
]);

export const getDashboardReturnTo = (candidate) => {
  if (typeof candidate !== 'string' || !candidate.startsWith('/')) return '/dashboard';

  try {
    const url = new URL(candidate, 'https://arboris.local');
    if (url.origin !== 'https://arboris.local' || url.pathname !== '/dashboard') return '/dashboard';
    const section = url.searchParams.get('section');
    if (section && !DASHBOARD_SECTIONS.has(section)) return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/dashboard';
  }
};

export const storeAuthReturnTo = (candidate) => {
  try { sessionStorage.setItem(AUTH_RETURN_TO_KEY, getDashboardReturnTo(candidate)); } catch { /* A sessão do navegador pode não permitir armazenamento. */ }
};

export const clearAuthReturnTo = () => {
  try { sessionStorage.removeItem(AUTH_RETURN_TO_KEY); } catch { /* Limpeza opcional. */ }
};

export const takeAuthReturnTo = () => {
  try {
    const candidate = sessionStorage.getItem(AUTH_RETURN_TO_KEY);
    sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
    return getDashboardReturnTo(candidate);
  } catch {
    return '/dashboard';
  }
};
