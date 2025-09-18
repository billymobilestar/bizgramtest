import './globals.css'
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import Providers from './providers'
import AppHeader from '@/components/AppHeader'   // <- top-level import
import Sidebar from '@/components/Sidebar'
import OnboardingGate from './OnboardingGate'

export const metadata: Metadata = {
  title: 'BizGram',
  description: 'Creators. Services. Local-first.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-dvh bg-white dark:bg-black">
          <Providers>
            <OnboardingGate />
            {/* Mobile top bar only */}
            <div className="sm:hidden">
              <AppHeader />
            </div>

            {/* Persistent left sidebar on sm+ */}
            <div className="flex min-h-dvh">
              <Sidebar />
              <main className="flex-1">
                {children}
              </main>
            </div>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
