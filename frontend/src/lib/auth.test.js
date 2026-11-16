import { beforeEach, describe, expect, it } from 'vitest';
import { clearLocalAuthState } from './auth';

describe('legacy local authentication cleanup', () => {
  beforeEach(() => localStorage.clear());

  it('removes legacy auth keys while preserving unrelated browser data', () => {
    localStorage.setItem('logado', 'true');
    localStorage.setItem('token', 'old-jwt');
    localStorage.setItem('termsAccepted', 'yes');
    localStorage.setItem('theme', 'dark');

    clearLocalAuthState();

    expect(localStorage.getItem('logado')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('termsAccepted')).toBeNull();
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('supports cleanup without notifying other tabs', () => {
    localStorage.setItem('token', 'old-jwt');
    expect(() => clearLocalAuthState({ notify: false })).not.toThrow();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
