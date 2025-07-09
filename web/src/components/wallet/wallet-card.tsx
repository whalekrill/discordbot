'use client'

import { WalletInfo } from '@functions/types'
import { useDelegation } from '@/hooks/useDelegation'
import { useWalletActions } from '@/hooks/useWalletActions'
import { WalletHeader } from './wallet-header'
import { WalletDelegationInfo } from './wallet-delegation-info'
import { WalletActions } from './wallet-actions'

interface WalletCardProps {
  wallet: WalletInfo
  tokenMetadata: {
    name: string
    shortName: string
    icon?: string
    iconText: string
    decimals: number
  } | null
  tokenMetadataError: string | null
  wallets: WalletInfo[]
  publicKey: string | null
  mintAddress: string | null
}

export function WalletCard({
  wallet,
  tokenMetadata,
  tokenMetadataError,
  wallets,
  publicKey,
  mintAddress,
}: WalletCardProps) {
  const { delegating, revoking, handleDelegate, handleRevoke } = useDelegation()
  const { updatingWallet, deleting, registering, handleCanReceiveTokens, handleRegisterWallet, handleDelete } =
    useWalletActions()

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="flex flex-col gap-3">
        <WalletHeader wallet={wallet} publicKey={publicKey} />

        {wallet.isRegistered && wallet.delegatedTo && (
          <WalletDelegationInfo
            wallet={wallet}
            tokenMetadata={tokenMetadata}
            tokenMetadataError={tokenMetadataError}
            publicKey={publicKey}
          />
        )}

        <WalletActions
          wallet={wallet}
          wallets={wallets}
          publicKey={publicKey}
          mintAddress={mintAddress}
          tokenMetadata={tokenMetadata}
          tokenMetadataError={tokenMetadataError}
          handleCanReceiveTokens={handleCanReceiveTokens}
          handleDelegate={(walletPublicKey, amount) =>
            handleDelegate(walletPublicKey, amount, tokenMetadata!, publicKey!, mintAddress!)
          }
          handleRevoke={(walletPublicKey) => handleRevoke(walletPublicKey, mintAddress!)}
          handleRegisterWallet={handleRegisterWallet}
          handleDelete={handleDelete}
          updatingWallet={updatingWallet}
          delegating={delegating}
          revoking={revoking}
          registering={registering}
          deleting={deleting}
        />
      </div>
    </div>
  )
}
