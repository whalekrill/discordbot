import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { handleFunctionError } from '../utils/errorHandler'
import type { UpdateWalletResponse } from '../responses'
import { UpdateWalletRequestSchema } from '../validation'
import { profileConverter } from '../utils/firestore'
import { options, delegatePublicKey } from '../consts'
import { requireAuth } from '../utils/auth'

export const updateWallet = onCall(options, async (request): Promise<UpdateWalletResponse> => {
  try {
    const validationResult = UpdateWalletRequestSchema.safeParse(request.data)

    if (!validationResult.success) {
      throw new HttpsError('invalid-argument', 'Missing required fields')
    }

    const { publicKey, canReceiveTokens, delegateAmount } = validationResult.data

    const userId = requireAuth(request)

    const db = admin.firestore()
    const profileRef = db.collection('profiles').withConverter(profileConverter).doc(userId)

    await db.runTransaction(async (transaction) => {
      const profileDoc = await transaction.get(profileRef)

      if (!profileDoc.exists) {
        throw new HttpsError('invalid-argument', 'Bad request')
      }

      const wallets = profileDoc.data()?.wallets || []
      const walletExists = wallets.find((w: { publicKey: string }) => w.publicKey === publicKey)

      if (!walletExists) {
        throw new HttpsError('invalid-argument', 'Bad request')
      }

      const updatedWallets = wallets.map((wallet) => {
        const w = { ...wallet }

        if (wallet.publicKey === publicKey) {
          if (canReceiveTokens !== undefined) {
            w.canReceiveTokens = canReceiveTokens
          }
          if (delegateAmount !== undefined) {
            w.delegateAmount = delegateAmount
            w.delegatedTo = delegateAmount !== null && delegateAmount > 0 ? delegatePublicKey.value() : null
            w.delegateUpdatedAt = Date.now()
          }
        } else {
          if (canReceiveTokens === true) {
            w.canReceiveTokens = false
          }
        }

        return w
      })

      transaction.update(profileRef, { wallets: updatedWallets })
    })

    return {
      success: true,
      message: 'Wallet updated successfully',
    }
  } catch (error) {
    handleFunctionError('Update wallet', error)
  }
})
