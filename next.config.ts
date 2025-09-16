// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Clerk avatars
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: 'images.clerk.dev' },

      // Google photos (optional, e.g. OAuth avatars)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },

      // Supabase storage public URLs (optional if you show post images via Next/Image)
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
}

export default nextConfig
