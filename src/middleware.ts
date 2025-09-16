// src/middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    '/((?!_next|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)|favicon.ico|sitemap.xml|robots.txt).*)',
    '/(api|trpc)(.*)', // include API & tRPC
  ],
}
