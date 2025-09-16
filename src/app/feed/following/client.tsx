// src/app/feed/following/client.tsx
'use client'

import PostCard from '@/components/PostCard'
import { api } from '@/app/providers'

export default function Client() {
  const q = api.feed.home.useInfiniteQuery(
    { limit: 18 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined }
  )

  const posts = q.data?.pages.flatMap((page) => page.items) ?? []

  if (q.isLoading) return <p>Loading…</p>
  if (q.error) return <p className="text-red-600">{String(q.error.message)}</p>

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  )
}
