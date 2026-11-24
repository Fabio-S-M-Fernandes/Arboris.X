try {
  const saved = JSON.parse(localStorage.getItem('arboris-visual-preferences-v1') || '{}');
  const mode = ['dark', 'light', 'auto'].includes(saved.theme) ? saved.theme : 'auto';
  const root = document.documentElement;
  root.dataset.themeMode = mode;
  root.dataset.theme = mode === 'auto'
    ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : mode;
  root.dataset.contrast = saved.highContrast === true ? 'high' : 'normal';
  root.dataset.motion = saved.reducedMotion === true ? 'reduced' : 'normal';
  root.dataset.performanceMode = ['auto', 'balanced', 'efficient'].includes(saved.performanceMode) ? saved.performanceMode : 'auto';
  root.style.setProperty('--dashboard-text-scale', String([90, 100, 110, 125, 150].includes(saved.fontSize) ? saved.fontSize / 100 : 1));
} catch {
  document.documentElement.dataset.theme = 'dark';
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
