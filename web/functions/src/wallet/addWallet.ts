import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { PublicKey } from '@solana/web3.js'
import * as nacl from 'tweetnacl'
import { handleFunctionError } from '../utils/errorHandler'
import type { AddWalletResponse } from '../responses'
import { AddWalletRequestSchema } from '../validation'
import { profileConverter } from '../utils/firestore'
import { options } from '../consts'
import { requireAuth } from '../utils/auth'

export const addWallet = onCall(options, async (request): Promise<AddWalletResponse> => {
  try {
    const validationResult = AddWalletRequestSchema.safeParse(request.data)

    if (!validationResult.success) {
      throw new HttpsError('invalid-argument', 'Missing required fields')
    }

    const { publicKey, message, signature } = validationResult.data

    const userId = requireAuth(request)

    const pubKey = new PublicKey(publicKey)
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = new Uint8Array(signature)

    const isValidSignature = nacl.sign.detached.verify(messageBytes, signatureBytes, pubKey.toBytes())

    if (!isValidSignature) {
      throw new HttpsError('invalid-argument', 'Invalid signature')
    }

    const db = admin.firestore()
    const profileRef = db.collection('profiles').withConverter(profileConverter).doc(userId)

    const result = await db.runTransaction(async (transaction) => {
      const profileDoc = await transaction.get(profileRef)

      if (!profileDoc.exists) {
        throw new HttpsError('invalid-argument', 'Bad request')
      }

      const existingWallets = profileDoc.data()?.wallets || []

      const newWallet = {
        publicKey,
        canReceiveTokens: existingWallets.length === 0,
        registeredAt: Date.now() / 1000,
        delegatedTo: null,
        delegateAmount: null,
        delegateUpdatedAt: null,
      }

      transaction.update(profileRef, {
        wallets: [newWallet, ...existingWallets],
      })

      return newWallet
    })

    return {
      success: true,
      message: 'Wallet verified and added successfully',
      wallet: result,
    }
  } catch (error) {
    handleFunctionError('Add wallet', error)
  }
})
