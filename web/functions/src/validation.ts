import { z } from 'zod'

// Validation schemas for function requests
export const SendTokenRequestSchema = z.object({
  senderDiscordId: z.string(),
  recipientDiscordId: z.string(),
  message: z.string(),
  signature: z.array(z.number()),
})

export const AddWalletRequestSchema = z.object({
  publicKey: z.string(),
  message: z.string(),
  signature: z.array(z.number()),
})

export const DeleteWalletRequestSchema = z.object({
  publicKey: z.string(),
})

export const UpdateWalletRequestSchema = z.object({
  publicKey: z.string(),
  canReceiveTokens: z.boolean().optional(),
  delegateAmount: z.number().nullable().optional(),
})

export const DiscordCallbackRequestSchema = z.object({
  code: z.string(),
  state: z.string(),
})

// Inferred types from schemas
export type SendTokenRequest = z.infer<typeof SendTokenRequestSchema>
export type AddWalletRequest = z.infer<typeof AddWalletRequestSchema>
export type DeleteWalletRequest = z.infer<typeof DeleteWalletRequestSchema>
export type UpdateWalletRequest = z.infer<typeof UpdateWalletRequestSchema>
export type DiscordCallbackRequest = z.infer<typeof DiscordCallbackRequestSchema>
