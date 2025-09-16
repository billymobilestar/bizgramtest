// src/app/feed/nearby/client.tsx
'use client'

import { useEffect, useState } from 'react'
import { api } from '@/app/providers'
import PostCard from '@/components/PostCard'

export default function Client() {
  // Geolocation currently not used by router; you can wire it later
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (r) => setPos({ lat: r.coords.latitude, lng: r.coords.longitude }),
      () => setPos(null),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  const q = api.feed.discover.useInfiniteQuery(
    { limit: 18 },
    { enabled: true, getNextPageParam: (last) => last.nextCursor ?? undefined }
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
