'use client'

import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useWallets } from '@/hooks/useWallets'
import { AppHero } from '@/components/app-hero'
import { WalletButton } from '@/components/solana/solana-provider'
import { WalletList } from '@/components/wallet/wallet-list'
import { getTimeBasedGreeting, getDiscordAvatarUrl, getPersonalizedGreeting } from '@/utils/discord'
import Image from 'next/image'

export function Dashboard() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { wallets, tokenMetadata, publicKey, mintAddress, isLoading: walletsLoading } = useWallets()

  const userProfile = profile.data

  if (profile.isLoading || !userProfile) {
    return <div className="container mx-auto p-4">Loading...</div>
  }

  const greeting = getTimeBasedGreeting()
  const subtitle = getPersonalizedGreeting(userProfile?.username)
  const avatarUrl = userProfile?.avatar && user?.uid ? getDiscordAvatarUrl(user.uid, userProfile.avatar) : null

  return (
    <div>
      <AppHero title={greeting} subtitle={subtitle}>
        {avatarUrl && (
          <div>
            <Image src={avatarUrl} alt="Discord Avatar" width={64} height={64} className="rounded-full mx-auto mb-4" />
          </div>
        )}
      </AppHero>
      <div className="container mx-auto text-center">
        <div className="flex flex-col items-center gap-2">
          <WalletButton />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">
        {walletsLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-2xl animate-bounce">{process.env.NEXT_PUBLIC_LOADING_TEXT}</div>
          </div>
        ) : (
          <>
            {wallets.length > 0 && <h3 className="text-lg font-semibold mb-4 text-center">Your wallets</h3>}
            {wallets.length > 0 && !tokenMetadata && (
              <div className="text-red-600 dark:text-red-400 text-sm text-center mb-4">
                ⚠️ Failed to fetch token metadata
              </div>
            )}
            <WalletList
              wallets={wallets}
              tokenMetadata={tokenMetadata}
              publicKey={publicKey}
              mintAddress={mintAddress}
            />
          </>
        )}
      </div>
    </div>
  )
}
