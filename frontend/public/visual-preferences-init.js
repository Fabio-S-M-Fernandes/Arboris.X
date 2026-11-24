const STORAGE_KEY = 'arboris-visual-preferences-v1';
const root = document.documentElement;

root.dataset.theme = 'dark';
delete root.dataset.themeMode;

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const preferences = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  if (Object.prototype.hasOwnProperty.call(preferences, 'theme')) {
    const migrated = { ...preferences };
    delete migrated.theme;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  }
  root.dataset.contrast = preferences.highContrast === true ? 'high' : 'normal';
  root.dataset.motion = preferences.reducedMotion === true ? 'reduced' : 'normal';
  root.dataset.performanceMode = ['auto', 'balanced', 'efficient'].includes(preferences.performanceMode) ? preferences.performanceMode : 'auto';
  root.style.setProperty('--dashboard-text-scale', String([90, 100, 110, 125, 150].includes(preferences.fontSize) ? preferences.fontSize / 100 : 1));
} catch {
  root.dataset.contrast = 'normal';
  root.dataset.motion = 'normal';
  root.dataset.performanceMode = 'auto';
  root.style.setProperty('--dashboard-text-scale', '1');
}

try {
  const root = document.documentElement;
  const media = [
    matchMedia('(pointer: coarse)'),
    matchMedia('(hover: none)'),
    matchMedia('(prefers-reduced-motion: reduce)'),
    matchMedia('(prefers-reduced-data: reduce)'),
  ];
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const updatePerformanceMode = () => {
    if (root.dataset.performanceMode === 'balanced' || root.dataset.performanceMode === 'efficient') {
      root.dataset.performance = root.dataset.performanceMode;
      return;
    }
    const touchDevice = media[0].matches && media[1].matches;
    const reducedMotion = media[2].matches || root.dataset.motion === 'reduced';
    const reducedData = media[3].matches || connection?.saveData === true;
    const limitedMemory = Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4;
    const limitedCores = Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 4;
    root.dataset.performance = touchDevice || reducedMotion || reducedData || limitedMemory || limitedCores
      ? 'efficient'
      : 'full';
  };

  updatePerformanceMode();
  media.forEach((query) => query.addEventListener?.('change', updatePerformanceMode));
  connection?.addEventListener?.('change', updatePerformanceMode);
} catch {
  document.documentElement.dataset.performance = 'efficient';
}
