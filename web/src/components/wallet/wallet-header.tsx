import { WalletInfo } from '@functions/types'
import { formatAddressEllipsis } from '@/utils/address'

interface WalletHeaderProps {
  wallet: WalletInfo
  publicKey?: string | null
}

export function WalletHeader({ wallet, publicKey }: WalletHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-h-[1.5rem]">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{formatAddressEllipsis(wallet.publicKey)}</p>
      </div>

      <div className="flex gap-2 text-xs">
        {!wallet.isRegistered && (
          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
            Not registered
          </span>
        )}
        {wallet.delegatedTo === publicKey && (
          <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-600 dark:text-green-100">
            Send ✓
          </span>
        )}
        {wallet.canReceiveTokens && (
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-blue-100">
            Receive ✓
          </span>
        )}
      </div>
    </div>
  )
}
