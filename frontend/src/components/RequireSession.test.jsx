import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  getSessionWithApi: vi.fn(),
  beginSupabaseChallenge: vi.fn(),
  onAuthStateChange: vi.fn(),
  signalDestinationReady: vi.fn(),
  cancelTransition: vi.fn(),
  setVerificationActive: vi.fn(),
  clearLocalAuthState: vi.fn(),
  takeAuthRetryAfter: vi.fn(() => null),
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
  takeAuthRetryAfter: mocks.takeAuthRetryAfter,
  supabase: { auth: {
    getSession: mocks.getSession,
    onAuthStateChange: mocks.onAuthStateChange,
    signOut: mocks.signOut,
  } },
}));

import RequireSession from './RequireSession';

function RedirectProbe() {
  const location = useLocation();
  return <output data-testid="redirect-location">{`${location.pathname}${location.search}|${location.state?.from || ''}`}</output>;
}

function CurrentRouteProbe() {
  const location = useLocation();
  return <output data-testid="current-route">{`${location.pathname}${location.search}`}</output>;
}

const session = (id) => ({
  user: { id: 'test-user' },
  access_token: `header.${btoa(JSON.stringify({ session_id: id }))}.signature`,
});

describe('Dashboard session guard', () => {
  let container;
  let root;
  let hiddenDescriptor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
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
    localStorage.removeItem('token');
    container.remove();
    if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
    else delete document.hidden;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the authorized screen mounted during same-session refresh and hides it for a new session', async () => {
    let currentSession = session('session-a');
    mocks.getSession.mockImplementation(async () => ({ data: { session: currentSession }, error: null }));
    mocks.getSessionWithApi.mockResolvedValueOnce({
      user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    await act(async () => { root.render(<MemoryRouter initialEntries={['/dashboard']}><RequireSession><div data-testid="dashboard" /></RequireSession></MemoryRouter>); });
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
    expect(container.textContent).toContain('Confirmando seu acesso');
    expect(mocks.setVerificationActive).toHaveBeenLastCalledWith(true);
  });

  it('opens the dashboard after a trusted device authorizes the current Supabase session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('trusted-session') }, error: null });
    mocks.getSessionWithApi
      .mockRejectedValueOnce({ status: 403 })
      .mockResolvedValueOnce({ user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600 });
    mocks.beginSupabaseChallenge.mockResolvedValue({ authorized: true, trustedDevice: true });

    await act(async () => { root.render(<MemoryRouter initialEntries={['/dashboard']}><RequireSession><div data-testid="dashboard" /></RequireSession></MemoryRouter>); });
    expect(mocks.beginSupabaseChallenge).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="dashboard"]')).not.toBeNull();
    expect(mocks.setVerificationActive).toHaveBeenLastCalledWith(false);
  });

  it('avoids routine session polls on tab return and revalidates after five idle minutes', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('idle-session') }, error: null });
    mocks.getSessionWithApi.mockResolvedValue({ user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600 });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });

    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard?section=quiz']}><RequireSession><div data-testid="dashboard">Quiz</div></RequireSession></MemoryRouter>);
    });
    expect(mocks.getSessionWithApi).toHaveBeenCalledOnce();

    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(mocks.getSessionWithApi).toHaveBeenCalledOnce();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000 + 1);
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mocks.getSessionWithApi).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-testid="dashboard"]')).not.toBeNull();
  });

  it('ignores storage changes from quiz and visual preferences', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('storage-session') }, error: null });
    mocks.getSessionWithApi.mockResolvedValue({ user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600 });
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard?section=quiz']}><RequireSession><div data-testid="dashboard" /></RequireSession></MemoryRouter>);
    });
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'arboris-eco-quiz:v1:test-user' }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'arboris-visual-preferences-v1' }));
    });
    expect(mocks.getSessionWithApi).toHaveBeenCalledOnce();
    await act(async () => { window.dispatchEvent(new StorageEvent('storage', { key: 'arboris-supabase-auth' })); });
    expect(mocks.getSessionWithApi).toHaveBeenCalledTimes(2);
  });

  it('does not issue another challenge while the current verification is pending', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('pending-challenge') }, error: null });
    mocks.getSessionWithApi.mockRejectedValueOnce({ status: 403 });
    let releaseChallenge;
    mocks.beginSupabaseChallenge.mockReturnValue(new Promise((resolve) => { releaseChallenge = resolve; }));

    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard']}><Routes>
        <Route path="/dashboard" element={<RequireSession><div data-testid="dashboard" /></RequireSession>} />
        <Route path="/login" element={<div data-testid="login" />} />
      </Routes></MemoryRouter>);
    });
    expect(mocks.beginSupabaseChallenge).toHaveBeenCalledOnce();

    await act(async () => {
      window.dispatchEvent(new Event('arboris-session-change'));
      document.dispatchEvent(new Event('visibilitychange'));
      mocks.authCallback('TOKEN_REFRESHED', session('pending-challenge'));
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(mocks.beginSupabaseChallenge).toHaveBeenCalledOnce();

    await act(async () => {
      releaseChallenge({ challengeId: 'challenge-1', method: 'email' });
      await Promise.resolve();
    });
    expect(mocks.beginSupabaseChallenge).toHaveBeenCalledOnce();
  });

  it('honors the server Retry-After before retrying session verification', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('rate-limited-session') }, error: null });
    mocks.getSessionWithApi.mockRejectedValue({ status: 429, retryAfterSeconds: 30 });

    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard']}>
        <RequireSession><div data-testid="dashboard" /></RequireSession>
      </MemoryRouter>);
    });

    const retryButton = container.querySelector('button');
    expect(retryButton.disabled).toBe(true);
    expect(retryButton.textContent).toContain('Aguarde 30s');
    expect(mocks.getSessionWithApi).toHaveBeenCalledOnce();

    await act(async () => {
      window.dispatchEvent(new Event('arboris-session-change'));
      document.dispatchEvent(new Event('visibilitychange'));
      mocks.authCallback('TOKEN_REFRESHED', session('rate-limited-session'));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(container.querySelector('button').disabled).toBe(true);
    expect(container.querySelector('button').textContent).toContain('Aguarde 29s');
    expect(mocks.getSessionWithApi).toHaveBeenCalledOnce();
  });

  it('keeps a Supabase rate limit recoverable without treating it as an invalid session', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: { status: 429, retryAfterSeconds: 30 } });

    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard?section=quiz']}>
        <RequireSession><div data-testid="dashboard" /></RequireSession>
      </MemoryRouter>);
    });

    expect(container.querySelector('button')?.disabled).toBe(true);
    expect(container.textContent).toContain('Aguarde 30s');
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull();
    expect(mocks.getSessionWithApi).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('confirms Supabase Auth before rejecting an obsolete browser token', async () => {
    localStorage.setItem('token', 'obsolete-token');
    const currentSession = session('current-session');
    mocks.getSession.mockResolvedValue({ data: { session: currentSession }, error: null });
    mocks.getSessionWithApi.mockResolvedValue({ user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600 });

    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard?section=history']}>
        <RequireSession><div data-testid="dashboard" /></RequireSession>
      </MemoryRouter>);
    });

    expect(mocks.clearLocalAuthState).toHaveBeenCalledWith({ notify: false });
    expect(mocks.getSession).toHaveBeenCalledOnce();
    expect(mocks.getSessionWithApi).toHaveBeenCalledOnce();
    expect(mocks.getSessionWithApi).toHaveBeenCalledWith(expect.any(AbortSignal), currentSession);
    expect(container.querySelector('[data-testid="dashboard"]')).not.toBeNull();
  });

  it('recovers a temporary API outage when returning to the tab without losing the dashboard route', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('offline-session') }, error: null });
    mocks.getSessionWithApi
      .mockRejectedValueOnce({ status: 503 })
      .mockRejectedValueOnce({ status: 503 })
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValue({ user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600 });
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => {
      root.render(<MemoryRouter initialEntries={['/dashboard?section=quiz']}><RequireSession><div data-testid="dashboard">Quiz <CurrentRouteProbe /></div></RequireSession></MemoryRouter>);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull();
    expect(container.textContent).toContain('Tentar novamente');
    expect(mocks.getSessionWithApi).toHaveBeenCalledTimes(3);
    expect(mocks.cancelTransition).toHaveBeenCalled();
    expect(mocks.signalDestinationReady).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.clearLocalAuthState).not.toHaveBeenCalled();
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mocks.getSessionWithApi).toHaveBeenCalledTimes(4);
    expect(container.querySelector('[data-testid="dashboard"]')).not.toBeNull();
    expect(container.textContent).toContain('Quiz');
    expect(container.querySelector('[data-testid="current-route"]')).toHaveTextContent('/dashboard?section=quiz');
    if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
    else delete document.hidden;
  });

  it('ends a hung Supabase session read with a recoverable retry state', async () => {
    mocks.getSession
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValue({ data: { session: session('recovered-session') }, error: null });
    mocks.getSessionWithApi.mockResolvedValue({ user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600 });

    act(() => {
      root.render(<MemoryRouter initialEntries={['/dashboard?section=quiz']}>
        <RequireSession><div data-testid="dashboard">Quiz <CurrentRouteProbe /></div></RequireSession>
      </MemoryRouter>);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(26_000);
    });
    expect(container.textContent).toContain('Tentar novamente');
    expect(mocks.signOut).not.toHaveBeenCalled();

    await act(async () => {
      container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(container.querySelector('[data-testid="dashboard"]')).not.toBeNull();
    expect(container.textContent).toContain('Quiz');
    expect(container.querySelector('[data-testid="current-route"]')).toHaveTextContent('/dashboard?section=quiz');
  });

  it('waits for the session check and preserves a deep Dashboard destination at login', async () => {
    let resolveSession;
    mocks.getSession.mockReturnValue(new Promise((resolve) => { resolveSession = resolve; }));
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard?section=history']}>
        <Routes>
          <Route path="/dashboard" element={<RequireSession><div data-testid="dashboard" /></RequireSession>} />
          <Route path="/login" element={<RedirectProbe />} />
        </Routes>
      </MemoryRouter>);
    });
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="redirect-location"]')).toBeNull();

    await act(async () => { resolveSession({ data: { session: null }, error: null }); });
    expect(container.querySelector('[data-testid="redirect-location"]')).toHaveTextContent('/login|/dashboard?section=history');
    expect(mocks.getSessionWithApi).not.toHaveBeenCalled();
    expect(mocks.cancelTransition).toHaveBeenCalled();
  });

  it('keeps the deep destination when the guard requires an additional OTP challenge', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('otp-session') }, error: null });
    mocks.getSessionWithApi.mockRejectedValue({ status: 403 });
    mocks.beginSupabaseChallenge.mockResolvedValue({ challengeId: 'challenge-1', method: 'email' });

    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard?section=temperature']}>
        <Routes>
          <Route path="/dashboard" element={<RequireSession><div data-testid="dashboard" /></RequireSession>} />
          <Route path="/login" element={<RedirectProbe />} />
        </Routes>
      </MemoryRouter>);
    });

    expect(container.querySelector('[data-testid="redirect-location"]')).toHaveTextContent('/login|/dashboard?section=temperature');
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull();
  });

  it('sends a pending new account to consent with the requested section intact', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('consent-session') }, error: null });
    mocks.getSessionWithApi.mockRejectedValue({ status: 403, code: 'TERMS_REQUIRED' });
    mocks.beginSupabaseChallenge.mockRejectedValue({ status: 403, code: 'TERMS_REQUIRED' });
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard?section=history']}><Routes>
        <Route path="/dashboard" element={<RequireSession><div data-testid="dashboard" /></RequireSession>} />
        <Route path="/consentimento" element={<RedirectProbe />} />
      </Routes></MemoryRouter>);
    });
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull();
    expect(container.querySelector('[data-testid="redirect-location"]')).toHaveTextContent('/consentimento?next=%2Fdashboard%3Fsection%3Dhistory|/dashboard?section=history');
  });

  it('closes the dashboard when Supabase signs out', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: session('signed-out-session') }, error: null });
    mocks.getSessionWithApi.mockResolvedValue({ user: { id: 'test-user' }, expiresAt: Math.floor(Date.now() / 1000) + 3600 });
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/dashboard']}><Routes>
        <Route path="/dashboard" element={<RequireSession><div data-testid="dashboard" /></RequireSession>} />
        <Route path="/login" element={<div data-testid="login" />} />
      </Routes></MemoryRouter>);
    });
    expect(container.querySelector('[data-testid="dashboard"]')).not.toBeNull();
    await act(async () => { mocks.authCallback('SIGNED_OUT', null); });
    expect(container.querySelector('[data-testid="dashboard"]')).toBeNull();
    expect(container.querySelector('[data-testid="login"]')).not.toBeNull();
    expect(mocks.cancelTransition).toHaveBeenCalled();
  });
});
