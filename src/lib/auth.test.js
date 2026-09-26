import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { clearLocalAuthState, persistSession, signOutAndClear } from './auth'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
}))

import { supabase } from './supabase'

describe('auth utilities', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => { })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('clearLocalAuthState', () => {
    it('removes all auth-related keys from localStorage', () => {
      localStorage.setItem('logado', 'true')
      localStorage.setItem('token', 'abc')
      localStorage.setItem('termsAccepted', 'yes')

      clearLocalAuthState()

      expect(localStorage.getItem('logado')).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('termsAccepted')).toBeNull()
    })

    it('does not throw when the keys are already absent (idempotent)', () => {
      expect(() => clearLocalAuthState()).not.toThrow()
    })

    it('preserves unrelated localStorage keys', () => {
      localStorage.setItem('theme', 'dark')

      clearLocalAuthState()

      expect(localStorage.getItem('theme')).toBe('dark')
    })
  })

  describe('persistSession', () => {
    it('stores logado=true and the access token for a valid session', () => {
      persistSession({ access_token: 'token-123' })

      expect(localStorage.getItem('logado')).toBe('true')
      expect(localStorage.getItem('token')).toBe('token-123')
    })

    it('overwrites a previous token', () => {
      persistSession({ access_token: 'old' })
      persistSession({ access_token: 'new' })

      expect(localStorage.getItem('token')).toBe('new')
    })

    it('does nothing when session is null (negative case)', () => {
      persistSession(null)

      expect(localStorage.getItem('logado')).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
    })

    it('does nothing when session is undefined', () => {
      persistSession(undefined)

      expect(localStorage.getItem('logado')).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
    })

    it('stores the empty string token as-is (edge case)', () => {
      persistSession({ access_token: '' })

      // The function does not validate the token value; only presence of session.
      expect(localStorage.getItem('logado')).toBe('true')
      expect(localStorage.getItem('token')).toBe('')
    })
  })

  describe('signOutAndClear', () => {
    it('clears local state and calls supabase.auth.signOut', async () => {
      localStorage.setItem('logado', 'true')
      localStorage.setItem('token', 'abc')
      localStorage.setItem('termsAccepted', 'yes')
      supabase.auth.signOut.mockResolvedValue({ error: null })

      await signOutAndClear()

      expect(localStorage.getItem('logado')).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('termsAccepted')).toBeNull()
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
    })

    it('logs an error when signOut fails but still clears local state', async () => {
      const error = new Error('network down')
      supabase.auth.signOut.mockResolvedValue({ error })

      await expect(signOutAndClear()).resolves.toBeUndefined()

      expect(console.error).toHaveBeenCalledWith('Sign out error', error)
      expect(localStorage.getItem('logado')).toBeNull()
    })

    it('does not throw when signOut rejects unexpectedly', async () => {
      supabase.auth.signOut.mockRejectedValue(new Error('crash'))

      await expect(signOutAndClear()).rejects.toThrow('crash')
      // Local state is still cleared before the remote call.
      expect(localStorage.getItem('token')).toBeNull()
    })
  })
})
