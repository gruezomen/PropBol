'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GoogleCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/sign-up')
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f4] px-4">
      <div className="w-full max-w-md rounded-md border border-[#e7e5e4] bg-white px-6 py-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-[#292524]">Autenticación con Google</h1>
        <p className="mt-3 text-sm text-[#57534e]">Redirigiendo...</p>
      </div>
    </main>
  )
}
