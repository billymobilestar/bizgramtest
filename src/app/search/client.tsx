'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/app/providers'
import PostCard from '@/components/PostCard'
import PostModal from '@/app/components/PostModal'

function useGeolocated() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setPos(null)
    )
  }, [])
  return pos
}

export default function Client() {
  // Search inputs (posts only)
  const [q, setQ] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [sort, setSort] = useState<'relevance' | 'newest' | 'nearby'>('relevance')
  const pos = useGeolocated()
  const tags = useMemo(() => tagsInput.split(',').map(t => t.trim()).filter(Boolean), [tagsInput])

  // Modal state
  const [openPostId, setOpenPostId] = useState<string | null>(null)

  // Posts (manual pagination)
  const [postCursor, setPostCursor] = useState<string | null>(null)
  const [postItems, setPostItems] = useState<any[]>([])

  const postsQ = api.search.posts.useQuery(
    {
      q,
      tags,
      sort,
      lat: pos?.lat,
      lng: pos?.lng,
      radiusKm: 50,
      limit: 12,
      cursor: postCursor ?? undefined,
    } as any,
    { placeholderData: (prev) => prev }
  )

  // Reset paging when filters change
  useEffect(() => {
    setPostCursor(null)
    setPostItems([])
  }, [q, tagsInput, sort, pos?.lat, pos?.lng])

  // Accumulate pages
  useEffect(() => {
    if (!postsQ.data) return
    setPostItems(prev => (postCursor ? [...prev, ...postsQ.data.items] : postsQ.data.items))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postsQ.data?.nextCursor])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-64 rounded border px-3 py-2"
        />
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="tags, comma,separated"
          className="w-64 rounded border px-3 py-2"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="rounded border px-3 py-2"
        >
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="nearby" disabled={!pos}>Nearby {pos ? '' : '(enable location)'}</option>
        </select>
      </div>

      {/* Posts */}
      <div>
        {postsQ.isLoading && <p>Loading…</p>}
        {postsQ.error && (
          <p className="text-red-600">{String((postsQ.error as any)?.message || 'Error')}</p>
        )}

        {!!postItems.length && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {postItems.map((p: any) => (
              <PostCard key={p.id} post={p} onOpen={setOpenPostId} />
            ))}
          </div>
        )}

        {!postsQ.isLoading && !postItems.length && <p>No results.</p>}

        {postsQ.data?.nextCursor && (
          <div className="mt-4">
            <button
              onClick={() => setPostCursor(postsQ.data!.nextCursor)}
              disabled={postsQ.isFetching}
              className="rounded border px-4 py-2 disabled:opacity-50"
            >
              {postsQ.isFetching ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <PostModal openId={openPostId} onClose={() => setOpenPostId(null)} />
    </div>
  )
}
