import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loginWithApi: vi.fn(), loginWithGoogle: vi.fn(), beginSupabaseChallenge: vi.fn(),
  registerWithApi: vi.fn(),
  getSession: vi.fn(), getSessionWithApi: vi.fn(),
  sessionRequest: vi.fn(), verifyCodeWithApi: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(), signOut: vi.fn(),
  exchangeCodeForSession: vi.fn(), requestTransition: vi.fn(), signalDestinationReady: vi.fn(),
  setVerificationActive: vi.fn(), verifyOtp: vi.fn(),
  resend: vi.fn(), takeAuthRetryAfter: vi.fn(() => null),
  getConsentStatus: vi.fn(),
}));

vi.mock('./AuthTransitionController', () => ({
  useAuthTransition: () => ({
    requestTransition: mocks.requestTransition, signalDestinationReady: mocks.signalDestinationReady,
    setVerificationActive: mocks.setVerificationActive,
    environmentReady: true, motionPaused: false, formPhase: 'idle', direction: 'forward',
    onFormExit: vi.fn(), onFormEnter: vi.fn(),
  }),
}));
vi.mock('../BootGate', () => ({ useScreenReady: () => {}, useBootGate: () => ({ initialPresentationComplete: true }) }));
vi.mock('../../lib/api', () => ({
  cancelChallengeWithApi: vi.fn(), loginWithApi: mocks.loginWithApi,
  loginWithGoogle: mocks.loginWithGoogle, registerWithApi: mocks.registerWithApi,
  resendCodeWithApi: vi.fn(), verifyCodeWithApi: mocks.verifyCodeWithApi,
  requestPasswordRecovery: vi.fn(), sessionRequest: mocks.sessionRequest,
  beginSupabaseChallenge: mocks.beginSupabaseChallenge,
  getConsentStatus: mocks.getConsentStatus, getSessionWithApi: mocks.getSessionWithApi,
}));
vi.mock('../../lib/supabase', () => ({
  supabaseConfigured: true, getEmailConfirmationUrl: vi.fn(),
  takeAuthRetryAfter: mocks.takeAuthRetryAfter,
  supabase: { auth: {
    getSession: mocks.getSession, getUser: mocks.getUser, updateUser: mocks.updateUser, signOut: mocks.signOut,
    exchangeCodeForSession: mocks.exchangeCodeForSession, verifyOtp: mocks.verifyOtp, resend: mocks.resend,
  } },
}));

