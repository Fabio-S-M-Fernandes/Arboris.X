import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'arboris-visual-preferences-v1';
const FONT_SIZES = [90, 100, 110, 125, 150];
const DEFAULTS = Object.freeze({
  theme: 'auto',
  highContrast: false,
  fontSize: 100,
  reducedMotion: false,
  sidebarCollapsed: false,
  unit: 'C',
  alertCelsius: 32,
});

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      theme: ['dark', 'light', 'auto'].includes(saved.theme) ? saved.theme : DEFAULTS.theme,
      highContrast: saved.highContrast === true,
      fontSize: FONT_SIZES.includes(saved.fontSize) ? saved.fontSize : DEFAULTS.fontSize,
      reducedMotion: saved.reducedMotion === true,
      sidebarCollapsed: saved.sidebarCollapsed === true,
      unit: ['C', 'F', 'K'].includes(saved.unit) ? saved.unit : DEFAULTS.unit,
      alertCelsius: Number.isFinite(saved.alertCelsius) && saved.alertCelsius >= -50 && saved.alertCelsius <= 100
        ? saved.alertCelsius : DEFAULTS.alertCelsius,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

const PreferencesContext = createContext(null);

export function DashboardPreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [systemLight, setSystemLight] = useState(() => window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!query) return undefined;
    const update = () => setSystemLight(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preferences.theme === 'auto' ? (systemLight ? 'light' : 'dark') : preferences.theme;
    root.dataset.themeMode = preferences.theme;
    root.dataset.contrast = preferences.highContrast ? 'high' : 'normal';
    root.dataset.motion = preferences.reducedMotion ? 'reduced' : 'normal';
    root.style.setProperty('--dashboard-text-scale', String(preferences.fontSize / 100));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', root.dataset.theme === 'light' || preferences.highContrast ? '#edf2ec' : '#060f0e');
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Storage may be unavailable. */ }
  }, [preferences, systemLight]);

  const updatePreference = useCallback((name, value) => {
    if (!(name in DEFAULTS)) return;
    setPreferences((current) => ({ ...current, [name]: value }));
  }, []);

  const value = useMemo(() => ({
    preferences,
    updatePreference,
    restoreDefaults: () => setPreferences({ ...DEFAULTS }),
    fontSizes: FONT_SIZES,
  }), [preferences, updatePreference]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

// O hook e o provider compartilham o mesmo contexto; manter juntos evita estado duplicado.
// eslint-disable-next-line react-refresh/only-export-components
export function useDashboardPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('DashboardPreferencesProvider não encontrado');
  return context;
}
