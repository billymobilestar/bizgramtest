'use client'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import NotificationBell from '@/components/notifications/NotificationBell'

export default function AppHeader(){
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b">
      <Link href="/" className="font-semibold">BizzGram</Link>
      <nav className="flex items-center gap-3">
        <NotificationBell />
        <Link className="px-3 py-1 border rounded" href="/directory">Directory</Link>
        <Link className="px-3 py-1 border rounded" href="/search">Search</Link>
        <Link className="px-3 py-1 border rounded" href="/saved">Saved</Link>
        <Link className="px-3 py-1 border rounded" href="/projects">Projects</Link>

        <Link className="px-3 py-1 border rounded" href="/create/post">Create</Link>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-3 py-1 border rounded">Sign In</button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <Link className="px-3 py-1 border rounded bg-black text-white" href="/account">My account</Link>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </nav>
    </header>
  )
}
