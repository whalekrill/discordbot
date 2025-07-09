export interface Wallet {
  publicKey: string
  canReceiveTokens: boolean
  registeredAt: number
  delegatedTo: string | null
  delegateAmount: number | null
  delegateUpdatedAt: number | null
}

export interface WalletInfo extends Wallet {
  isRegistered: boolean
}

export interface TokenMetadata {
  name: string
  shortName: string
  icon?: string
  iconText: string
  decimals: number
}

export interface UserProfile {
  username: string
  avatar: string | null
  registeredAt: number
  wallets: Wallet[]
}
