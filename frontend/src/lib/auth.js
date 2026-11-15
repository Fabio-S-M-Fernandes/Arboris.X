import { logoutWithApi } from './api'

export const clearLocalAuthState = ({ notify = true } = {}) => {
  localStorage.removeItem('logado')
  localStorage.removeItem('token')
  localStorage.removeItem('termsAccepted')
  if (notify) window.dispatchEvent(new Event('arboris-session-change'))
}

export const persistSession = (session) => {
  if (!session) return

  localStorage.setItem('logado', 'true')
  localStorage.setItem('token', session.access_token)
  window.dispatchEvent(new Event('arboris-session-change'))
}

export const signOutAndClear = async () => {
  const token = localStorage.getItem('token')
  // Remove o acesso local imediatamente; o token capturado segue só para revogação.
  clearLocalAuthState()
  if (!token) return true
  try {
    await logoutWithApi(token)
    return true
  } catch (error) {
    // 401 significa que o token já não pode autorizar chamadas.
    return error.status === 401
  }
}
