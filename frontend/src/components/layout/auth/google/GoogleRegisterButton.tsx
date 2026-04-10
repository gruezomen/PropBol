'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type GoogleRegisterButtonProps = {
  onSuccess: (payload: {
    token: string
    user: {
      id: number
      correo: string
      nombre: string
      apellido: string
    }
    isNewUser: boolean
    message: string
  }) => void
  onError?: (message: string) => void
  disabled?: boolean
}

type GooglePopupSuccessPayload = {
  type: 'propbol:google-auth-success'
  message: string
  token: string
  isNewUser: boolean
  user: {
    id: number
    correo: string
    nombre: string
    apellido: string
  }
}

type GooglePopupErrorPayload = {
  type: 'propbol:google-auth-error'
  code: string
  message: string
}

type GooglePopupMessage = GooglePopupSuccessPayload | GooglePopupErrorPayload

const POPUP_WIDTH = 500
const POPUP_HEIGHT = 650

export default function GoogleRegisterButton({
  onSuccess,
  onError,
  disabled = false
}: GoogleRegisterButtonProps) {
  const [localError, setLocalError] = useState('')
  const popupRef = useRef<Window | null>(null)
  const pollIntervalRef = useRef<number | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

  const setErrorMessage = useCallback(
    (message: string) => {
      setLocalError(message)
      onError?.(message)
    },
    [onError]
  )

  const clearErrorMessage = useCallback(() => {
    setLocalError('')
    onError?.('')
  }, [onError])

  const clearPopupWatcher = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const handleOpenGooglePopup = useCallback(() => {
    if (disabled) return

    clearErrorMessage()

    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY

    const width = window.innerWidth || document.documentElement.clientWidth || screen.width
    const height = window.innerHeight || document.documentElement.clientHeight || screen.height

    const left = width / 2 - POPUP_WIDTH / 2 + dualScreenLeft
    const top = height / 2 - POPUP_HEIGHT / 2 + dualScreenTop

    const popup = window.open(
      `${API_URL}/api/auth/google/register`,
      'google-register-popup',
      `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},top=${top},left=${left},scrollbars=yes,resizable=yes`
    )

    if (!popup) {
      setErrorMessage(
        'No se pudo abrir la ventana de Google. Verifica que tu navegador no esté bloqueando popups.'
      )
      return
    }

    popupRef.current = popup
    popup.focus()

    clearPopupWatcher()

    pollIntervalRef.current = window.setInterval(() => {
      if (popupRef.current?.closed) {
        clearPopupWatcher()
        popupRef.current = null
      }
    }, 500)
  }, [API_URL, clearErrorMessage, clearPopupWatcher, disabled, setErrorMessage])

  useEffect(() => {
    const expectedOrigin = new URL(API_URL).origin

    const handleMessage = (event: MessageEvent<GooglePopupMessage>) => {
      if (event.origin !== expectedOrigin) return

      const payload = event.data

      if (!payload || typeof payload !== 'object' || !('type' in payload)) {
        return
      }

      if (payload.type === 'propbol:google-auth-error') {
        setErrorMessage(payload.message || 'No se pudo autenticar con Google.')
        return
      }

      if (payload.type === 'propbol:google-auth-success') {
        clearErrorMessage()
        onSuccess({
          token: payload.token,
          user: payload.user,
          isNewUser: payload.isNewUser,
          message: payload.message
        })
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      clearPopupWatcher()

      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close()
      }
    }
  }, [API_URL, clearErrorMessage, clearPopupWatcher, onSuccess, setErrorMessage])

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleOpenGooglePopup}
        disabled={disabled}
        className={`w-full rounded-md border px-4 py-2.5 text-[13px] font-semibold transition ${
          disabled
            ? 'cursor-not-allowed border-[#d6d3d1] bg-[#f5f5f4] text-[#a8a29e]'
            : 'border-[#d6d3d1] bg-white text-[#292524] hover:bg-[#fafaf9]'
        }`}
      >
        Continuar con Google
      </button>

      {localError ? <p className="text-[11px] text-red-500">{localError}</p> : null}
    </div>
  )
}
