import { onCall } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { handleFunctionError } from '../utils/errorHandler'
import { heliusApiUrl, delegateMintAddress, delegatePublicKey, options } from '../consts'
import type { Wallet, WalletInfo, TokenMetadata } from '../types'
import type { GetWalletsResponse } from '../responses'
import { profileConverter } from '../utils/firestore'
import { requireAuth } from '../utils/auth'

interface GetAssetResponse {
  result?: {
    content?: {
      metadata?: {
        name?: string
        symbol?: string
        image?: string
      }
      files?: {
        uri?: string
      }[]
    }
    token_info?: {
      decimals?: number
    }
  }
}

interface ParsedTokenAccountInfo {
  parsed: {
    info: {
      isNative: boolean
      mint: string
      owner: string
      state: string
      tokenAmount: {
        amount: string
        decimals: number
        uiAmount: number
        uiAmountString: string
      }
      delegate?: string
      delegatedAmount?: {
        amount: string
        decimals: number
        uiAmount: number
        uiAmountString: string
      }
    }
  }
}

async function fetchTokenMetadata(): Promise<TokenMetadata | null> {
  try {
    const mintAddress = delegateMintAddress.value()
    if (!mintAddress) return null

    const response = await fetch(heliusApiUrl.value(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'token-metadata',
        method: 'getAsset',
        params: {
          id: mintAddress,
        },
      }),
    })

    const data = (await response.json()) as GetAssetResponse

    if (data.result && data.result.content && data.result.content.metadata) {
      const metadata = data.result.content.metadata
      const decimals = data.result.token_info?.decimals

      if (decimals === undefined || decimals === null) {
        return null
      }

      return {
        name: metadata.name || metadata.symbol || mintAddress,
        shortName: metadata.name || metadata.symbol || `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`,
        icon: data.result.content.files?.[0]?.uri || metadata.image,
        iconText: `${mintAddress[0]}${mintAddress[mintAddress.length - 1]}`,
        decimals,
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching token metadata:', error)
    return null
  }
}

async function fetchAllWalletInfo(wallets: Wallet[], userId: string): Promise<WalletInfo[]> {
  if (wallets.length === 0) return []

  try {
    const connection = new Connection(heliusApiUrl.value())
    const mintAddress = new PublicKey(delegateMintAddress.value())
    const now = Date.now()
    const tenSecondsAgo = now - 10000

    const walletsToUpdate: Wallet[] = []
    const allWallets: WalletInfo[] = []

    for (const wallet of wallets) {
      const shouldUpdateDelegation = wallet.delegateUpdatedAt === null || wallet.delegateUpdatedAt < tenSecondsAgo

      if (!shouldUpdateDelegation) {
        allWallets.push({
          ...wallet,
          isRegistered: true,
        })
        continue
      }

      try {
        const tokenAccountAddress = await getAssociatedTokenAddress(mintAddress, new PublicKey(wallet.publicKey))
        const parsedAccountInfo = await connection.getParsedAccountInfo(tokenAccountAddress)

        if (!parsedAccountInfo.value?.data) {
          allWallets.push({
            ...wallet,
            isRegistered: true,
          })
          continue
        }

        const accountData = (parsedAccountInfo.value.data as ParsedTokenAccountInfo).parsed.info
        const delegatedAmount = accountData.delegate ? accountData.delegatedAmount?.uiAmount || 0 : null
        const delegateAddress = accountData.delegate || null
        const delegateUpdatedAt = accountData.delegate ? now : null

        const needsUpdate = delegatedAmount !== wallet.delegateAmount || delegateAddress !== wallet.delegatedTo

        const updatedWallet = needsUpdate
          ? {
              ...wallet,
              delegatedTo: delegateAddress,
              delegateAmount: delegatedAmount,
              delegateUpdatedAt: delegateUpdatedAt,
            }
          : wallet

        if (needsUpdate) {
          walletsToUpdate.push(updatedWallet)
        }

        allWallets.push({
          ...updatedWallet,
          isRegistered: true,
        })
      } catch (error) {
        console.error(`Error fetching delegation info for wallet ${wallet.publicKey}:`, error)
        allWallets.push({
          ...wallet,
          isRegistered: true,
        })
      }
    }

    if (walletsToUpdate.length > 0) {
      const db = admin.firestore()
      const profileRef = db.collection('profiles').withConverter(profileConverter).doc(userId)

      await db.runTransaction(async (transaction) => {
        const profile = await transaction.get(profileRef)
        if (profile.exists) {
          const existingWallets = profile.data()?.wallets || []
          const finalWallets = existingWallets.map((existing) => {
            const updated = walletsToUpdate.find((u) => u.publicKey === existing.publicKey)
            return updated || existing
          })
          transaction.update(profileRef, { wallets: finalWallets })
        }
      })
    }

    return allWallets
  } catch (error) {
    console.error('Error fetching wallet info:', error)
    return wallets.map((wallet) => ({
      ...wallet,
      isRegistered: true,
    }))
  }
}

export const getWallets = onCall(options, async (request): Promise<GetWalletsResponse> => {
  try {
    const userId = requireAuth(request)
    const db = admin.firestore()

    const [tokenMetadata, profile] = await Promise.all([
      fetchTokenMetadata(),
      db.collection('profiles').withConverter(profileConverter).doc(userId).get(),
    ])

    let wallets: Wallet[] = []
    if (profile.exists) {
      const data = profile.data()
      wallets = data?.wallets || []
    }

    const allWallets = await fetchAllWalletInfo(wallets, userId)

    return {
      wallets: allWallets,
      tokenMetadata,
      publicKey: delegatePublicKey.value(),
      mintAddress: delegateMintAddress.value(),
    }
  } catch (error) {
    handleFunctionError('Get wallets', error)
  }
})
