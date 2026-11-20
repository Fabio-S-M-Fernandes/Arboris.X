import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listTrustedDevices: vi.fn(),
  revokeTrustedDevice: vi.fn(),
  logoutSupabaseWithApi: vi.fn(),
  clearLocalAuthState: vi.fn(),
  requestTransition: vi.fn(),
  signalDestinationReady: vi.fn(),
  signOut: vi.fn(),
  linkIdentity: vi.fn(),
}));

vi.mock('../AutenticacaoArboris/AuthTransitionController', () => ({
  useAuthTransition: () => ({
    requestTransition: mocks.requestTransition,
    signalDestinationReady: mocks.signalDestinationReady,
    motionPaused: false,
  }),
}));
vi.mock('../BootGate', () => ({ useScreenReady: () => {} }));
vi.mock('../../lib/api', () => ({
  listTrustedDevices: mocks.listTrustedDevices,
  revokeTrustedDevice: mocks.revokeTrustedDevice,
  logoutSupabaseWithApi: mocks.logoutSupabaseWithApi,
}));
vi.mock('../../lib/auth', () => ({ clearLocalAuthState: mocks.clearLocalAuthState }));
vi.mock('../../lib/supabase', () => ({
  getAuthCallbackUrl: () => 'https://example.test/auth/callback',
  supabase: { auth: { signOut: mocks.signOut, linkIdentity: mocks.linkIdentity } },
}));
vi.mock('../AutenticacaoArboris/GoogleSignInButton', () => ({
  default: () => <button type="button">Vincular Google</button>,
}));

import DashboardPage from './DashboardPage';
import { DashboardPreferencesProvider } from '../../lib/dashboardPreferences';

const sessionUser = {
  id: 'user-1',
  email: 'pessoa@example.com',
  userMetadata: { full_name: 'Pessoa Arboris' },
  googleLinked: false,
};

