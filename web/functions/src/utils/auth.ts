import * as admin from 'firebase-admin'
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https'
import type { UserProfile } from '../types'
import { profileConverter } from '../utils/firestore'

export function requireAuth(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Forbidden')
  }
  return request.auth.uid
}

export async function getUserProfile(
  userId: string,
): Promise<{ data: UserProfile; ref: admin.firestore.DocumentReference }> {
  const db = admin.firestore()
  const profile = await db.collection('profiles').withConverter(profileConverter).doc(userId).get()

  if (!profile.exists) {
    throw new HttpsError('invalid-argument', 'Bad request')
  }

  return {
    data: profile.data()!,
    ref: profile.ref,
  }
}
