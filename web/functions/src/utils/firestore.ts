import * as admin from 'firebase-admin'
import type { UserProfile } from '../types'

export const profileConverter = {
  toFirestore(profile: UserProfile): admin.firestore.DocumentData {
    return profile
  },
  fromFirestore(snapshot: admin.firestore.QueryDocumentSnapshot): UserProfile {
    return snapshot.data() as UserProfile
  },
}
