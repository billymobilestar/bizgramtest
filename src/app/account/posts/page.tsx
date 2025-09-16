// src/app/account/posts/page.tsx
import AppHeader from '@/components/AppHeader'
import ClientGrid from './client'

export default function MyPostsPage() {
  return (
    <main>

      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">My Posts</h1>
        <ClientGrid />
      </div>
    </main>
  )
}
