import { useWallet } from '@solana/wallet-adapter-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState } from 'react'
import { functions } from '@/firebase'
import { httpsCallable } from 'firebase/functions'
import { WalletInfo } from '@functions/types'
import { ResponseData } from '@functions/responses'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './useAuth'
import { DISCORD_BOT_NAME } from '@/consts'

type WalletMutationError = Error & { responseData?: ResponseData }

export function useWalletActions() {
  const { signMessage, publicKey: connectedWallet } = useWallet()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [pendingRegistration, setPendingRegistration] = useState<string | null>(null)
  const [pendingDeletion, setPendingDeletion] = useState<string | null>(null)
  const [pendingUpdate, setPendingUpdate] = useState<string | null>(null)

  const updateWalletMutation = useMutation<
    ResponseData,
    WalletMutationError,
    {
      publicKey: string
      canReceiveTokens?: boolean
      delegateAmount?: number | null
      noToast?: boolean
    },
    { previousData: { wallets: WalletInfo[]; publicKey: string } | undefined }
  >({
    mutationFn: async (variables) => {
      const { publicKey, canReceiveTokens, delegateAmount } = variables
      if (!user) throw new Error('Please login first')

      const updateWallet = httpsCallable(functions, 'updateWallet')
      const requestData: Record<string, unknown> = {
        publicKey,
      }

      if (canReceiveTokens !== undefined) {
        requestData.canReceiveTokens = canReceiveTokens
      }

      if (delegateAmount !== undefined) {
        requestData.delegateAmount = delegateAmount
      }

      const result = await updateWallet(requestData)

      const responseData = result.data as ResponseData
      if (!responseData.success) {
        const error: WalletMutationError = new Error(responseData.error || 'Failed to update wallet to receive tokens')
        error.responseData = responseData
        throw error
      }
      return responseData
    },
    onMutate: async (variables) => {
      setPendingUpdate(variables.publicKey)

      if (variables.delegateAmount !== undefined) {
        await queryClient.cancelQueries({ queryKey: ['wallets', user?.uid] })

        const previousData = queryClient.getQueryData(['wallets', user?.uid]) as
          | { wallets: WalletInfo[]; publicKey: string }
          | undefined

        queryClient.setQueryData(
          ['wallets', user?.uid],
          (old: { wallets: WalletInfo[]; publicKey: string } | undefined) => {
            if (!old) return old

            return {
              ...old,
              wallets: old.wallets.map((wallet: WalletInfo) =>
                wallet.publicKey === variables.publicKey
                  ? {
                      ...wallet,
                      delegateAmount: variables.delegateAmount,
                      delegatedTo: variables.delegateAmount !== null ? old.publicKey : null,
                      delegateUpdatedAt: Date.now(),
                    }
                  : wallet,
              ),
            }
          },
        )

        return { previousData }
      }
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['wallets', user?.uid], context.previousData)
      }
      toast.error(err.message)
    },
    onSettled: async (data, error, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['wallets', user?.uid] })
      if (!error && !variables.noToast) {
        toast.success('Wallet updated successfully')
      }
      setPendingUpdate(null)
    },
  })

  const deleteWalletMutation = useMutation<ResponseData, WalletMutationError, string>({
    mutationFn: async (walletPublicKey: string) => {
      if (!user) throw new Error('Please login first')

      const deleteWallet = httpsCallable(functions, 'deleteWallet')
      const result = await deleteWallet({
        publicKey: walletPublicKey,
      })

      const responseData = result.data as ResponseData
      if (!responseData.success) {
        const error: WalletMutationError = new Error(responseData.error || 'Failed to delete wallet')
        error.responseData = responseData
        throw error
      }
      return responseData
    },
    onMutate: async (walletPublicKey: string) => {
      setPendingDeletion(walletPublicKey)
    },
    onError: (err) => {
      toast.error(err.message || 'Unknown error occurred')
    },
    onSettled: async (data, error) => {
      await queryClient.invalidateQueries({ queryKey: ['wallets', user?.uid] })
      if (!error) {
        toast.success('Wallet deleted successfully')
        registerWalletMutation.reset()
      }
      setPendingDeletion(null)
    },
  })

  const registerWalletMutation = useMutation<ResponseData, WalletMutationError, void>({
    mutationFn: async () => {
      if (!connectedWallet || !signMessage) {
        throw new Error('Please connect your wallet first')
      }

      if (!user) throw new Error('Please login first')

      const message = `Register wallet with ${DISCORD_BOT_NAME} ${connectedWallet.toString()}`
      const encodedMessage = new TextEncoder().encode(message)
      const signature = await signMessage(encodedMessage)

      const addWallet = httpsCallable(functions, 'addWallet')
      const result = await addWallet({
        publicKey: connectedWallet.toString(),
        message,
        signature: Array.from(signature),
      })

      const responseData = result.data as ResponseData
      if (!responseData.success) {
        const error: WalletMutationError = new Error(responseData.error || 'Registration failed')
        error.responseData = responseData
        throw error
      }
      return responseData
    },
    onMutate: async () => {
      if (!connectedWallet) return
      setPendingRegistration(connectedWallet.toString())
    },
    onError: (err) => {
      toast.error(err.message || 'Unknown error occurred')
    },
    onSettled: async (data, error) => {
      await queryClient.invalidateQueries({ queryKey: ['wallets', user?.uid] })
      if (!error) {
        toast.success('Wallet registered successfully')
      }
      setPendingRegistration(null)
    },
  })

  const handleCanReceiveTokens = (publicKey: string) => {
    updateWalletMutation.mutate({ publicKey, canReceiveTokens: true })
  }

  return {
    handleCanReceiveTokens,
    updateWallet: updateWalletMutation.mutate,
    handleDelete: deleteWalletMutation.mutate,
    handleRegisterWallet: registerWalletMutation.mutate,
    updatingWallet: pendingUpdate,
    deleting: pendingDeletion,
    registering: pendingRegistration,
  }
}
