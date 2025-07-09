import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { handleFunctionError } from '../utils/errorHandler'
import type { DeleteWalletResponse } from '../responses'
import { DeleteWalletRequestSchema } from '../validation'
import { profileConverter } from '../utils/firestore'
import { options } from '../consts'
import { requireAuth } from '../utils/auth'

export const deleteWallet = onCall(options, async (request): Promise<DeleteWalletResponse> => {
  try {
    const validationResult = DeleteWalletRequestSchema.safeParse(request.data)

    if (!validationResult.success) {
      throw new HttpsError('invalid-argument', 'Missing required fields')
    }

    const { publicKey } = validationResult.data

    const userId = requireAuth(request)

    const db = admin.firestore()
    const profileRef = db.collection('profiles').withConverter(profileConverter).doc(userId)

    await db.runTransaction(async (transaction) => {
      const profileDoc = await transaction.get(profileRef)

      if (!profileDoc.exists) {
        throw new HttpsError('invalid-argument', 'Bad request')
      }

      const wallets = profileDoc.data()?.wallets || []
      const walletExists = wallets.find((w) => w.publicKey === publicKey)

      if (!walletExists) {
        throw new HttpsError('invalid-argument', 'Bad request')
      }

      const updatedWallets = wallets.filter((w) => w.publicKey !== publicKey)

      if (walletExists.canReceiveTokens && updatedWallets.length > 0) {
        updatedWallets.forEach((wallet, index) => {
          wallet.canReceiveTokens = index === 0
        })
      }

      transaction.update(profileRef, { wallets: updatedWallets })
    })

    return {
      success: true,
      message: 'Wallet deleted successfully',
    }
  } catch (error) {
    handleFunctionError('Delete wallet', error)
  }
})
