'use client'

import { AppModal } from '@/components/app-modal'
import Image from 'next/image'
import { formatAddressEllipsis } from '@/utils/address'
import { DISCORD_BOT_NAME } from '@/consts'
import { useState } from 'react'

interface DelegateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (amount: number) => void
  onCancel: () => void
  hasTokenAccount: boolean
  tokenMetadata: {
    name: string
    shortName: string
    icon?: string
    iconText: string
    decimals: number
  } | null
  tokenMetadataError: string | null
}

export function DelegateModal({
  open,
  onOpenChange,
  onSubmit,
  onCancel,
  hasTokenAccount,
  tokenMetadata,
  tokenMetadataError,
}: DelegateModalProps) {
  const [delegateAmount, setDelegateAmount] = useState<number | null>(null)

  const handleSubmit = () => {
    if (delegateAmount) {
      onSubmit(delegateAmount)
    }
  }

  const getTokenSymbolFallback = () => {
    const address = process.env.NEXT_PUBLIC_DELEGATE_MINT_ADDRESS || ''
    return `${address[0]}${address[address.length - 1]}`.toUpperCase()
  }
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Delegate token account"
      submit={handleSubmit}
      submitDisabled={!delegateAmount || delegateAmount <= 0 || !!tokenMetadataError || !hasTokenAccount}
      submitLabel="Delegate"
      cancel={onCancel}
      cancelLabel="Cancel"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Delegate</label>
          <div className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-sm">
            <div className="text-gray-500 dark:text-gray-400">{DISCORD_BOT_NAME}</div>
            <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span className="sm:hidden">{formatAddressEllipsis(process.env.NEXT_PUBLIC_DELEGATE_PUBLIC_KEY)}</span>
              <span className="hidden sm:inline">{process.env.NEXT_PUBLIC_DELEGATE_PUBLIC_KEY}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Token</label>
          <div className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-600 text-sm">
            {tokenMetadataError ? (
              <div className="text-red-600 dark:text-red-400">
                <div className="font-bold">Token Error</div>
                <div className="text-xs mt-1">{tokenMetadataError}</div>
              </div>
            ) : tokenMetadata ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  {tokenMetadata.icon ? (
                    <Image
                      src={tokenMetadata.icon}
                      alt={tokenMetadata.name}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  ) : (
                    <span className="text-white font-bold text-xs">{tokenMetadata.iconText}</span>
                  )}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  <span className="sm:hidden">{tokenMetadata.shortName}</span>
                  <span className="hidden sm:inline">{tokenMetadata.name}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">{getTokenSymbolFallback()}</span>
                </div>
                <div className="text-gray-500 dark:text-gray-400 font-mono text-xs">
                  <span className="sm:hidden">
                    {formatAddressEllipsis(process.env.NEXT_PUBLIC_DELEGATE_MINT_ADDRESS)}
                  </span>
                  <span className="hidden sm:inline">{process.env.NEXT_PUBLIC_DELEGATE_MINT_ADDRESS}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Amount</label>
          <input
            type="number"
            value={delegateAmount || ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : null

              if (value !== null && value < 1) {
                // Not less than 1
                return
              } else {
                setDelegateAmount(value)
              }
            }}
            onKeyDown={(e) => {
              // Prevent negative sign, e/E (scientific notation), and decimal point
              if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '.') {
                e.preventDefault()
              }
            }}
            placeholder="Enter number of tokens"
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            min="1"
          />
          {!hasTokenAccount ? (
            <p className="text-xs mt-1 text-red-600 dark:text-red-300">
              No {tokenMetadata?.shortName || 'tokens'} to delegate
            </p>
          ) : (
            <p className="text-xs mt-1 text-gray-500">Grant permission to {DISCORD_BOT_NAME} to send this amount</p>
          )}
        </div>
      </div>
    </AppModal>
  )
}
