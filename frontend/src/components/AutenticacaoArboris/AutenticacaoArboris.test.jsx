import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loginWithApi: vi.fn(), loginWithGoogle: vi.fn(), beginSupabaseChallenge: vi.fn(),
  sessionRequest: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(),
  exchangeCodeForSession: vi.fn(), requestTransition: vi.fn(), signalDestinationReady: vi.fn(),
  setVerificationActive: vi.fn(),
}));

vi.mock('./AuthTransitionController', () => ({
  useAuthTransition: () => ({
    requestTransition: mocks.requestTransition, signalDestinationReady: mocks.signalDestinationReady,
    setVerificationActive: mocks.setVerificationActive,
    environmentReady: true, motionPaused: false, formPhase: 'idle', direction: 'forward',
    onFormExit: vi.fn(), onFormEnter: vi.fn(),
  }),
}));
vi.mock('../BootGate', () => ({ useScreenReady: () => {} }));
vi.mock('../../lib/api', () => ({
  CURRENT_TERMS_VERSION: '2026-11-15', CURRENT_PRIVACY_VERSION: '2026-11-15',
  GOOGLE_CONSENT_HINT_KEY: 'arboris-google-consent:2026-11-15:2026-11-15',
  cancelChallengeWithApi: vi.fn(), loginWithApi: mocks.loginWithApi,
  loginWithGoogle: mocks.loginWithGoogle, registerWithApi: vi.fn(),
  resendCodeWithApi: vi.fn(), verifyCodeWithApi: vi.fn(),
  requestPasswordRecovery: vi.fn(), sessionRequest: mocks.sessionRequest,
  beginSupabaseChallenge: mocks.beginSupabaseChallenge,
}));
vi.mock('../../lib/supabase', () => ({
  supabaseConfigured: true, getEmailConfirmationUrl: vi.fn(),
  supabase: { auth: {
    getUser: mocks.getUser, updateUser: mocks.updateUser, signOut: mocks.signOut,
    exchangeCodeForSession: mocks.exchangeCodeForSession,
  } },
}));

import AutenticacaoArboris from './AutenticacaoArboris';
import AuthCallback from './AuthCallback';

