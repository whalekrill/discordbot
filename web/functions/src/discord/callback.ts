import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { RESTPostOAuth2AccessTokenResult, RouteBases } from 'discord-api-types/v10'
import { discordClientId, discordClientSecret, nextPublicUrl, options } from '../consts'
import { handleFunctionError } from '../utils/errorHandler'
import type { DiscordCallbackResponse, DiscordUser } from '../responses'
import { profileConverter } from '../utils/firestore'
import { DiscordCallbackRequestSchema } from '../validation'

export const discordCallback = onCall(
  {
    ...options,
    secrets: [discordClientSecret],
  },
  async (request): Promise<DiscordCallbackResponse> => {
    try {
      const validationResult = DiscordCallbackRequestSchema.safeParse(request.data)

      if (!validationResult.success) {
        throw new HttpsError('invalid-argument', 'Bad request')
      }

      const { code, state } = validationResult.data

      const db = admin.firestore()
      const stateDoc = await db.collection('discord-oauth').doc(state).get()

      if (!stateDoc.exists) {
        throw new HttpsError('invalid-argument', 'Bad request')
      }

      await stateDoc.ref.delete()

      const params = new URLSearchParams({
        client_id: discordClientId.value(),
        client_secret: discordClientSecret.value(),
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${nextPublicUrl.value()}/login`,
      })

      const tokenResponse = await fetch(`${RouteBases.api}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      })

      if (!tokenResponse.ok) {
        const error: unknown = await tokenResponse.json()
        console.error({
          severity: 'ERROR',
          message: 'Discord token exchange failed',
          context: 'discordCallback',
          httpStatus: tokenResponse.status,
          error,
          timestamp: new Date().toISOString(),
        })
        throw new HttpsError('internal', 'Authentication failed')
      }

      const tokenData = (await tokenResponse.json()) as RESTPostOAuth2AccessTokenResult
      const { access_token } = tokenData

      const userResponse = await fetch(`${RouteBases.api}/users/@me`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })

      if (!userResponse.ok) {
        const error: unknown = await userResponse.json()
        console.error({
          severity: 'ERROR',
          message: 'Discord user fetch failed',
          context: 'discordCallback',
          httpStatus: userResponse.status,
          error,
          timestamp: new Date().toISOString(),
        })
        throw new HttpsError('internal', 'Authentication failed')
      }

      const user = (await userResponse.json()) as DiscordUser

      const customToken = await admin.auth().createCustomToken(user.id, {
        discord_id: user.id,
        username: user.username,
      })

      await db.collection('profiles').withConverter(profileConverter).doc(user.id).set(
        {
          username: user.username,
          avatar: user.avatar,
        },
        { merge: true },
      )

      return {
        success: true,
        token: customToken,
        username: user.username,
        discordId: user.id,
      }
    } catch (error) {
      handleFunctionError('Discord callback', error)
    }
  },
)
