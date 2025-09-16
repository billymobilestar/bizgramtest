'use client'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AppHeader() {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')
  const linkCls = (href: string) =>
    `px-3 py-1 border rounded ${
      isActive(href) ? 'bg-black text-white border-black' : 'hover:bg-gray-50'
    }`

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b">
      <Link href="/" className="font-semibold">BizzGram</Link>
      <nav className="flex items-center gap-3">
        <Link className={linkCls('/directory')} href="/directory">Directory</Link>
        <Link className={linkCls('/search')} href="/search">Search</Link>

        <Link className={linkCls('/create/post')} href="/create/post">Create</Link>


        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-3 py-1 border rounded">Sign In</button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <Link className={linkCls('/account')} href="/account">My account</Link>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </nav>
    </header>
  )
}