const setInput = (element, value) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('Login e consentimento Google', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    mocks.loginWithGoogle.mockResolvedValue({ redirecting: true });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { identities: [{ provider: 'google' }] } }, error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: null });
    mocks.sessionRequest.mockResolvedValue({ user: { userMetadata: { full_name: 'Pessoa Teste' } } });
    mocks.beginSupabaseChallenge.mockResolvedValue({ challengeId: 'challenge', maskedEmail: 'te***@example.test', expiresAt: Date.now() + 300000, resendAvailableAt: Date.now() + 60000 });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.unstubAllGlobals();
  });

  const renderLogin = async (state = null) => {
    await act(async () => {
      root.render(<MemoryRouter initialEntries={[{ pathname: '/login', state }]}><Routes>
        <Route path="/login" element={<AutenticacaoArboris />} />
      </Routes></MemoryRouter>);
    });
  };

  const renderGoogleCallback = async () => {
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/auth/callback?flow=google&code=test-code']}><Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={<AutenticacaoArboris />} />
      </Routes></MemoryRouter>);
      await Promise.resolve();
    });
  };

  const click = async (element) => act(async () => { element.click(); await Promise.resolve(); });

  it('replaces the login form with one consent stage and restores filled fields on Back', async () => {
    await renderLogin();
    expect(container.querySelector('#login-email')).not.toBeNull();
    await act(async () => {
      setInput(container.querySelector('#login-email'), 'teste@example.test');
      setInput(container.querySelector('#login-senha'), 'senha-local');
    });
    await click([...container.querySelectorAll('button')].find((button) => button.textContent.includes('Entrar com Google')));
    expect(container.textContent).toContain('Antes de continuar');
    expect(container.querySelector('#login-email')).toBeNull();
    expect(container.querySelector('#login-senha')).toBeNull();
    expect(container.querySelector('button[type="submit"]')).toBeNull();
    expect(container.querySelectorAll('.auth-consent-stage')).toHaveLength(1);
    expect(document.activeElement).toBe(container.querySelector('#google-terms-checkbox'));
    expect(mocks.loginWithGoogle).not.toHaveBeenCalled();
    await click([...container.querySelectorAll('button')].find((button) => button.textContent.includes('Voltar')));
    expect(container.querySelector('#login-email').value).toBe('teste@example.test');
    expect(container.querySelector('#login-senha').value).toBe('senha-local');
    expect(container.textContent).not.toContain('Antes de continuar');
  });

  it('requires acceptance in its own stage and starts OAuth only once', async () => {
    await renderLogin();
    await click([...container.querySelectorAll('button')].find((button) => button.textContent.includes('Entrar com Google')));
    await click([...container.querySelectorAll('button')].find((button) => button.textContent.includes('Aceitar e continuar')));
    expect(container.querySelector('#google-terms-error')).not.toBeNull();
    expect(container.querySelector('#login-form-erro')).toBeNull();
    await click(container.querySelector('#google-terms-checkbox'));
    await act(async () => {
      const continueButton = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Aceitar e continuar'));
      continueButton.click();
      continueButton.click();
      await Promise.resolve();
    });
    expect(mocks.loginWithGoogle).toHaveBeenCalledExactlyOnceWith({ termsAccepted: true });
  });

  it('uses a versioned local hint only to skip the preliminary screen', async () => {
    localStorage.setItem('arboris-google-consent:2026-11-15:2026-11-15', '1');
    await renderLogin();
    await click([...container.querySelectorAll('button')].find((button) => button.textContent.includes('Entrar com Google')));
    expect(mocks.loginWithGoogle).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(container.textContent).not.toContain('Antes de continuar');
  });

  it('records consent after OAuth for a new Google account without starting OAuth again', async () => {
    await renderLogin({ googleConsentRequired: true });
    expect(container.textContent).toContain('Antes de continuar');
    expect(container.querySelector('#login-email')).toBeNull();
    await click(container.querySelector('#google-terms-checkbox'));
    await click([...container.querySelectorAll('button')].find((button) => button.textContent.includes('Aceitar e continuar')));
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({ data: {
      terms_accepted: true, terms_version: '2026-11-15', privacy_version: '2026-11-15',
    } });
    expect(mocks.beginSupabaseChallenge).toHaveBeenCalledOnce();
    expect(mocks.loginWithGoogle).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Confirme seu acesso');
  });

  it('clears a temporary Google session when returning from post-OAuth consent', async () => {
    await renderLogin({ googleConsentRequired: true });
    await click([...container.querySelectorAll('button')].find((button) => button.textContent.includes('Voltar')));
    expect(mocks.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
    expect(container.querySelector('#login-email')).not.toBeNull();
  });

  it('keeps the password login independent of Google consent', async () => {
    mocks.loginWithApi.mockResolvedValue({ authorized: true });
    await renderLogin();
    await act(async () => {
      setInput(container.querySelector('#login-email'), 'teste@example.test');
      setInput(container.querySelector('#login-senha'), 'senha-local');
    });
    await click(container.querySelector('.login-panel button[type="submit"]'));
    expect(mocks.loginWithApi).toHaveBeenCalledExactlyOnceWith({ email: 'teste@example.test', senha: 'senha-local' });
    expect(mocks.loginWithGoogle).not.toHaveBeenCalled();
    expect(mocks.requestTransition).toHaveBeenCalledWith('/dashboard', expect.objectContaining({ mode: 'welcome' }));
  });

  it('continues after OAuth without asking for already registered current terms', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: { user_metadata: {
      terms_accepted: true, terms_version: '2026-11-15', privacy_version: '2026-11-15',
    } } }, error: null });
    await renderGoogleCallback();
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.sessionRequest).toHaveBeenCalledWith('/me');
    expect(mocks.requestTransition).toHaveBeenCalledWith('/dashboard', expect.objectContaining({ mode: 'welcome' }));
    expect(localStorage.getItem('arboris-google-consent:2026-11-15:2026-11-15')).toBe('1');
  });

  it('sends an unaccepted Google account to the exclusive consent step after OAuth', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: { user_metadata: {} } }, error: null });
    await renderGoogleCallback();
    expect(container.textContent).toContain('Antes de continuar');
    expect(container.querySelector('#login-email')).toBeNull();
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.beginSupabaseChallenge).not.toHaveBeenCalled();
  });

  it('persists pre-OAuth acceptance on the returned account before requesting OTP', async () => {
    sessionStorage.setItem('arboris-google-terms-pending', '1');
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: { user_metadata: {} } }, error: null });
    mocks.sessionRequest.mockRejectedValueOnce(Object.assign(new Error('OTP required'), { status: 403 }));
    await renderGoogleCallback();
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({ data: {
      terms_accepted: true, terms_version: '2026-11-15', privacy_version: '2026-11-15',
    } });
    expect(mocks.beginSupabaseChallenge).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('arboris-google-terms-pending')).toBeNull();
    expect(container.textContent).toContain('Confirme seu acesso');
  });
});
