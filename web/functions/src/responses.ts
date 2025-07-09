import type { WalletInfo, TokenMetadata } from './types'

export interface ResponseData {
  success: boolean
  error?: string
  message?: string
  wallet?: {
    publicKey: string
    canReceiveTokens: boolean
    registeredAt: number
  }
}

export interface GetWalletsResponse {
  wallets: WalletInfo[]
  tokenMetadata: TokenMetadata | null
  publicKey: string
  mintAddress: string
}

export interface AddWalletResponse {
  success: boolean
  message: string
  wallet: {
    publicKey: string
    canReceiveTokens: boolean
    registeredAt: number
  }
}

export interface UpdateWalletResponse {
  success: boolean
  message: string
}

export interface DeleteWalletResponse {
  success: boolean
  message: string
}

export interface RefreshProfileResponse {
  success: boolean
}

export interface DiscordCallbackResponse {
  success: boolean
  token: string
  username: string
  discordId: string
}

export interface DiscordUser {
  id: string
  username: string
  avatar: string
}
