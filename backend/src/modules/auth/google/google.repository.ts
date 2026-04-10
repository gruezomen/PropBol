import { createSession, createUser, findUserByCorreo } from '../auth.repository.js'

export const findUserByGoogleEmail = async (correo: string) => {
  return await findUserByCorreo(correo)
}

export const createGoogleUser = async ({
  nombre,
  apellido,
  correo,
  password
}: {
  nombre: string
  apellido: string
  correo: string
  password: string
}) => {
  return await createUser({
    nombre,
    apellido,
    correo,
    password
  })
}

export const createGoogleSession = async ({
  token,
  usuarioId,
  fechaExpiracion
}: {
  token: string
  usuarioId: number
  fechaExpiracion: Date
}) => {
  return await createSession({
    token,
    usuarioId,
    fechaExpiracion
  })
}
