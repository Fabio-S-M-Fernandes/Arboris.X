import { beforeEach, describe, expect, it } from 'vitest'
import { clearLocalAuthState, persistSession, signOutAndClear } from './auth'

describe('auth utilities', () => {
  beforeEach(() => {
    localStorage.clear()
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

    it('does not throw when the keys are already absent', () => {
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

    it('does nothing when there is no session', () => {
      persistSession(null)
      persistSession(undefined)

      expect(localStorage.getItem('logado')).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
    })

    it('stores an empty token as-is when a session object is provided', () => {
      persistSession({ access_token: '' })

      expect(localStorage.getItem('logado')).toBe('true')
      expect(localStorage.getItem('token')).toBe('')
    })
  })

  describe('signOutAndClear', () => {
    it('clears the local JWT session without an external auth provider', async () => {
      localStorage.setItem('logado', 'true')
      localStorage.setItem('token', 'abc')
      localStorage.setItem('termsAccepted', 'yes')

      await signOutAndClear()

      expect(localStorage.getItem('logado')).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
      expect(localStorage.getItem('termsAccepted')).toBeNull()
    })
  })
})
