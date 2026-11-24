import { afterEach, describe, expect, it, vi } from 'vitest';
import { diagnosticAuthFetch, getAuthCallbackUrl, getEmailConfirmationUrl, takeAuthRetryAfter } from './supabase';

describe('Supabase PKCE callback URLs', () => {
  it('routes Google and recovery flows to the callback and confirmation to its own page', () => {
    expect(getAuthCallbackUrl('google')).toBe(`${window.location.origin}/auth/callback?flow=google`);
    expect(getAuthCallbackUrl('recovery')).toBe(`${window.location.origin}/auth/callback?flow=recovery`);
    expect(getEmailConfirmationUrl()).toBe(`${window.location.origin}/auth/confirm`);
    expect(() => getAuthCallbackUrl('legacy')).toThrow();
  });
});

describe('Supabase recovery request diagnostics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('records only the recovery endpoint and HTTP status, never the request body', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const request = new Request('https://project.supabase.co/auth/v1/recover', {
      method: 'POST',
      body: JSON.stringify({ email: 'private@example.test' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await diagnosticAuthFetch(request);

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(request);
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(info).toHaveBeenNthCalledWith(1, '[supabase-auth-request]', {
      operation: 'password_recovery',
      path: '/auth/v1/recover',
      method: 'POST',
    });
    expect(info).toHaveBeenNthCalledWith(2, '[supabase-auth-response]', {
      operation: 'password_recovery',
      status: 200,
    });
    expect(JSON.stringify(info.mock.calls)).not.toContain('private@example.test');
  });

  it('logs a failed recovery transport without swallowing the error', async () => {
    const networkError = new TypeError('Network unavailable');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const request = new Request('https://project.supabase.co/auth/v1/recover', { method: 'POST' });

    await expect(diagnosticAuthFetch(request)).rejects.toBe(networkError);

    expect(warning).toHaveBeenCalledWith('[supabase-auth-request]', {
      operation: 'password_recovery',
      outcome: 'network_error',
    });
  });

  it('retains the provider Retry-After for a password request without retaining credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {
      status: 429, headers: { 'Retry-After': '19' },
    })));
    const request = new Request('https://project.supabase.co/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ grant_type: 'password', email: 'private@example.test', password: 'private-secret' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await diagnosticAuthFetch(request);

    expect(takeAuthRetryAfter('password_login')).toBe(19);
    expect(takeAuthRetryAfter('password_login')).toBeNull();
  });
});
