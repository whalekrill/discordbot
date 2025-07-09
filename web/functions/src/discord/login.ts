import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { discordClientId, nextPublicUrl, options } from '../consts'
import { handleRequestError } from '../utils/errorHandler'

export const discordLogin = onRequest(options, async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const state = crypto.randomUUID()

  const db = admin.firestore()
  const now = new Date()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
  await db.collection('discord-oauth').doc(state).set({
    createdAt: now,
    ttl: expiresAt,
  })

  const params = new URLSearchParams({
    client_id: discordClientId.value(),
    response_type: 'code',
    redirect_uri: `${nextPublicUrl.value()}/login`,
    scope: 'identify',
    state: state,
  })

  const url = `https://discord.com/api/oauth2/authorize?${params.toString()}`

  try {
    res.redirect(url)
  } catch (error) {
    handleRequestError('Discord login', error, res)
  }
})
