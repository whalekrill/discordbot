import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Transaction, Connection, PublicKey } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createRevokeInstruction,
  createApproveCheckedInstruction,
} from '@solana/spl-token'
import { toast } from 'sonner'
import { useWalletActions } from './useWalletActions'

export function useDelegation() {
  const [delegating, setDelegating] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const { signTransaction, sendTransaction, connected } = useWallet()
  const { updateWallet } = useWalletActions()

  const handleDelegate = async (
    walletPublicKey: string,
    amount: number,
    tokenMetadata: { name: string; decimals: number },
    delegatePublicKey: string,
    mintAddress: string,
  ) => {
    if (!signTransaction || !connected) {
      toast.error('Please connect your wallet first')
      return
    }

    setDelegating(walletPublicKey)

    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_HELIUS_API_URL!)

      if (!delegatePublicKey || !mintAddress) {
        throw new Error('Cannot delegate')
      }

      if (!amount || amount <= 0) {
        throw new Error('Invalid amount')
      }

      const walletPubkey = new PublicKey(walletPublicKey)
      const delegatePubkey = new PublicKey(delegatePublicKey)
      const mintPubkey = new PublicKey(mintAddress)

      const tokenAccount = await getAssociatedTokenAddress(mintPubkey, walletPubkey)

      const decimals = tokenMetadata.decimals
      const rawAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)))

      const latestBlockhash = await connection.getLatestBlockhash()

      const tx = new Transaction().add(
        createApproveCheckedInstruction(tokenAccount, mintPubkey, delegatePubkey, walletPubkey, rawAmount, decimals),
      )

      tx.feePayer = walletPubkey
      tx.recentBlockhash = latestBlockhash.blockhash

      await sendTransaction(tx, connection)

      toast.success('Delegation successful')

      updateWallet({ publicKey: walletPublicKey, delegateAmount: amount, noToast: true })
    } catch (error) {
      console.error('Delegation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Delegation failed'
      toast.error(`Delegation failed: ${errorMessage}`)
    } finally {
      setDelegating(null)
    }
  }

  const handleRevoke = async (walletPublicKey: string, mintAddress: string) => {
    if (!signTransaction || !connected) {
      toast.error('Please connect your wallet first')
      return
    }

    setRevoking(walletPublicKey)

    try {
      const connection = new Connection(process.env.NEXT_PUBLIC_HELIUS_API_URL!)

      if (!mintAddress) {
        throw new Error('Delegation not configured')
      }

      const walletPubkey = new PublicKey(walletPublicKey)
      const mintPubkey = new PublicKey(mintAddress)

      const tokenAccount = await getAssociatedTokenAddress(mintPubkey, walletPubkey)

      const latestBlockhash = await connection.getLatestBlockhash()

      const tx = new Transaction().add(createRevokeInstruction(tokenAccount, walletPubkey, [], TOKEN_PROGRAM_ID))

      tx.feePayer = walletPubkey
      tx.recentBlockhash = latestBlockhash.blockhash

      await sendTransaction(tx, connection)

      toast.success('Delegation revoked successfully')

      updateWallet({
        publicKey: walletPublicKey,
        delegateAmount: null,
        noToast: true,
      })
    } catch (error) {
      console.error('Revoke error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Revoke failed'
      toast.error(`Revoke failed: ${errorMessage}`)
    } finally {
      setRevoking(null)
    }
  }

  return {
    delegating,
    revoking,
    handleDelegate,
    handleRevoke,
  }
}
