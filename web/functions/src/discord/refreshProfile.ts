import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { RouteBases } from 'discord-api-types/v10'
import { discordBotToken, options } from '../consts'
import { handleFunctionError } from '../utils/errorHandler'
import type { RefreshProfileResponse, DiscordUser } from '../responses'
import { profileConverter } from '../utils/firestore'
import { requireAuth } from '../utils/auth'

export const refreshProfile = onCall(
  {
    ...options,
    secrets: [discordBotToken],
  },
  async (request): Promise<RefreshProfileResponse> => {
    try {
      const userId = requireAuth(request)

      const discordResponse = await fetch(`${RouteBases.api}/users/${userId}`, {
        headers: {
          Authorization: `Bot ${discordBotToken.value()}`,
        },
      })

      if (!discordResponse.ok) {
        if (discordResponse.status === 404 || discordResponse.status === 403) {
          throw new HttpsError('not-found', 'Discord user no longer valid')
        }
        throw new HttpsError('internal', 'Failed to fetch Discord user data')
      }

      const discordUser = (await discordResponse.json()) as DiscordUser

      const db = admin.firestore()
      const profileRef = db.collection('profiles').withConverter(profileConverter).doc(userId)

      await db.runTransaction(async (transaction) => {
        const profileDoc = await transaction.get(profileRef)

        if (!profileDoc.exists) {
          throw new HttpsError('invalid-argument', 'Bad request')
        }

        transaction.update(profileRef, {
          username: discordUser.username,
          avatar: discordUser.avatar,
          updatedAt: FieldValue.serverTimestamp(),
        })
      })

      return { success: true }
    } catch (error) {
      handleFunctionError('Refresh profile', error)
    }
  },
)