describe('Dashboard', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem('arboris-visual-preferences-v1');
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    mocks.listTrustedDevices.mockResolvedValue({ available: false, devices: [] });
    mocks.logoutSupabaseWithApi.mockResolvedValue({});
    mocks.signOut.mockResolvedValue({});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.unstubAllGlobals();
  });

  const renderDashboard = async (initialEntry = '/dashboard') => {
    await act(async () => {
      root.render(
        <DashboardPreferencesProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage sessionUser={sessionUser} />} />
              <Route path="/login" element={<p>Login</p>} />
            </Routes>
          </MemoryRouter>
        </DashboardPreferencesProvider>,
      );
    });
  };

  it('shows an honest empty temperature state without requesting nonexistent measurements', async () => {
    await renderDashboard();
    expect(container.textContent).toContain('Nenhuma medição disponível');
    expect(container.textContent).toContain('A plataforma ainda não recebe essa leitura.');
    expect(container.textContent).toContain('Integração em preparação');
    expect(mocks.listTrustedDevices).not.toHaveBeenCalled();
  });

  it('navigates through temperature, history and account sections without leaving the protected route', async () => {
    await renderDashboard();

    await act(async () => {
      container.querySelector('a[href="/dashboard?section=temperature"]').click();
    });
    expect(container.querySelector('h1').textContent).toBe('Temperatura');
    expect(container.textContent).toContain('Nenhuma medição disponível');

    await act(async () => {
      container.querySelector('a[href="/dashboard?section=history"]').click();
    });
    expect(container.querySelector('h1').textContent).toBe('Histórico');
    expect(container.textContent).toContain('Ainda não há medições para exportar.');
    expect(container.querySelector('.dashboard-temperature-reading')).toBeNull();

    await act(async () => {
      container.querySelector('a[href="/dashboard?section=settings"]').click();
    });
    expect(container.querySelector('h1').textContent).toBe('Configurações');
    expect(container.textContent).toContain('pessoa@example.com');
    expect(mocks.listTrustedDevices).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the collapsible navigation and closes it with Escape', async () => {
    await renderDashboard();
    const toggle = container.querySelector('.dashboard-menu-toggle');

    await act(async () => { toggle.click(); });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(container.querySelector('#dashboard-navigation a'));

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(toggle);
  });

  it('offers retry with a user-safe message when account devices cannot load', async () => {
    mocks.listTrustedDevices.mockRejectedValue(new Error('internal database detail'));
    await renderDashboard('/dashboard?section=settings');
    await act(async () => { await Promise.resolve(); });

    expect(container.textContent).toContain('Não foi possível carregar os dispositivos.');
    expect(container.textContent).not.toContain('internal database detail');
    expect(container.textContent).toContain('Tentar novamente');
  });

  it('shows the provided institutional information across project sections', async () => {
    await renderDashboard();
    const visit = async (section) => act(async () => {
      container.querySelector(`a[href="/dashboard?section=${section}"]`).click();
    });

    await visit('team');
    for (const name of [
      'Amanda Costa Silva', 'Fábio Fernandes', 'Thaís Vitória', 'Victor Guimarães',
      'Victor Salomão', 'Bruna Ester', 'Izzy Souza', 'Walter Santos', 'Adriana Aguiar',
    ]) {
      expect(container.textContent).toContain(name);
    }
    expect(container.textContent).toContain('FUNEC Riacho');
    expect(container.textContent).toContain('Função em definição');

    await visit('project');
    expect(container.textContent).toContain('ilhas de calor urbanas');
    expect(container.textContent).toContain('projeto educacional');

    await visit('how');
    expect(container.textContent).toContain('O valor é mostrado localmente');
    expect(container.textContent).toContain('Essa integração ainda não existe.');

    await visit('technology');
    for (const technology of ['React', 'Vite', 'Node.js', 'Express', 'PostgreSQL', 'Supabase Auth', 'Google OAuth']) {
      expect(container.textContent).toContain(technology);
    }

    await visit('security');
    expect(container.textContent).toContain('Recuperação de senha');
    expect(container.textContent).toContain('validação da sessão');

    await visit('faq');
    expect(container.textContent).toContain('O protótipo já envia dados para o site?');
    expect(container.textContent).toContain('Como redefinir minha senha?');
  });

  it('clears local auth state and starts the existing logout transition', async () => {
    await renderDashboard();
    await act(async () => {
      container.querySelector('.dashboard-nav__logout').click();
      await Promise.resolve();
    });

    expect(mocks.logoutSupabaseWithApi).toHaveBeenCalledOnce();
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(mocks.clearLocalAuthState).toHaveBeenCalledWith({ notify: false });
    expect(mocks.requestTransition).toHaveBeenCalledWith('/login', { direction: 'reverse', mode: 'auth' });
  });

  it('switches units without creating a measurement and persists the sidebar choice', async () => {
    await renderDashboard();
    await act(async () => { container.querySelector('.dashboard-unit-control button:last-child').click(); });
    expect(container.querySelector('.dashboard-unit-control button:last-child')).toHaveAttribute('aria-pressed', 'true');
    expect(container.querySelector('.dashboard-temperature-reading')).toBeNull();
    await act(async () => { container.querySelector('.dashboard-sidebar__collapse').click(); });
    expect(container.querySelector('.dashboard-shell')).toHaveAttribute('data-collapsed', 'true');
    expect(container.querySelector('a[href="/dashboard?section=temperature"]')).toHaveAttribute('aria-label', 'Temperatura');
    expect(JSON.parse(localStorage.getItem('arboris-visual-preferences-v1'))).toMatchObject({ unit: 'K', sidebarCollapsed: true });
  });

  it('keeps demo values visibly simulated and removes them when the demo ends', async () => {
    await renderDashboard('/dashboard?section=settings');
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === 'Iniciar demonstração').click(); });
    expect(container.textContent).toContain('MODO DEMONSTRAÇÃO — DADOS SIMULADOS');
    await act(async () => { container.querySelector('a[href="/dashboard?section=temperature"]').click(); });
    expect(container.querySelector('.dashboard-temperature-reading')).not.toBeNull();
    expect(container.querySelector('.dashboard-demo-chart')).not.toBeNull();
    await act(async () => { container.querySelector('a[href="/dashboard?section=history"]').click(); });
    expect(container.querySelectorAll('.dashboard-export-actions button[disabled]')).toHaveLength(2);
    expect(container.querySelector('.dashboard-history-table')).toBeNull();
    await act(async () => { container.querySelector('a[href="/dashboard?section=settings"]').click(); });
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === 'Encerrar demonstração').click(); });
    await act(async () => { container.querySelector('a[href="/dashboard?section=temperature"]').click(); });
    expect(container.querySelector('.dashboard-temperature-reading')).toBeNull();
    expect(container.querySelector('.dashboard-demo-chart')).toBeNull();
  });

  it('applies visual preferences and enters presentation mode without fullscreen support', async () => {
    await renderDashboard('/dashboard?section=settings');
    const theme = container.querySelector('#dashboard-theme');
    await act(async () => {
      theme.value = 'light';
      theme.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    await act(async () => { container.querySelector('.dashboard-setting-check input').click(); });
    expect(document.documentElement).toHaveAttribute('data-contrast', 'high');
    await act(async () => { container.querySelector('[aria-label="Aumentar texto"]').click(); });
    expect(JSON.parse(localStorage.getItem('arboris-visual-preferences-v1')).fontSize).toBe(110);
    await act(async () => { container.querySelector('.dashboard-header__action').click(); });
    expect(container.querySelector('.dashboard-shell')).toHaveAttribute('data-presentation', 'true');
    await act(async () => { container.querySelector('.dashboard-header__action').click(); });
    expect(container.querySelector('.dashboard-shell')).toHaveAttribute('data-presentation', 'false');
  });

  it('labels a threshold crossing as demonstrative and keeps the threshold in Celsius', async () => {
    await renderDashboard('/dashboard?section=settings');
    const threshold = container.querySelector('#dashboard-alert-threshold');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(threshold, '25');
      threshold.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { container.querySelector('.dashboard-setting-form button').click(); });
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === 'Iniciar demonstração').click(); });
    await act(async () => { container.querySelector('a[href="/dashboard?section=temperature"]').click(); });
    expect(container.textContent).toContain('Alerta demonstrativo — temperatura simulada acima do limite.');
    expect(JSON.parse(localStorage.getItem('arboris-visual-preferences-v1')).alertCelsius).toBe(25);
  });
});
