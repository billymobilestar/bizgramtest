'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import {
  Home, Compass, MessageSquare, Folder, Bookmark, Bell, Plus, User2,
} from 'lucide-react'

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={cls(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
        'hover:bg-neutral-100 dark:hover:bg-neutral-900',
        active
          ? 'text-black dark:text-white bg-neutral-50 dark:bg-neutral-900'
          : 'text-neutral-700 dark:text-neutral-300'
      )}
    >
      {/* active indicator bar */}
      <span
        className={cls(
          'absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded bg-black/70 dark:bg-white/70 transition-opacity',
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
        )}
      />
      <Icon className={cls('h-5 w-5 shrink-0', active && 'scale-[1.02]')} />
      <span className="hidden lg:inline">{label}</span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const primary = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Discover', icon: Compass }, // or /directory if you prefer
    { href: '/messages', label: 'Messages', icon: MessageSquare },
    { href: '/projects', label: 'Projects', icon: Folder },
    { href: '/saved', label: 'Saved', icon: Bookmark },
    { href: '/notifications', label: 'Notifications', icon: Bell },
  ] as const

  return (
    <aside
      className={cls(
        // layout
        'hidden sm:flex sm:flex-col',
        'sm:sticky sm:top-0 sm:h-screen sm:shrink-0',
        // sizing (rail on md, expanded on lg)
        'w-20 lg:w-64',
        // visuals
        'border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black'
      )}
    >
      {/* Brand / top padding */}
      <div className="px-3 py-4 lg:px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-black text-white grid place-items-center text-sm font-semibold">
            B
          </div>
          <span className="hidden text-white lg:inline font-semibold">BizGram</span>
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-2 lg:px-3">
        <div className="space-y-1">
          {primary.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={isActive(item.href)}
            />
          ))}
        </div>

        {/* Create section */}
        <div className="mt-4">
          <Link
            href="/create/post"
            className={cls(
              'flex items-center gap-3 rounded-xl border text-white border-neutral-300 dark:border-neutral-700',
              'px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 transition'
            )}
          >
            <Plus className="h-5 w-5" />
            <span className="hidden lg:inline">Create</span>
          </Link>
        </div>
      </nav>

      {/* Bottom / account */}
      <div className="px-2 pb-4 pt-2 lg:px-3">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="w-full rounded-xl border border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900">
              <span className="hidden lg:inline">Sign in</span>
              <User2 className="h-5 w-5 lg:hidden" />
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <div className="flex items-center justify-between rounded-xl border text-white border-neutral-300 dark:border-neutral-700 px-3 py-2">
            <Link href="/account" className="hidden lg:block text-sm hover:underline">
              My account
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>
      </div>
    </aside>
  )
}