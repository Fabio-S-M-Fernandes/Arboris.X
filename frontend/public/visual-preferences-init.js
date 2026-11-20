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
  root.style.setProperty('--dashboard-text-scale', String([90, 100, 110, 125, 150].includes(saved.fontSize) ? saved.fontSize / 100 : 1));
} catch {
  document.documentElement.dataset.theme = 'dark';
}
