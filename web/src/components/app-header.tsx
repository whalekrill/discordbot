'use client'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { ThemeSelect } from '@/components/theme-select'
import { DISCORD_BOT_NAME } from '@/consts'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth'
import firebaseApp from '@/firebase'
import { getApiUrl } from '@/utils/api'

function Content({ links = [] }: { links: { label: string; path: string }[] }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [showMenu, setShowMenu] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const token = searchParams.get('token')
  const discordLoginUrl = getApiUrl('discordLogin')

  useEffect(() => {
    const auth = getAuth(firebaseApp)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthChecked(true)
    })
    return () => unsubscribe()
  }, [])

  function isActive(path: string) {
    return path === '/' ? pathname === '/' : pathname.startsWith(path)
  }

  function handleSignOut() {
    const auth = getAuth(firebaseApp)
    auth.signOut()
  }

  return (
    <header className="relative z-50 px-4 py-2 bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-400">
      <div className="mx-auto flex justify-between items-center">
        <div className="flex items-baseline gap-4">
          <Link className="text-xl hover:text-neutral-500 dark:hover:text-white" href="/">
            <span>{DISCORD_BOT_NAME}</span>
          </Link>
          <div className="hidden md:flex items-center">
            <ul className="flex gap-4 flex-nowrap items-center">
              {links.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    className={`hover:text-neutral-500 dark:hover:text-white ${isActive(path) ? 'text-neutral-500 dark:text-white' : ''}`}
                    href={path}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setShowMenu(!showMenu)}>
          {showMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        <div className="hidden md:flex items-center gap-4">
          <ThemeSelect />
          {authChecked && !user && !token && (
            <Button asChild variant="outline">
              <a href={discordLoginUrl}>Log in</a>
            </Button>
          )}
          {user && (
            <Button variant="outline" className="cursor-pointer" onClick={handleSignOut}>
              Log out
            </Button>
          )}
        </div>

        {showMenu && (
          <div className="md:hidden fixed inset-x-0 top-[52px] bottom-0 bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-sm">
            <div className="flex flex-col p-4 gap-4 border-t dark:border-neutral-800">
              <ul className="flex flex-col gap-4">
                {links.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      className={`hover:text-neutral-500 dark:hover:text-white block text-lg py-2  ${isActive(path) ? 'text-neutral-500 dark:text-white' : ''} `}
                      href={path}
                      onClick={() => setShowMenu(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-4">
                <ThemeSelect />
                {user ? (
                  <Button variant="outline" className="cursor-pointer" onClick={handleSignOut}>
                    Log out
                  </Button>
                ) : (
                  authChecked &&
                  !token && (
                    <Button asChild variant="outline">
                      <a href={discordLoginUrl}>Log in</a>
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export function AppHeader({ links = [] }: { links: { label: string; path: string }[] }) {
  return (
    <Suspense fallback={<div className="h-[52px] bg-neutral-100 dark:bg-neutral-900"></div>}>
      <Content links={links} />
    </Suspense>
  )
}
