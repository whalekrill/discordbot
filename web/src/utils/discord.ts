import { CDNRoutes, RouteBases, ImageFormat } from 'discord-api-types/v10'

/**
 * Generates a time-based greeting
 */
export function getTimeBasedGreeting(): string {
  const currentHour = new Date().getHours()

  if (currentHour >= 12 && currentHour < 18) {
    return 'Good afternoon!'
  } else if (currentHour >= 18) {
    return 'Good night!'
  }

  return 'Good morning!'
}

/**
 * Constructs Discord avatar URL
 */
export function getDiscordAvatarUrl(userId: string, avatarHash: string, size: number = 128): string {
  return `${RouteBases.cdn}${CDNRoutes.userAvatar(userId, avatarHash, ImageFormat.PNG)}?size=${size}`
}

/**
 * Creates a personalized greeting with username
 */
export function getPersonalizedGreeting(username?: string): string | undefined {
  return username ? `Hello, ${username}!` : undefined
}
