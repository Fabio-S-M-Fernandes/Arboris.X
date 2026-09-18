import { supabase } from './supabase'

export const clearLocalAuthState = () => {
  localStorage.removeItem('logado')
  localStorage.removeItem('token')
  localStorage.removeItem('termsAccepted')
}

export const persistSession = (session) => {
  if (!session) return

  localStorage.setItem('logado', 'true')
  localStorage.setItem('token', session.access_token)
}

export const signOutAndClear = async () => {
  clearLocalAuthState()

  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Sign out error', error)
  }
}
