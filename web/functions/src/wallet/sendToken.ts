import { onRequest } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { PublicKey } from '@solana/web3.js'
import { delegatePublicKey, apiKey, options } from '../consts'
import * as nacl from 'tweetnacl'
import { handleRequestError } from '../utils/errorHandler'
import { profileConverter } from '../utils/firestore'
import { SendTokenRequestSchema } from '../validation'

export const sendToken = onRequest(
  {
    ...options,
    secrets: [apiKey],
  },
  async (req, res) => {
    try {
      const key = req.headers['api-key']
      if (!key || key !== apiKey.value()) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      const validationResult = SendTokenRequestSchema.safeParse(req.body)

      if (!validationResult.success) {
        res.status(400).json({ error: 'Bad request' })
        return
      }

      const { senderDiscordId, recipientDiscordId, message, signature } = validationResult.data

      const match = message.match(/at (\d+)$/)
      if (!match) {
        res.status(400).json({ error: 'Bad request' })
        return
      }

      const timestamp = parseInt(match[1])
      const now = Date.now()
      const thirtySeconds = 30 * 1000

      if (now - timestamp > thirtySeconds) {
        res.status(400).json({ error: 'Bad request' })
        return
      }

      const delegatePubKey = new PublicKey(delegatePublicKey.value())
      const messageBytes = new TextEncoder().encode(message)
      const signatureBytes = new Uint8Array(signature)

      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, delegatePubKey.toBytes())

      if (!isValid) {
        res.status(400).json({ error: 'Bad request' })
        return
      }

      const db = admin.firestore()

      const result = await db.runTransaction(async (transaction) => {
        const senderRef = db.collection('profiles').withConverter(profileConverter).doc(senderDiscordId)
        const recipientRef = db.collection('profiles').withConverter(profileConverter).doc(recipientDiscordId)

        const [senderProfile, recipientProfile] = await Promise.all([
          transaction.get(senderRef),
          transaction.get(recipientRef),
        ])

        const sender = senderProfile.data()
        const recipient = recipientProfile.data()

        return {
          sender: (sender?.wallets || [])
            .filter((wallet) => wallet.delegatedTo === delegatePublicKey.value())
            .map((wallet) => wallet.publicKey),
          recipient: (recipient?.wallets || [])
            .filter((wallet) => wallet.canReceiveTokens === true)
            .map((wallet) => wallet.publicKey),
        }
      })

      res.json(result)
    } catch (error) {
      handleRequestError('Send token', error, res)
    }
  },
)
