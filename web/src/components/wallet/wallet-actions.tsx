'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/button'
import { WalletInfo } from '@functions/types'
import { DelegateModal } from '@/components/modal/delegate-modal'
import { DeleteConfirmationModal } from '@/components/modal/delete-confirmation-modal'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { toast } from 'sonner'

interface WalletActionsProps {
  wallet: WalletInfo
  wallets: WalletInfo[]
  publicKey: string | null
  mintAddress: string | null
  tokenMetadata: {
    name: string
    shortName: string
    icon?: string
    iconText: string
    decimals: number
  } | null
  tokenMetadataError: string | null
  handleCanReceiveTokens: (publicKey: string) => void
  handleDelegate: (publicKey: string, amount: number) => void
  handleRevoke: (publicKey: string) => void
  handleRegisterWallet: () => void
  handleDelete: (publicKey: string) => void
  updatingWallet: string | null
  delegating: string | null
  revoking: string | null
  registering: string | null
  deleting: string | null
}

export function WalletActions({
  wallet,
  wallets,
  publicKey,
  mintAddress,
  tokenMetadata,
  tokenMetadataError,
  handleCanReceiveTokens,
  handleDelegate,
  handleRevoke,
  handleRegisterWallet,
  handleDelete,
  updatingWallet,
  delegating,
  revoking,
  registering,
  deleting,
}: WalletActionsProps) {
  const [showDelegateForm, setShowDelegateForm] = useState<string | null>(null)
  const [hasTokenAccount, setHasTokenAccount] = useState<boolean>(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { connected, publicKey: connectedWallet } = useWallet()

  const handleDelegateClick = async (walletPublicKey: string) => {
    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_HELIUS_API_URL!)
      const walletPubkey = new PublicKey(walletPublicKey)
      const mintPubkey = new PublicKey(mintAddress!)
      const tokenAccount = await getAssociatedTokenAddress(mintPubkey, walletPubkey)

      const accountInfo = await connection.getAccountInfo(tokenAccount)

      setHasTokenAccount(accountInfo !== null)
      setShowDelegateForm(walletPublicKey)
    } catch (error) {
      console.error('Error checking token account:', error)
      toast.error('Failed to get token account')
    }
  }

  const handleRevokeClick = (walletPublicKey: string) => {
    handleRevoke(walletPublicKey)
  }

  const handleDelegateSubmit = (amount: number) => {
    if (showDelegateForm) {
      handleDelegate(showDelegateForm, amount)
      setShowDelegateForm(null)
    }
  }

  const handleDeleteClick = async () => {
    setConfirmDelete(false)
    await handleDelete(wallet.publicKey)
  }

  return (
    <>
      <DelegateModal
        open={!!showDelegateForm}
        onOpenChange={(open) => !open && setShowDelegateForm(null)}
        onSubmit={handleDelegateSubmit}
        onCancel={() => setShowDelegateForm(null)}
        hasTokenAccount={hasTokenAccount}
        tokenMetadata={tokenMetadata}
        tokenMetadataError={tokenMetadataError}
      />
      <DeleteConfirmationModal
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={handleDeleteClick}
        onCancel={() => setConfirmDelete(false)}
        isDeleting={deleting === wallet.publicKey}
      />

      {/* Unregistered wallet */}
      {!wallet.isRegistered && (
        <div className="flex justify-end mt-2">
          <Button
            onClick={() => handleRegisterWallet()}
            disabled={
              registering === wallet.publicKey || !connected || connectedWallet?.toString() !== wallet.publicKey
            }
            variant="default"
            size="sm"
            className="disabled:opacity-50 cursor-pointer"
          >
            {registering === wallet.publicKey
              ? 'Registering...'
              : !connected || connectedWallet?.toString() !== wallet.publicKey
                ? 'Connect wallet to register'
                : 'Register wallet'}
          </Button>
        </div>
      )}

      {/* Registered wallet with delegation */}
      {wallet.isRegistered && wallet.delegatedTo && (
        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-2">
          {!wallet.canReceiveTokens && (
            <Button
              onClick={() => handleCanReceiveTokens(wallet.publicKey)}
              disabled={updatingWallet === wallet.publicKey || !!delegating}
              variant="outline"
              size="sm"
              className="disabled:opacity-50 cursor-pointer w-full sm:w-auto"
            >
              {updatingWallet === wallet.publicKey ? 'Updating...' : 'Receive tokens'}
            </Button>
          )}

          <div className={`flex flex-col sm:flex-row gap-2 ${wallet.canReceiveTokens ? 'sm:ml-auto' : ''}`}>
            <Button
              onClick={() => handleDelegateClick(wallet.publicKey)}
              disabled={
                !tokenMetadata ||
                delegating === wallet.publicKey ||
                !!revoking ||
                !connected ||
                connectedWallet?.toString() !== wallet.publicKey
              }
              variant="outline"
              size="sm"
              className="disabled:opacity-50 cursor-pointer w-full sm:w-auto"
            >
              {delegating === wallet.publicKey
                ? 'Updating...'
                : !connected || connectedWallet?.toString() !== wallet.publicKey
                  ? 'Connect to update delegation'
                  : 'Update delegation'}
            </Button>

            <Button
              onClick={() => handleRevokeClick(wallet.publicKey)}
              disabled={
                revoking === wallet.publicKey ||
                delegating === wallet.publicKey ||
                !!delegating ||
                !connected ||
                connectedWallet?.toString() !== wallet.publicKey
              }
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50 dark:text-red-300 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
            >
              {revoking === wallet.publicKey
                ? 'Revoking...'
                : !connected || connectedWallet?.toString() !== wallet.publicKey
                  ? 'Connect to revoke'
                  : 'Revoke'}
            </Button>
          </div>
        </div>
      )}

      {/* Registered wallet without delegation */}
      {wallet.isRegistered && !wallet.delegatedTo && (
        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 mt-2">
          {!wallet.canReceiveTokens && (
            <Button
              onClick={() => handleCanReceiveTokens(wallet.publicKey)}
              disabled={updatingWallet === wallet.publicKey}
              variant="outline"
              size="sm"
              className="disabled:opacity-50 cursor-pointer w-full sm:w-auto"
            >
              {updatingWallet === wallet.publicKey ? 'Updating...' : 'Receive tokens'}
            </Button>
          )}

          <div className={`flex flex-col sm:flex-row gap-2 ${wallet.canReceiveTokens ? 'sm:ml-auto' : ''}`}>
            {!wallets.some((w) => w.delegatedTo === publicKey) && (
              <Button
                onClick={() => handleDelegateClick(wallet.publicKey)}
                disabled={
                  !tokenMetadata ||
                  delegating === wallet.publicKey ||
                  !!revoking ||
                  !connected ||
                  connectedWallet?.toString() !== wallet.publicKey
                }
                variant="outline"
                size="sm"
                className="disabled:opacity-50 cursor-pointer w-full sm:w-auto"
              >
                {delegating === wallet.publicKey
                  ? 'Delegating...'
                  : !connected || connectedWallet?.toString() !== wallet.publicKey
                    ? 'Connect wallet to delegate'
                    : 'Delegate'}
              </Button>
            )}

            <Button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting === wallet.publicKey || !!delegating}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50 dark:text-red-300 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
            >
              {deleting === wallet.publicKey ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
