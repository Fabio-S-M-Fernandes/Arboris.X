import { apiRequest } from '../lib/api';

export const getCurrentUser = (options = {}) => apiRequest('/auth/me', options);
