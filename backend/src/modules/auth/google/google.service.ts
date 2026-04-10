import crypto from 'node:crypto'
import { env } from '../../../config/env.js'
import { generateToken, type JwtPayload } from '../../../utils/jwt.js'
import {
  createGoogleSession,
  createGoogleUser,
  findUserByGoogleEmail
} from './google.repository.js'
import {
  GoogleAuthError,
  type GoogleAuthIntent,
  type GoogleAuthSuccess,
  type GoogleTokenResponse,
  type GoogleUserInfo
} from './google.types.js'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const SESSION_DURATION_MS = 60 * 60 * 1000

const exchangeCodeForTokens = async (code: string) => {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code'
    })
  })

  const data = (await response.json()) as GoogleTokenResponse

  if (!response.ok || !data.access_token) {
    throw new GoogleAuthError(
      data.error_description || 'No se pudo obtener el token de Google.',
      'GOOGLE_AUTH_FAILED',
      401
    )
  }

  return data
}

const getGoogleUserInfo = async (accessToken: string) => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  const data = (await response.json()) as GoogleUserInfo

  if (!response.ok || !data.email?.trim()) {
    throw new GoogleAuthError(
      'No se pudo obtener el correo de la cuenta de Google.',
      'GOOGLE_AUTH_FAILED',
      401
    )
  }

  return data
}

const splitFullName = (fullName?: string) => {
  const value = fullName?.trim() || ''

  if (!value) {
    return {
      firstName: '',
      lastName: ''
    }
  }

  const parts = value.split(/\s+/)

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: ''
    }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  }
}

const resolveGoogleNames = (googleUser: GoogleUserInfo) => {
  const fallback = splitFullName(googleUser.name)

  const nombre = googleUser.given_name?.trim() || fallback.firstName || 'Usuario'

  const apellido = googleUser.family_name?.trim() || fallback.lastName || 'Google'

  return {
    nombre,
    apellido
  }
}

const buildSessionResponse = async ({
  id,
  correo,
  nombre,
  apellido
}: {
  id: number
  correo: string
  nombre: string
  apellido: string
}): Promise<GoogleAuthSuccess> => {
  const jwtPayload: JwtPayload = {
    id,
    correo
  }

  const token = generateToken(jwtPayload)
  const fechaExpiracion = new Date(Date.now() + SESSION_DURATION_MS)

  await createGoogleSession({
    token,
    usuarioId: id,
    fechaExpiracion
  })

  return {
    message: 'Autenticación con Google exitosa',
    token,
    user: {
      id,
      correo,
      nombre,
      apellido
    }
  }
}

export const authenticateWithGoogleCodeService = async (
  code: string,
  intent: GoogleAuthIntent
): Promise<GoogleAuthSuccess> => {
  if (!code?.trim()) {
    throw new GoogleAuthError('Google no devolvió un código válido.', 'GOOGLE_AUTH_FAILED', 400)
  }

  const tokenData = await exchangeCodeForTokens(code)
  const googleUser = await getGoogleUserInfo(tokenData.access_token as string)

  const correo = googleUser.email?.trim().toLowerCase()

  if (!correo || googleUser.email_verified === false) {
    throw new GoogleAuthError(
      'Google no devolvió un correo válido y verificado.',
      'GOOGLE_AUTH_FAILED',
      401
    )
  }

  const existingUser = await findUserByGoogleEmail(correo)

  if (existingUser) {
    return await buildSessionResponse({
      id: existingUser.id,
      correo: existingUser.correo,
      nombre: existingUser.nombre,
      apellido: existingUser.apellido
    })
  }

  if (intent === 'login') {
    throw new GoogleAuthError(
      'Esta cuenta de Google no está registrada. Regístrate primero.',
      'ACCOUNT_NOT_REGISTERED',
      404
    )
  }

  const { nombre, apellido } = resolveGoogleNames(googleUser)
  const generatedPassword = crypto.randomBytes(24).toString('hex')

  const newUser = await createGoogleUser({
    nombre,
    apellido,
    correo,
    password: generatedPassword
  })

  return await buildSessionResponse({
    id: newUser.id,
    correo: newUser.correo,
    nombre: newUser.nombre,
    apellido: newUser.apellido
  })
}
