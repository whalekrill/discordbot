'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { functions } from '@/firebase'
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { DiscordCallbackResponse } from '@functions/responses'

function DiscordCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      // If on devtunnels, redirect to localhost
      if (window.location.hostname.includes('devtunnels.ms')) {
        window.location.href = `http://localhost:3000/login${window.location.search}`
        return
      }

      const code = searchParams.get('code')
      const state = searchParams.get('state')

      if (!code || !state) {
        toast.error('Discord login failed')
        router.push('/')
        return
      }

      try {
        const discordCallback = httpsCallable<{ code: string; state: string }, DiscordCallbackResponse>(
          functions,
          'discordCallback',
        )
        const result = await discordCallback({ code, state })

        if (result.data.success && result.data.token) {
          await signInWithCustomToken(getAuth(), result.data.token)
        }

        router.push('/')
      } catch {
        await signOut(getAuth())
        toast.error('Discord login failed')
        router.push('/')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return <div className="container mx-auto p-4">Loading...</div>
}

export default function DiscordCallbackPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-4">Loading...</div>}>
      <DiscordCallbackContent />
    </Suspense>
  )
}
