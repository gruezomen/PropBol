import dns from 'node:dns'
import nodemailer from 'nodemailer'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import { env } from '../config/env.js'

dns.setDefaultResultOrder('ipv4first')

const EMAIL_TIMEOUTS = {
  connection: 30000,
  greeting: 30000,
  socket: 60000
} as const

const transporterOptions: SMTPTransport.Options = {
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD
  },
  connectionTimeout: EMAIL_TIMEOUTS.connection,
  greetingTimeout: EMAIL_TIMEOUTS.greeting,
  socketTimeout: EMAIL_TIMEOUTS.socket
}

const transporter = nodemailer.createTransport(transporterOptions)

interface EnviarCodigoParams {
  emailDestino: string
  codigo: string
  nombreUsuario?: string
}

interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: unknown
}

type VerificationEmailContent = {
  subject: string
  introText: string
  warningText?: string
}

const buildGreetingHtml = (nombreUsuario?: string): string => {
  if (!nombreUsuario) {
    return '<p style="font-size: 16px; color: #333;">Hola,</p>'
  }

  return `<p style="font-size: 16px; color: #333;">Hola <strong>${nombreUsuario}</strong>,</p>`
}

const buildGreetingText = (nombreUsuario?: string): string => {
  return nombreUsuario ? `Hola ${nombreUsuario},` : 'Hola,'
}

const buildEmailHtml = ({
  nombreUsuario,
  codigo,
  introText,
  warningText
}: {
  nombreUsuario?: string
  codigo: string
  introText: string
  warningText?: string
}): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background-color: #d97706; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Verificación de Email</h1>
          </div>

          <div style="padding: 30px;">
            ${buildGreetingHtml(nombreUsuario)}

            <p style="font-size: 16px; color: #333; margin-top: 15px;">
              ${introText}
            </p>

            <div style="background-color: #fef3c7; padding: 20px; text-align: center; margin: 25px 0; border-radius: 8px; border: 1px solid #fde68a;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 5px; color: #92400e;">${codigo}</span>
            </div>

            <p style="font-size: 14px; color: #666;">
              Este código expirará en <strong style="color: #d97706;">5 minutos</strong>.
            </p>

            ${
              warningText
                ? `
                  <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 12px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 13px; color: #78350f;">
                      ${warningText}
                    </p>
                  </div>
                `
                : ''
            }
          </div>

          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              Este es un mensaje automático, por favor no responder.<br />
              © ${new Date().getFullYear()} PropBol.
            </p>
          </div>
        </div>
      </body>
    </html>
  `
}

const buildEmailText = ({
  nombreUsuario,
  codigo,
  introText,
  warningText
}: {
  nombreUsuario?: string
  codigo: string
  introText: string
  warningText?: string
}): string => {
  return [
    'Verificación de email',
    '',
    buildGreetingText(nombreUsuario),
    '',
    introText,
    `Tu código de verificación es: ${codigo}`,
    '',
    'Este código expirará en 5 minutos.',
    warningText ? '' : null,
    warningText ?? null
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}

const sendVerificationEmail = async (
  params: EnviarCodigoParams,
  content: VerificationEmailContent
): Promise<EmailSendResult> => {
  const { emailDestino, codigo, nombreUsuario } = params

  try {
    const info = await transporter.sendMail({
      from: `PropBol <${env.EMAIL_USER}>`,
      to: emailDestino,
      subject: content.subject,
      html: buildEmailHtml({
        nombreUsuario,
        codigo,
        introText: content.introText,
        warningText: content.warningText
      }),
      text: buildEmailText({
        nombreUsuario,
        codigo,
        introText: content.introText,
        warningText: content.warningText
      })
    })

    console.log(`✅ Email enviado a ${emailDestino} - ID: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Error al enviar email:', error)
    return { success: false, error }
  }
}

export const verifyEmailTransport = async (): Promise<void> => {
  try {
    await transporter.verify()
    console.log('✅ Servicio de email listo')
  } catch (error) {
    console.error('❌ Error en configuración de email:', error)
    throw error
  }
}

export const enviarCodigoCambioEmail = async (
  params: EnviarCodigoParams
): Promise<EmailSendResult> => {
  return sendVerificationEmail(params, {
    subject: 'Código de verificación - Cambio de email',
    introText:
      'Has solicitado cambiar el email de tu cuenta. Para continuar, ingresa el siguiente código de verificación:',
    warningText:
      'Si no solicitaste este cambio, puedes ignorar este mensaje. Tu cuenta permanece segura.'
  })
}

export const enviarCodigoRegistro = async (
  params: EnviarCodigoParams
): Promise<EmailSendResult> => {
  return sendVerificationEmail(params, {
    subject: 'Código de verificación - Registro PropBol',
    introText: 'Usa este código para completar tu registro en PropBol:'
  })
}
