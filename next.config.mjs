// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don’t fail the deployment on ESLint issues (you can re-enable later)
  eslint: { ignoreDuringBuilds: true },
  // Optional: for test deploys. Remove if you want CI to catch TS errors.
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
}
export default nextConfig