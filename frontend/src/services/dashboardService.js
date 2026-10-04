import { apiRequest } from '../lib/api';

const createRegionQuery = (region) => {
  if (!region || region === 'Todas as regiões') return '';
  return `?regiao=${encodeURIComponent(region)}`;
};

export const getDashboardBaseData = (options = {}) => Promise.all([
  apiRequest('/dashboard/sensores?limite=100', options),
  apiRequest('/dashboard/alertas', options),
  apiRequest('/dashboard/mapa-calor', options),
]);

export const getDashboardSummary = (region, options = {}) => apiRequest(
  `/dashboard/resumo${createRegionQuery(region)}`,
  options,
);

export const getDashboardTrend = (region, period, measure, options = {}) => {
  const params = new URLSearchParams({ periodo: period, medida: measure });
  if (region && region !== 'Todas as regiões') params.set('regiao', region);
  return apiRequest(`/dashboard/tendencias?${params.toString()}`, options);
};

export const markAllDashboardAlertsAsRead = () => apiRequest('/dashboard/alertas/marcar-todas-lidas', { method: 'POST' });

export const markDashboardAlertAsRead = (alertId) => apiRequest(
  `/dashboard/alertas/${encodeURIComponent(alertId)}/lida`,
  { method: 'PATCH' },
);
