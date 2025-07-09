'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export function DiscordSignIn() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { signInWithToken } = useAuth()

  useEffect(() => {
    if (token) {
      signInWithToken(token)
    }
  }, [token, signInWithToken])

  if (token) {
    return <div className="container mx-auto p-4">Loading...</div>
  }

  return null
}
