export const clearLocalAuthState = ({ notify = true } = {}) => {
  localStorage.removeItem('logado');
  localStorage.removeItem('token');
  localStorage.removeItem('termsAccepted');
  if (notify) window.dispatchEvent(new Event('arboris-session-change'));
};
