'use client'

import { WalletInfo, TokenMetadata } from '@functions/types'
import { WalletCard } from './wallet-card'

export function WalletList({
  wallets,
  tokenMetadata,
  publicKey,
  mintAddress,
}: {
  wallets: WalletInfo[]
  tokenMetadata: TokenMetadata | null
  publicKey: string | null
  mintAddress: string | null
}) {
  if (wallets.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600 dark:text-gray-300">No wallets registered</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {wallets.map((wallet) => (
        <WalletCard
          key={wallet.publicKey}
          wallet={wallet}
          tokenMetadata={tokenMetadata}
          tokenMetadataError={null}
          wallets={wallets}
          publicKey={publicKey}
          mintAddress={mintAddress}
        />
      ))}
    </div>
  )
}
