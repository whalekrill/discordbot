import { useEffect, useState } from 'react'
import { User, onIdTokenChanged, signInWithCustomToken, signOut } from 'firebase/auth'
import { auth, functions } from '@/firebase'
import { httpsCallable } from 'firebase/functions'
import { toast } from 'sonner'
import { RefreshProfileResponse } from '@functions/responses'
import { useQuery } from '@tanstack/react-query'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const profileQuery = useQuery({
    queryKey: ['refreshProfile', user?.uid],
    queryFn: async () => {
      if (!user) return null

      const refreshProfile = httpsCallable<object, RefreshProfileResponse>(functions, 'refreshProfile')
      const result = await refreshProfile({})
      return result.data
    },
    enabled: !loading && !!user,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (profileQuery.isError && user) {
      const error = profileQuery.error as { code?: string }
      if (error?.code === 'functions/not-found') {
        signOut(auth)
      }
    }
  }, [profileQuery.isError, profileQuery.error, user])

  const signInWithToken = async (token: string) => {
    try {
      await signInWithCustomToken(auth, token)
      window.history.replaceState({}, document.title, window.location.pathname)
    } catch (error) {
      toast.error('Failed to sign in with Discord')
      throw error
    }
  }

  const userId = user?.uid || null

  return {
    user,
    userId,
    loading,
    signInWithToken,
    isAuthenticated: !!user,
  }
}
