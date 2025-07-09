'use client'

import React from 'react'
import { useTheme } from 'next-themes'
import Image from 'next/image'

export function AppFooter() {
  const { resolvedTheme } = useTheme()

  const footerText = process.env.NEXT_PUBLIC_FOOTER_TEXT

  if (footerText) {
    return (
      <footer className="text-center p-2 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400 text-sm">
        {footerText}
      </footer>
    )
  }

  const discordImage = resolvedTheme === 'dark' ? '/img/discord-logo-white.png' : '/img/discord-logo-black.png'

  return (
    <footer className="text-center p-2 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400 text-sm">
      <Image src={discordImage} alt="Discord" width={80} height={12} className="inline-block" />
    </footer>
  )
}
