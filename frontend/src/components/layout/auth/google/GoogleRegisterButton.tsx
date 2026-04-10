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
        className={`flex w-full items-center justify-center gap-3 rounded-md border px-4 py-2.5 text-[13px] font-semibold transition ${
          disabled
            ? 'cursor-not-allowed border-[#d6d3d1] bg-[#f5f5f4] text-[#a8a29e]'
            : 'border-[#d6d3d1] bg-white text-[#292524] hover:bg-[#fafaf9]'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            fill="#FFC107"
            d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.219 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
          />
          <path
            fill="#FF3D00"
            d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 7.053 29.277 5 24 5c-7.682 0-14.318 4.337-17.694 10.691z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.176 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.156 35.091 26.715 36 24 36c-5.202 0-9.629-3.326-11.289-7.946l-6.522 5.025C9.53 39.556 16.227 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.611 20.083H42V20H24v8h11.303c-.793 2.238-2.231 4.166-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
          />
        </svg>

        <span>Continuar con Google</span>
      </button>

      {localError ? <p className="text-[11px] text-red-500">{localError}</p> : null}
    </div>
  )
}
