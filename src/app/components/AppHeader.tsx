'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

export default function AppHeader() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const linkCls = (href: string) =>
    `px-3 py-1 border rounded transition ${
      isActive(href)
        ? 'bg-black text-white border-black'
        : 'hover:bg-gray-50 border-gray-200'
    }`

  // mobile menu state
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', onKey)
      closeBtnRef.current?.focus()
    } else {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // auto-close drawer on sm+ breakpoint (modern API only; resize fallback handles older browsers)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false)
    }
    const mql: any = mq as any
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    // Initial check so it closes immediately if already on desktop
    if (mq.matches) setOpen(false)
    return
  }, [])

  // extra safety: close when resizing to desktop width
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 640) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // close on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-[60] border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-4">
          {/* Left: mobile button + brand */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth >= 640) return
                setOpen(true)
              }}
              className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href="/" className="font-semibold">BizzGram</Link>
          </div>

          {/* Right: desktop nav */}
          <nav className="hidden sm:flex items-center gap-3">
            <Link className={linkCls('/directory')} href="/directory">Directory</Link>
            <Link className={linkCls('/search')} href="/search">Search</Link>
            <Link className={linkCls('/create/post')} href="/create/post">Create</Link>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 py-1 border rounded hover:bg-gray-50">Sign In</button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <Link className={linkCls('/account')} href="/account">My account</Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </nav>
        </div>
      </header>
      <div className="h-14" aria-hidden />

      {/* Mobile drawer (portaled) */}
      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[80] sm:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 opacity-100 transition-opacity"
            aria-hidden="true"
          />

          {/* Panel */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className={`absolute left-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-300 translate-x-0`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-base font-semibold">Menu</h2>
              <button
                ref={closeBtnRef}
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="px-2 py-2">
              <ul className="flex flex-col">
                <li>
                  <Link href="/directory" onClick={() => setOpen(false)} className={linkCls('/directory')}>Directory</Link>
                </li>
                <li className="mt-2">
                  <Link href="/search" onClick={() => setOpen(false)} className={linkCls('/search')}>Search</Link>
                </li>
                <li className="mt-2">
                  <Link href="/create/post" onClick={() => setOpen(false)} className={linkCls('/create/post')}>Create</Link>
                </li>

                <SignedOut>
                  <li className="mt-4">
                    <SignInButton mode="modal">
                      <button className="w-full px-3 py-2 border rounded hover:bg-gray-50">Sign In</button>
                    </SignInButton>
                  </li>
                </SignedOut>

                <SignedIn>
                  <li className="mt-4">
                    <Link href="/account" onClick={() => setOpen(false)} className={linkCls('/account')}>
                      My account
                    </Link>
                  </li>
                  <li className="mt-2 px-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Signed in</span>
                      <UserButton afterSignOutUrl="/" />
                    </div>
                  </li>
                </SignedIn>
              </ul>
            </nav>
          </aside>
        </div>,
        document.body
      )}
    </>
  )
}
