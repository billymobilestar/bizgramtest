'use client'

import { api } from '@/app/providers'

export default function ClientGrid() {
  const { data, isLoading, error } = api.post.getMine.useQuery()

  if (isLoading) return <p>Loading…</p>
  if (error) return <p className="text-red-600">{String((error as any)?.message || 'Error')}</p>
  if (!data?.length) return <p>No posts yet.</p>

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {data.flatMap((p) =>
        p.assets.map((a) => (
          <img
            key={a.id}
            src={a.url}
            alt={a.altText || ''}
            className="w-full h-48 object-cover"
          />
        ))
      )}
    </div>
  )
}