import AutenticacaoArboris from './AutenticacaoArboris';
import AuthCallback, { AuthConfirm } from './AuthCallback';

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
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.getSessionWithApi.mockReset();
    mocks.loginWithGoogle.mockResolvedValue({ redirecting: true });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { identities: [{ provider: 'google' }] } }, error: null });
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: null });
    mocks.verifyOtp.mockResolvedValue({ data: { user: { email_confirmed_at: '2026-11-22T12:00:00Z' } }, error: null });
    mocks.sessionRequest.mockResolvedValue({ user: { userMetadata: { full_name: 'Pessoa Teste' } } });
    mocks.verifyCodeWithApi.mockResolvedValue({ user: { nome: 'Pessoa Teste' }, trustedDeviceRegistered: true });
    mocks.beginSupabaseChallenge.mockResolvedValue({ challengeId: 'challenge', maskedEmail: 'te***@example.test', expiresAt: Date.now() + 300000, resendAvailableAt: Date.now() + 60000 });
    mocks.getConsentStatus.mockResolvedValue({ required: false });
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
        <Route path="/consentimento" element={<div>Consentimento da conta</div>} />
      </Routes></MemoryRouter>);
    });
  };

  const renderSignup = async () => {
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/cadastro']}><Routes>
        <Route path="/cadastro" element={<AutenticacaoArboris />} />
        <Route path="/consentimento" element={<div>Consentimento da conta</div>} />
      </Routes></MemoryRouter>);
    });
  };

  const renderGoogleCallback = async () => {
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/auth/callback?flow=google&code=test-code']}><Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/login" element={<AutenticacaoArboris />} />
        <Route path="/consentimento" element={<div>Consentimento da conta</div>} />
      </Routes></MemoryRouter>);
      await Promise.resolve();
    });
  };

  const renderEmailConfirmation = async () => {
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/auth/confirm?token_hash=email-token&type=email']}><Routes>
        <Route path="/auth/confirm" element={<AuthConfirm />} />
        <Route path="/consentimento" element={<div>Consentimento da conta</div>} />
      </Routes></MemoryRouter>);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  const click = async (element) => act(async () => { element.click(); await Promise.resolve(); });

  it('resumes an existing backend-authorized session without a new OTP or Google login', async () => {
    const session = { user: { id: 'resume-user' }, access_token: 'test-token' };
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.getSessionWithApi.mockResolvedValue({ user: { id: 'resume-user', nome: 'Teste' }, expiresAt: Date.now() / 1000 + 600 });
    await renderLogin();
    expect(mocks.getSessionWithApi).toHaveBeenCalledExactlyOnceWith(expect.any(AbortSignal), session);
    expect(mocks.requestTransition).toHaveBeenCalledExactlyOnceWith('/dashboard', expect.objectContaining({ mode: 'welcome', userName: 'Teste' }));
    expect(mocks.loginWithApi).not.toHaveBeenCalled();
    expect(mocks.loginWithGoogle).not.toHaveBeenCalled();
    expect(mocks.beginSupabaseChallenge).not.toHaveBeenCalled();
  });

  it('does not auto-enter when additional verification is required', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'resume-user' } } } });
    mocks.getSessionWithApi.mockRejectedValue({ status: 403, code: 'ADDITIONAL_VERIFICATION_REQUIRED' });
    await renderLogin();
    expect(mocks.requestTransition).not.toHaveBeenCalled();
    expect(mocks.beginSupabaseChallenge).not.toHaveBeenCalled();
    expect(container.querySelector('#login-email')).not.toBeNull();
  });

  it('does not loop after an invalid session was rejected by the dashboard guard', async () => {
    await renderLogin({ from: '/dashboard', sessionCheckFailed: true });
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.requestTransition).not.toHaveBeenCalled();
    expect(container.querySelector('#login-email')).not.toBeNull();
  });

  it('starts Google login without an automatic legal notice', async () => {
    await renderLogin();
    expect(container.querySelector('.auth-google-legal')).toBeNull();
    expect(container.querySelector('#google-terms-checkbox')).toBeNull();
    await click([...container.querySelectorAll('button')].find((button) => button.textContent.includes('Entrar com Google')));
    expect(mocks.loginWithGoogle).toHaveBeenCalledExactlyOnceWith();
  });

  it('creates an account without an automatic legal notice', async () => {
    mocks.registerWithApi.mockResolvedValue({ requiresEmailConfirmation: true });
    await renderSignup();
    expect(container.querySelector('input[type="checkbox"]')).toBeNull();
    expect(container.querySelector('.signup-panel .auth-legal-notice')).toBeNull();
    await act(async () => {
      setInput(container.querySelector('#signup-nome'), 'Pessoa Teste');
      setInput(container.querySelector('#signup-email'), 'teste@example.test');
      setInput(container.querySelector('#signup-senha'), 'senha-local');
    });
    await click(container.querySelector('.signup-panel button[type="submit"]'));
    expect(mocks.registerWithApi).toHaveBeenCalledExactlyOnceWith({
      nome: 'Pessoa Teste', email: 'teste@example.test', senha: 'senha-local',
    });
    expect(container.textContent).toContain('Se este é um novo cadastro');
    expect(container.textContent).toContain('Se esse endereço já estiver associado a uma conta');
  });

  it('honors Supabase Retry-After while resending a confirmation email', async () => {
    const limited = Object.assign(new Error('rate limited'), { status: 429, code: 'over_email_send_rate_limit' });
    mocks.resend.mockResolvedValueOnce({ error: limited });
    mocks.takeAuthRetryAfter.mockReturnValueOnce(12);
    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/auth/confirm']}><AuthConfirm /></MemoryRouter>);
    });
    await act(async () => { setInput(container.querySelector('#confirmation-email'), 'person@example.test'); });
    const button = container.querySelector('button[type="submit"]');
    await click(button);
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Aguarde 12s');
    await click(button);
    expect(mocks.resend).toHaveBeenCalledOnce();
  });

  it('routes immediately confirmed email signups to consent before OTP', async () => {
    mocks.registerWithApi.mockResolvedValue({ requiresAccountConsent: true });
    await renderSignup();
    await act(async () => {
      setInput(container.querySelector('#signup-nome'), 'Pessoa Teste');
      setInput(container.querySelector('#signup-email'), 'teste@example.test');
      setInput(container.querySelector('#signup-senha'), 'senha-local');
    });
    await click(container.querySelector('.signup-panel button[type="submit"]'));
    expect(container.textContent).toContain('Consentimento da conta');
    expect(mocks.beginSupabaseChallenge).not.toHaveBeenCalled();
  });

  it('sends a new Google account to the consent screen before OTP', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: { identities: [{ provider: 'google' }], user_metadata: {} } }, error: null });
    mocks.getConsentStatus.mockResolvedValue({ required: true });
    await renderGoogleCallback();
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.beginSupabaseChallenge).not.toHaveBeenCalled();
    expect(mocks.loginWithGoogle).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Consentimento da conta');
  });

  it('automatically confirms the email link and keeps the session for required consent', async () => {
    await renderEmailConfirmation();
    expect(mocks.verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: 'email-token', type: 'email' });
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Consentimento da conta');
  });

  it('keeps the password login independent of Google consent', async () => {
    mocks.loginWithApi.mockResolvedValue({ authorized: true });
    await renderLogin({ from: '/dashboard?section=history' });
    await act(async () => {
      setInput(container.querySelector('#login-email'), 'teste@example.test');
      setInput(container.querySelector('#login-senha'), 'senha-local');
    });
    await click(container.querySelector('.login-panel button[type="submit"]'));
    expect(mocks.loginWithApi).toHaveBeenCalledExactlyOnceWith({ email: 'teste@example.test', senha: 'senha-local' });
    expect(mocks.loginWithGoogle).not.toHaveBeenCalled();
    expect(mocks.requestTransition).toHaveBeenCalledWith('/dashboard?section=history', expect.objectContaining({ mode: 'welcome' }));
  });

  it('locks duplicate login submits and honors the API cooldown after HTTP 429', async () => {
    mocks.loginWithApi.mockRejectedValueOnce({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 17 });
    await renderLogin();
    await act(async () => {
      setInput(container.querySelector('#login-email'), 'teste@example.test');
      setInput(container.querySelector('#login-senha'), 'senha-local');
    });
    const submit = container.querySelector('.login-panel form.auth-form');
    await act(async () => {
      submit.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      submit.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    const button = container.querySelector('.login-panel button[type="submit"]');
    expect(mocks.loginWithApi).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Aguarde 17s');
  });

  it('continues after OAuth without asking for already registered current terms', async () => {
    sessionStorage.setItem('arboris-auth-return-to', '/dashboard?section=temperature');
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: { identities: [{ provider: 'google' }], user_metadata: {
      terms_accepted: true, terms_version: '2026-11-15', privacy_version: '2026-11-15',
    } } }, error: null });
    await renderGoogleCallback();
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.sessionRequest).toHaveBeenCalledWith('/me');
    expect(mocks.requestTransition).toHaveBeenCalledWith('/dashboard?section=temperature', expect.objectContaining({ mode: 'welcome' }));
    expect(sessionStorage.getItem('arboris-auth-return-to')).toBeNull();
  });

  it('does not start OTP or authorize access after an unspecified backend 403', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: { identities: [{ provider: 'google' }] } }, error: null });
    mocks.sessionRequest.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }));
    await renderGoogleCallback();
    expect(container.textContent).toContain('Não foi possível continuar');
    expect(container.querySelector('#auth-security-code')).toBeNull();
    expect(mocks.beginSupabaseChallenge).not.toHaveBeenCalled();
    expect(mocks.requestTransition).not.toHaveBeenCalled();
  });

  it('returns to the requested Dashboard section after OAuth verification by OTP', async () => {
    sessionStorage.setItem('arboris-auth-return-to', '/dashboard?section=history');
    mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: { identities: [{ provider: 'google' }], user_metadata: {
      terms_accepted: true, terms_version: '2026-11-15', privacy_version: '2026-11-15',
    } } }, error: null });
    mocks.sessionRequest.mockRejectedValueOnce(Object.assign(new Error('OTP required'), {
      status: 403, code: 'ADDITIONAL_VERIFICATION_REQUIRED',
    }));
    await renderGoogleCallback();

    expect(container.textContent).toContain('Confirme seu acesso');
    expect(mocks.beginSupabaseChallenge).toHaveBeenCalledOnce();
    expect(mocks.requestTransition).not.toHaveBeenCalled();
    const code = container.querySelector('#auth-security-code');
    expect(code).toBeInstanceOf(HTMLInputElement);
    await act(async () => { setInput(code, '123456'); });
    await click(container.querySelector('.auth-verify-submit'));

    expect(mocks.verifyCodeWithApi).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      challengeId: 'challenge', code: '123456', method: 'supabase',
    }));
    expect(mocks.requestTransition).toHaveBeenCalledWith('/dashboard?section=history', expect.objectContaining({ mode: 'welcome' }));
  });

});
