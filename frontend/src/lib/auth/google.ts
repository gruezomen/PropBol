export type GoogleAuthenticatedUser = {
  id: number
  correo: string
  nombre: string
  apellido: string
}

export type GoogleAuthSuccessPayload = {
  token: string
  user: GoogleAuthenticatedUser
  isNewUser: boolean
  message: string
}

export function saveGoogleSession(payload: GoogleAuthSuccessPayload) {
  if (typeof window === 'undefined') return

  localStorage.setItem('token', payload.token)
  localStorage.setItem('user', JSON.stringify(payload.user))
  sessionStorage.setItem(
    'auth_success_message',
    payload.isNewUser
      ? 'Tu cuenta fue creada con Google correctamente.'
      : 'Inicio de sesión con Google exitoso.'
  )

  if (payload.message) {
    sessionStorage.setItem('auth_success_backend_message', payload.message)
  }
}
