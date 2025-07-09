import * as admin from 'firebase-admin'
import * as Sentry from '@sentry/node'

if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  })
}

admin.initializeApp()

export { discordLogin } from './discord/login'
export { discordCallback } from './discord/callback'
export { refreshProfile } from './discord/refreshProfile'
export { sendToken } from './wallet/sendToken'
export { getWallets } from './wallet/getWallets'
export { addWallet } from './wallet/addWallet'
export { updateWallet } from './wallet/updateWallet'
export { deleteWallet } from './wallet/deleteWallet'
