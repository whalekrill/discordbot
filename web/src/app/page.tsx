'use client'
import { Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { DiscordSignIn } from '@/components/auth/discord-signin'
import { Dashboard } from '@/components/dashboard'
import { Login } from '@/components/login'

function Content() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return <div className="container mx-auto p-4">Loading...</div>
  }

  return (
    <>
      <DiscordSignIn />
      {user ? <Dashboard /> : <Login />}
    </>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="container mx-auto p-4">Loading...</div>}>
      <Content />
    </Suspense>
  )
}
