import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useAuth } from './useAuth'
import { UserProfile } from '@functions/types'
import { db } from '@/firebase'

export function useProfile() {
  const { user } = useAuth()
  const [profileData, setProfileData] = useState<UserProfile | null | undefined>(undefined)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) {
      setProfileData(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    const profileRef = doc(db, 'profiles', user.uid)

    const unsubscribe = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const profile = snap.data() as UserProfile
        setProfileData(profile)
      } else {
        setProfileData(null)
      }
      setProfileLoading(false)
    })

    return () => unsubscribe()
  }, [user?.uid])

  return {
    profile: {
      data: profileData,
      isLoading: profileLoading,
    },
  }
}
