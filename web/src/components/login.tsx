'use client'

import { useState } from 'react'
import { AppHero } from '@/components/app-hero'
import { Button } from '@/components/ui/button'
import { DISCORD_BOT_NAME } from '@/consts'

export function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const discordLoginUrl =
    process.env.NODE_ENV === 'production'
      ? `${process.env.NEXT_PUBLIC_URL}/discordLogin`
      : `${process.env.NEXT_PUBLIC_FIREBASE_FUNCTION_URL}/discordLogin`

  const handleLogin = () => {
    setIsLoading(true)
    window.location.href = discordLoginUrl
  }

  return (
    <AppHero title={DISCORD_BOT_NAME}>
      <div className="pt-4 flex items-center justify-center gap-2">
        <Button variant="outline" onClick={handleLogin} disabled={isLoading} className="cursor-pointer">
          {isLoading ? 'Logging in...' : 'Log in with Discord'}
        </Button>
      </div>
    </AppHero>
  )
}
