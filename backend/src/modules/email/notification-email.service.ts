import { env } from '../../config/env.js'

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'

type SendNotificationEmailParams = {
  emailDestino: string
  titulo: string
  mensaje: string
  nombreUsuario?: string
}

type EmailSendResult = {
  success: boolean
  messageId?: string
  error?: unknown
}

const sendBrevoEmail = async ({
  to,
  subject,
  htmlContent,
  textContent
}: {
  to: string
  subject: string
  htmlContent: string
  textContent: string
}): Promise<EmailSendResult> => {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.EMAIL_PASSWORD
      },
      body: JSON.stringify({
        sender: {
          name: 'PropBol',
          email: env.EMAIL_USER
        },
        to: [{ email: to }],
        subject,
        htmlContent,
        textContent
      })
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      console.error('❌ Error al enviar email de notificación con Brevo:', data)
      return {
        success: false,
        error: data
      }
    }

    console.log(`✅ Email de notificación enviado a ${to} - ID: ${data?.messageId ?? 'sin-id'}`)

    return {
      success: true,
      messageId: data?.messageId
    }
  } catch (error) {
    console.error('❌ Error al enviar email de notificación con Brevo:', error)
    return {
      success: false,
      error
    }
  }
}

export const verifyNotificationEmailTransport = async (): Promise<void> => {
  if (!env.EMAIL_USER || !env.EMAIL_PASSWORD) {
    throw new Error('Las credenciales de email no están configuradas')
  }

  console.log('✅ Servicio de email para notificaciones listo (Brevo API)')
}

export const sendNotificationEmail = async ({
  emailDestino,
  titulo,
  mensaje,
  nombreUsuario
}: SendNotificationEmailParams): Promise<EmailSendResult> => {
  const saludo = nombreUsuario ? `Hola ${nombreUsuario},` : 'Hola,'

  return sendBrevoEmail({
    to: emailDestino,
    subject: `Nueva notificación - ${titulo}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background-color: #d97706; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Nueva notificación</h1>
          </div>

          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">${saludo}</p>

            <p style="font-size: 16px; color: #333; margin-top: 15px;">
              Has recibido una nueva notificación en PropBol:
            </p>

            <div style="background-color: #fffbeb; padding: 20px; margin: 25px 0; border-radius: 8px; border: 1px solid #fde68a;">
              <h2 style="font-size: 20px; color: #92400e; margin: 0 0 12px 0;">${titulo}</h2>
              <p style="font-size: 15px; color: #444; margin: 0;">${mensaje}</p>
            </div>
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
    `,
    textContent: `Nueva notificación en PropBol

${saludo}

Título: ${titulo}

Mensaje:
${mensaje}

---
Este es un mensaje automático, por favor no responder.`
  })
}
