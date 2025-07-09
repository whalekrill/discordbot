'use client'

import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'
import { AppHeader } from '@/components/app-header'
import React from 'react'
import { AppFooter } from '@/components/app-footer'

export function AppLayout({
  children,
  links,
}: {
  children: React.ReactNode
  links: { label: string; path: string }[]
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <div className="flex flex-col h-screen">
        <AppHeader links={links} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4">{children}</div>
        </main>
        <AppFooter />
      </div>
      <Toaster />
    </ThemeProvider>
  )
}
