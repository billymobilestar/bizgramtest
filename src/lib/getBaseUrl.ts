// src/lib/getBaseUrl.ts
export function getBaseUrl() {
  // Browser: use relative URLs
  if (typeof window !== 'undefined') return ''
  // Vercel
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  // Fallback (local dev)
  return `http://localhost:${process.env.PORT ?? 3000}`
}