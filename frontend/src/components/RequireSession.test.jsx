import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSessionWithApi: vi.fn(),
  beginSupabaseChallenge: vi.fn(),
  onAuthStateChange: vi.fn(),
  signalDestinationReady: vi.fn(),
  cancelTransition: vi.fn(),
  setVerificationActive: vi.fn(),
  clearLocalAuthState: vi.fn(),
  authCallback: null,
}));

vi.mock('./BootGate', () => ({ useScreenReady: () => {} }));
vi.mock('./AutenticacaoArboris/AuthTransitionController', () => ({
  useAuthTransition: () => ({ signalDestinationReady: mocks.signalDestinationReady,
    cancelTransition: mocks.cancelTransition,
    setVerificationActive: mocks.setVerificationActive }),
}));
vi.mock('../lib/api', () => ({
  getSessionWithApi: mocks.getSessionWithApi,
  beginSupabaseChallenge: mocks.beginSupabaseChallenge,
}));
vi.mock('../lib/auth', () => ({ clearLocalAuthState: mocks.clearLocalAuthState }));
vi.mock('../lib/supabase', () => ({
  supabase: { auth: {
    getSession: mocks.getSession,
    onAuthStateChange: mocks.onAuthStateChange,
    signOut: vi.fn(),
  } },
}));

import RequireSession from './RequireSession';

const session = (id) => ({
  user: { id: 'test-user' },
  access_token: `header.${btoa(JSON.stringify({ session_id: id }))}.signature`,
});

describe('Dashboard session guard', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    mocks.onAuthStateChange.mockImplementation((callback) => {
      mocks.authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the authorized screen mounted during same-session refresh and hides it for a new session', async () => {
    let currentSession = session('session-a');
    mocks.getSession.mockImplementation(async () => ({ data: { session: currentSession }, error: null }));
    mocks.getSessionWithApi.mockResolvedValueOnce({
      user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    await act(async () => { root.render(<RequireSession><div data-testid="dashboard" /></RequireSession>); });
    const dashboard = container.querySelector('[data-testid="dashboard"]');
    expect(dashboard).not.toBeNull();

    let resolveRefresh;
    mocks.getSessionWithApi.mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve; }));
    await act(async () => {
      mocks.authCallback('TOKEN_REFRESHED', currentSession);
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(container.querySelector('[data-testid="dashboard"]')).toBe(dashboard);

    await act(async () => {
      resolveRefresh({ user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600 });
    });

    currentSession = session('session-b');
    mocks.getSessionWithApi.mockImplementationOnce(() => new Promise(() => {}));
    await act(async () => {
      mocks.authCallback('SIGNED_IN', currentSession);
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.textContent).not.toContain('Confirmando seu acesso');
    expect(mocks.setVerificationActive).toHaveBeenLastCalledWith(true);
  });

  it('opens the dashboard after a trusted device authorizes the current Supabase session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('trusted-session') }, error: null });
    mocks.getSessionWithApi
      .mockRejectedValueOnce({ status: 403 })
      .mockResolvedValueOnce({ user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600 });
    mocks.beginSupabaseChallenge.mockResolvedValue({ authorized: true, trustedDevice: true });

    await act(async () => { root.render(<RequireSession><div data-testid="dashboard" /></RequireSession>); });
    expect(mocks.beginSupabaseChallenge).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="dashboard"]')).not.toBeNull();
    expect(mocks.setVerificationActive).toHaveBeenLastCalledWith(false);
  });

  it('cancels a pending welcome on authorization failure and keeps the dashboard closed', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('offline-session') }, error: null });
    mocks.getSessionWithApi.mockRejectedValue({ status: 503 });
    await act(async () => { root.render(<RequireSession><div data-testid="dashboard" /></RequireSession>); });
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull();
    expect(container.textContent).toContain('Não foi possível confirmar');
    expect(mocks.cancelTransition).toHaveBeenCalled();
    expect(mocks.signalDestinationReady).not.toHaveBeenCalled();
  });

  it('redirects a direct unauthenticated visit without rendering the dashboard', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard']}>
        <RequireSession><div data-testid="dashboard" /></RequireSession>
      </MemoryRouter>);
    });
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull();
    expect(mocks.getSessionWithApi).not.toHaveBeenCalled();
    expect(mocks.cancelTransition).toHaveBeenCalled();
  });

  it('cancels a pending transition when the test session signs out', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('pending-session') }, error: null });
    mocks.getSessionWithApi.mockImplementation(() => new Promise(() => {}));
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard']}>
        <RequireSession><div data-testid="dashboard" /></RequireSession>
      </MemoryRouter>);
    });
    await act(async () => { mocks.authCallback('SIGNED_OUT', null); });
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull();
    expect(mocks.cancelTransition).toHaveBeenCalled();
  });
});
