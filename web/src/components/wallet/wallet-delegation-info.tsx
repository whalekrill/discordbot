import { WalletInfo } from '@functions/types'
import { formatAddressEllipsis } from '@/utils/address'
import { DISCORD_BOT_NAME } from '@/consts'
import Image from 'next/image'

interface WalletDelegationInfoProps {
  wallet: WalletInfo
  tokenMetadata: {
    name: string
    shortName: string
    icon?: string
    iconText: string
    decimals: number
  } | null
  tokenMetadataError: string | null
  publicKey: string | null
}

export function WalletDelegationInfo({
  wallet,
  tokenMetadata,
  tokenMetadataError,
  publicKey,
}: WalletDelegationInfoProps) {
  if (wallet.delegateAmount === null || wallet.delegatedTo === null) {
    return null
  }

  return (
    <div>
      <div className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Delegated</div>
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
        <div className="space-y-2 text-sm">
          {wallet.delegatedTo === publicKey && (
            <div className="text-gray-900 dark:text-gray-100">{DISCORD_BOT_NAME}</div>
          )}
          <div className="font-mono text-xs text-gray-600 dark:text-gray-400">
            <span className="hidden sm:inline">{wallet.delegatedTo || 'Unknown'}</span>
            <span className="sm:hidden">
              {wallet.delegatedTo ? formatAddressEllipsis(wallet.delegatedTo) : 'Unknown'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {tokenMetadataError ? (
                <div className="text-red-600 dark:text-red-400 text-xs">Token Error</div>
              ) : tokenMetadata ? (
                <>
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    {tokenMetadata.icon ? (
                      <Image
                        src={tokenMetadata.icon}
                        alt={tokenMetadata.name}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-white font-bold text-xs">{tokenMetadata.iconText}</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="sm:hidden">{tokenMetadata.shortName}</span>
                    <span className="hidden sm:inline">{tokenMetadata.name}</span>
                  </span>
                </>
              ) : (
                <div className="text-xs text-gray-500">Loading token...</div>
              )}
            </div>
            {tokenMetadata && (
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {wallet.delegateAmount.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
