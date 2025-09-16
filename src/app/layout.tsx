import './globals.css'
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import Providers from './providers'
import AppHeader from '@/components/AppHeader'   // <- top-level import

export const metadata: Metadata = {
  title: 'BizGram',
  description: 'Creators. Services. Local-first.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-dvh">
          <Providers>
            <AppHeader />
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  )
}
