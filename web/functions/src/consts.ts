import { defineString, defineSecret } from 'firebase-functions/params'

export const apiKey = defineSecret('API_KEY')
export const discordClientId = defineString('DISCORD_CLIENT_ID')
export const discordClientSecret = defineSecret('DISCORD_CLIENT_SECRET')
export const nextPublicUrl = defineString('NEXT_PUBLIC_URL')
export const discordBotToken = defineSecret('DISCORD_BOT_TOKEN')
export const delegatePublicKey = defineString('DELEGATE_PUBLIC_KEY')
export const heliusApiUrl = defineString('HELIUS_API_URL')
export const delegateMintAddress = defineString('DELEGATE_MINT_ADDRESS')

export const options = {
  region: 'asia-northeast1',
  memory: '256MiB' as const,
  maxInstances: 5,
  cpu: 1,
}
