import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthCallbackUrl: vi.fn(),
  getEmailConfirmationUrl: vi.fn(),
  takeAuthRetryAfter: vi.fn(() => null),
  auth: {
    getSession: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
}));

vi.mock('./supabase', () => ({
  getAuthCallbackUrl: mocks.getAuthCallbackUrl,
  getEmailConfirmationUrl: mocks.getEmailConfirmationUrl,
  takeAuthRetryAfter: mocks.takeAuthRetryAfter,
  supabase: { auth: mocks.auth },
}));

import { loginWithApi, loginWithGoogle, registerWithApi, requestPasswordRecovery, sessionRequest, verifyCodeWithApi } from './api';

describe('Supabase authentication requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends password recovery through Supabase with a trimmed email and recovery callback', async () => {
    mocks.getAuthCallbackUrl.mockReturnValue('https://app.example.test/auth/callback?flow=recovery');
    mocks.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    await requestPasswordRecovery('  person@example.test  ');

    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'person@example.test',
      { redirectTo: 'https://app.example.test/auth/callback?flow=recovery' },
    );
  });

  it('propagates recovery errors and logs only their safe code and status', async () => {
    const error = Object.assign(new Error('Sensitive details for person@example.test'), {
      code: 'over_email_send_rate_limit',
      status: 429,
    });
    mocks.auth.resetPasswordForEmail.mockResolvedValue({ data: null, error });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(requestPasswordRecovery('person@example.test')).rejects.toBe(error);

    expect(warning).toHaveBeenCalledWith('[supabase-auth]', {
      operation: 'password_recovery',
      code: 'over_email_send_rate_limit',
      status: 429,
    });
    expect(JSON.stringify(warning.mock.calls)).not.toContain('person@example.test');
    expect(JSON.stringify(warning.mock.calls)).not.toContain('Sensitive details');
  });

  it('preserves Supabase rate limits and their Retry-After through session refresh', async () => {
    const error = Object.assign(new Error('rate limited'), { status: 429, code: 'over_request_rate_limit' });
    mocks.auth.getSession.mockResolvedValue({ data: { session: null }, error });
    mocks.takeAuthRetryAfter.mockReturnValueOnce(21);

    await expect(sessionRequest('/me')).rejects.toMatchObject({
      status: 429, code: 'over_request_rate_limit', retryAfterSeconds: 21,
    });
  });

  it('does not send invalid Supabase credentials to the legacy login endpoint', async () => {
    const error = Object.assign(new Error('Invalid login credentials'), {
      code: 'invalid_credentials',
      status: 400,
    });
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error });
    const fetch = vi.spyOn(globalThis, 'fetch');

    await expect(loginWithApi({ email: 'person@example.test', senha: 'not-a-real-password' }))
      .rejects.toMatchObject({
        code: 'invalid_credentials',
        status: 400,
        message: expect.stringContaining('Não foi possível localizar uma conta com esses dados'),
      });

    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'person@example.test',
      password: 'not-a-real-password',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves Supabase password-login Retry-After for the login cooldown', async () => {
    const error = Object.assign(new Error('rate limited'), { status: 429, code: 'over_request_rate_limit' });
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error });
    mocks.takeAuthRetryAfter.mockReturnValueOnce(14);

    await expect(loginWithApi({ email: 'person@example.test', senha: 'test-password' })).rejects.toMatchObject({
      status: 429, code: 'over_request_rate_limit', retryAfterSeconds: 14,
    });
  });

  it('exposes the server Retry-After value for login cooldowns', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-supabase-token' } }, error: null });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":{"code":"RATE_LIMITED","message":"Wait"}}', {
      status: 429, headers: { 'Retry-After': '17' },
    }));

    await expect(sessionRequest('/challenge', { method: 'POST', body: '{}' }))
      .rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 17 });
  });

  it('does not fall back to legacy authentication for other Supabase errors', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: Object.assign(new Error('Auth service unavailable'), {
        code: 'server_error',
        status: 503,
      }),
    });
    const fetch = vi.spyOn(globalThis, 'fetch');

    await expect(loginWithApi({ email: 'person@example.test', senha: 'not-a-real-password' }))
      .rejects.toMatchObject({ code: 'server_error', status: 503 });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('starts a Supabase login with an additional challenge before granting access', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'test-supabase-token' } }, error: null });
    mocks.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-supabase-token' } }, error: null });
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ challengeId: 'test-challenge' }), { status: 200 }));

    const result = await loginWithApi({ email: ' person@example.test ', senha: 'test-password' });

    expect(result).toEqual({ challengeId: 'test-challenge', method: 'supabase' });
    expect(mocks.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'person@example.test', password: 'test-password' });
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/session\/challenge$/), expect.objectContaining({ method: 'POST' }));
    expect(fetch.mock.calls[0][1].credentials).toBe('include');
  });

  it('preserves the Supabase session when the additional challenge is temporarily unavailable', async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ data: { session: { access_token: 'test-supabase-token' } }, error: null });
    mocks.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-supabase-token' } }, error: null });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":{"message":"Indisponível"}}', { status: 503 }));

    await expect(loginWithApi({ email: 'person@example.test', senha: 'test-password' }))
      .rejects.toMatchObject({ status: 503 });

    expect(mocks.auth.signOut).not.toHaveBeenCalled();
  });

  it('sends trust opt-in only with an OTP verification and keeps the code out of later requests', async () => {
    mocks.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'test-supabase-token' } }, error: null });
    const fetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('{"authorized":true}', { status: 200 }))
      .mockResolvedValueOnce(new Response('{"user":{"userMetadata":{}}}', { status: 200 }));
    await verifyCodeWithApi({ challengeId: 'challenge-id', code: '123456', trustDevice: true });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ challengeId: 'challenge-id', code: '123456', trustDevice: true });
    expect(fetch.mock.calls[0][1].credentials).toBe('include');
    expect(fetch.mock.calls[1][1].body).toBeUndefined();
  });

  it('registers through Supabase without accepting documents automatically', async () => {
    mocks.getEmailConfirmationUrl.mockReturnValue('https://app.example.test/auth/confirm');
    mocks.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const fetch = vi.spyOn(globalThis, 'fetch');

    const result = await registerWithApi({ nome: ' Pessoa ', email: ' person@example.test ', senha: 'test-password' });

    expect(result).toEqual({ requiresEmailConfirmation: true });
    expect(mocks.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.test', password: 'test-password',
      options: expect.objectContaining({
        emailRedirectTo: 'https://app.example.test/auth/confirm',
        data: { full_name: 'Pessoa' },
      }),
    }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires consent before starting OTP when signup returns a confirmed session', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: {
      session: { access_token: 'confirmed-session' },
      user: { email_confirmed_at: '2026-11-22T12:00:00Z' },
    }, error: null });
    const fetch = vi.spyOn(globalThis, 'fetch');

    const result = await registerWithApi({ nome: 'Pessoa', email: 'person@example.test', senha: 'test-password' });

    expect(result).toEqual({ requiresAccountConsent: true, isNewUser: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('clears an unconfirmed signup session and waits for the email link', async () => {
    mocks.auth.signUp.mockResolvedValue({ data: {
      session: { access_token: 'unconfirmed-session' },
      user: { email_confirmed_at: null, confirmed_at: null },
    }, error: null });
    mocks.auth.signOut.mockResolvedValue({ error: null });

    const result = await registerWithApi({ nome: 'Pessoa', email: 'person@example.test', senha: 'test-password' });

    expect(result).toEqual({ requiresEmailConfirmation: true });
    expect(mocks.auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
  });

  it('starts Google OAuth directly without a separate consent marker', async () => {
    mocks.getAuthCallbackUrl.mockReturnValue('https://app.example.test/auth/callback?flow=google');
    mocks.auth.signInWithOAuth.mockResolvedValue({ error: null });
    const fetch = vi.spyOn(globalThis, 'fetch');

    const result = await loginWithGoogle();

    expect(result).toEqual({ redirecting: true });
    expect(sessionStorage.getItem('arboris-google-terms-pending')).toBeNull();
    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://app.example.test/auth/callback?flow=google' } });
    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });
});
