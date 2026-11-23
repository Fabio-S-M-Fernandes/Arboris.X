const parseDuration = (value) => {
  const match = String(value).trim().match(/^([\d.]+)(ms|s)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount * (match[2].toLowerCase() === 's' ? 1000 : 1) : null;
};

export const getMotionDuration = (token, fallback = 0) => {
  if (typeof window === 'undefined') return fallback;
  const reducedByPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reducedByPreference || document.documentElement.dataset.motion === 'reduced') return 0;

  const configured = getComputedStyle(document.documentElement).getPropertyValue(token);
  return parseDuration(configured) ?? fallback;
};
