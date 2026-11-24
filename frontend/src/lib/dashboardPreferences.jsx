import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'arboris-visual-preferences-v1';
const FONT_SIZES = [90, 100, 110, 125, 150];
const DEFAULTS = Object.freeze({
  highContrast: false,
  fontSize: 100,
  reducedMotion: false,
  performanceMode: 'auto',
  visualAlerts: true,
  sidebarCollapsed: true,
  sidebarWidth: 252,
  alertCelsius: 32,
});

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      highContrast: saved.highContrast === true,
      fontSize: FONT_SIZES.includes(saved.fontSize) ? saved.fontSize : DEFAULTS.fontSize,
      reducedMotion: saved.reducedMotion === true,
      performanceMode: ['auto', 'balanced', 'efficient'].includes(saved.performanceMode) ? saved.performanceMode : DEFAULTS.performanceMode,
      visualAlerts: saved.visualAlerts !== false,
      sidebarCollapsed: typeof saved.sidebarCollapsed === 'boolean' ? saved.sidebarCollapsed : DEFAULTS.sidebarCollapsed,
      sidebarWidth: Number.isFinite(saved.sidebarWidth)
        ? Math.min(380, Math.max(220, saved.sidebarWidth))
        : DEFAULTS.sidebarWidth,
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

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = 'dark';
    delete root.dataset.themeMode;
    root.dataset.contrast = preferences.highContrast ? 'high' : 'normal';
    root.dataset.motion = preferences.reducedMotion ? 'reduced' : 'normal';
    root.dataset.performanceMode = preferences.performanceMode;
    if (preferences.performanceMode !== 'auto') root.dataset.performance = preferences.performanceMode;
    else {
      const touch = window.matchMedia?.('(pointer: coarse)').matches && window.matchMedia?.('(hover: none)').matches;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        || window.matchMedia?.('(prefers-reduced-data: reduce)').matches || preferences.reducedMotion;
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      root.dataset.performance = touch || reduced || connection?.saveData === true
        || (Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4)
        || (Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency <= 4) ? 'efficient' : 'full';
    }
    root.style.setProperty('--dashboard-text-scale', String(preferences.fontSize / 100));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#060f0e');
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* Storage may be unavailable. */ }
  }, [preferences]);

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
