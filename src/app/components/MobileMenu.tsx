'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, Home, Search, Plus, MessageSquare, Bell, FolderKanban, Bookmark, User, Settings } from 'lucide-react'

export type MobileMenuItem = {
  href: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

const DEFAULT_ITEMS: MobileMenuItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/create/post', label: 'Create', icon: Plus },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/account', label: 'Profile', icon: User },
  { href: '/account/settings', label: 'Settings', icon: Settings },
]

export default function MobileMenu({
  open,
  onClose,
  items = DEFAULT_ITEMS,
  title = 'Menu',
}: {
  open: boolean
  onClose: () => void
  items?: MobileMenuItem[]
  title?: string
}) {
  const pathname = usePathname()
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // basic focus & scroll management
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKey)
      // focus close button on open
      closeBtnRef.current?.focus()
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 transition-pointer-events ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute left-0 top-0 h-full w-[85%] max-w-sm bg-white dark:bg-neutral-900 shadow-2xl transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-2 py-2">
          <ul className="flex flex-col">
            {items.map(({ href, label, icon: Icon }) => {
              const active =
                href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition
                      ${active
                        ? 'bg-neutral-100 dark:bg-neutral-800 font-medium'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                  >
                    {Icon ? <Icon className="h-5 w-5" /> : null}
                    <span>{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </div>
  )
}