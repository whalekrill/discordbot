import { useQuery } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletInfo, TokenMetadata } from '@functions/types'
import { functions } from '@/firebase'
import { httpsCallable } from 'firebase/functions'

interface GetWalletsResponse {
  wallets: WalletInfo[]
  tokenMetadata: TokenMetadata | null
  publicKey: string | null
  mintAddress: string | null
}

interface UnregisteredWallet extends WalletInfo {
  isRegistered: false
}

function createUnregisteredWallet(publicKey: string): UnregisteredWallet {
  return {
    publicKey,
    canReceiveTokens: false,
    registeredAt: Date.now(),
    delegatedTo: null,
    delegateAmount: null,
    delegateUpdatedAt: null,
    isRegistered: false,
  }
}

export function useWallets() {
  const { user, loading } = useAuth()
  const { connected, publicKey: connectedWallet } = useWallet()

  const getWalletsFunction = httpsCallable<object, GetWalletsResponse>(functions, 'getWallets')

  const walletsQuery = useQuery({
    queryKey: ['wallets', user?.uid],
    queryFn: async (): Promise<GetWalletsResponse> => {
      if (!user?.uid) {
        return {
          wallets: [],
          tokenMetadata: null,
          publicKey: null,
          mintAddress: null,
        }
      }

      const result = await getWalletsFunction({})
      return result.data
    },
    enabled: !loading && !!user?.uid,
    staleTime: 5 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  })

  const combinedWallets: WalletInfo[] = (() => {
    if (walletsQuery.isLoading && !walletsQuery.data) {
      return []
    }

    const registeredWallets = walletsQuery.data?.wallets || []

    if (connected && connectedWallet) {
      const connectedWalletAddress = connectedWallet.toString()
      const isConnectedWalletRegistered = registeredWallets.some((w) => w.publicKey === connectedWalletAddress)

      if (!isConnectedWalletRegistered) {
        const unregisteredWallet = createUnregisteredWallet(connectedWalletAddress)
        return [unregisteredWallet, ...registeredWallets]
      }
    }

    return registeredWallets
  })()

  return {
    wallets: combinedWallets,
    tokenMetadata: walletsQuery.data?.tokenMetadata || null,
    publicKey: walletsQuery.data?.publicKey || null,
    mintAddress: walletsQuery.data?.mintAddress || null,
    isLoading: walletsQuery.isLoading,
    error: walletsQuery.error,
    refetch: walletsQuery.refetch,
  }
}
