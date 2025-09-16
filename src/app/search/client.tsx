'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/app/providers'
import PostCard from '@/components/PostCard'
import SaveProfileButton from '@/components/SaveProfileButton'
import RequestQuoteButton from '@/components/RequestQuoteButton'
import PostModal from '@/app/components/PostModal'   // ⬅️ add

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

type Tab = 'posts' | 'profiles'

export default function Client() {
  const [tab, setTab] = useState<Tab>('posts')

  const [q, setQ] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  const [profession, setProfession] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')

  const [sort, setSort] = useState<'relevance' | 'newest' | 'nearby' | 'a_z'>('relevance')
  const pos = useGeolocated()
  const tags = useMemo(() => tagsInput.split(',').map(t => t.trim()).filter(Boolean), [tagsInput])

  // 🔓 Modal state
  const [openPostId, setOpenPostId] = useState<string | null>(null)

  // ---- POSTS (manual pagination)
  const [postCursor, setPostCursor] = useState<string | null>(null)
  const [postItems, setPostItems] = useState<any[]>([])

  const postsQ = api.search.posts.useQuery(
    {
      q,
      // if your router supports tags/sort/lat/lng, keep them;
      // otherwise remove extras to match your input type.
      tags,
      sort: (sort === 'a_z' ? 'relevance' : sort) as 'relevance' | 'newest' | 'nearby',
      lat: pos?.lat,
      lng: pos?.lng,
      radiusKm: 50,
      limit: 12,
      cursor: postCursor ?? undefined,
    } as any,
    { enabled: tab === 'posts', placeholderData: (prev) => prev }
  )

  useEffect(() => { setPostCursor(null); setPostItems([]) },
    [q, tagsInput, sort, pos?.lat, pos?.lng, tab])

  useEffect(() => {
    if (!postsQ.data) return
    setPostItems(prev => (postCursor ? [...prev, ...postsQ.data.items] : postsQ.data.items))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postsQ.data?.nextCursor])

  // ---- PROFILES (manual pagination)
  const [profileCursor, setProfileCursor] = useState<string | null>(null)
  const [profileItems, setProfileItems] = useState<any[]>([])

  const profilesQ = api.search.profiles.useQuery(
    {
      q, profession, city, region,
      sort,
      lat: pos?.lat, lng: pos?.lng, radiusKm: 50,
      limit: 12, cursor: profileCursor ?? undefined,
    } as any,
    { enabled: tab === 'profiles', placeholderData: (prev) => prev }
  )

  useEffect(() => { setProfileCursor(null); setProfileItems([]) },
    [q, profession, city, region, sort, pos?.lat, pos?.lng, tab])

  useEffect(() => {
    if (!profilesQ.data) return
    setProfileItems(prev => (profileCursor ? [...prev, ...profilesQ.data.items] : profilesQ.data.items))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilesQ.data?.nextCursor])

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="border rounded px-3 py-2 w-64" />

        {tab === 'posts' && (
          <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="tags, comma,separated" className="border rounded px-3 py-2 w-64" />
        )}

        {tab === 'profiles' && (
          <>
            <input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="profession" className="border rounded px-3 py-2 w-48" />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="city" className="border rounded px-3 py-2 w-40" />
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="region" className="border rounded px-3 py-2 w-32" />
          </>
        )}

        <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="border rounded px-3 py-2">
          <option value="relevance">Relevance</option>
          <option value="newest">Newest</option>
          <option value="nearby" disabled={!pos}>Nearby {pos ? '' : '(enable location)'}</option>
          {tab === 'profiles' && <option value="a_z">A → Z</option>}
        </select>

        <div className="ml-auto flex gap-2">
          <button onClick={() => setTab('posts')} className={`px-3 py-1 border rounded ${tab === 'posts' ? 'bg-black text-white' : ''}`}>Posts</button>
          <button onClick={() => setTab('profiles')} className={`px-3 py-1 border rounded ${tab === 'profiles' ? 'bg-black text-white' : ''}`}>Profiles</button>
        </div>
      </div>

      {/* Posts tab */}
      {tab === 'posts' && (
        <div>
          {postsQ.isLoading && <p>Loading…</p>}
          {postsQ.error && <p className="text-red-600">{String((postsQ.error as any)?.message || 'Error')}</p>}

          {!!postItems.length && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                {postsQ.isFetching ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Profiles tab */}
      {tab === 'profiles' && (
        <div>
          {profilesQ.isLoading && <p>Loading…</p>}
          {profilesQ.error && <p className="text-red-600">{String((profilesQ.error as any)?.message || 'Error')}</p>}

          {!!profileItems.length && (
            <ul className="divide-y border rounded">
              {profileItems.map((pr: any) => (
                <li key={pr.id} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {pr.displayName} <span className="text-gray-500">@{pr.handle}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {pr.profession} — {[pr.city, pr.region].filter(Boolean).join(', ')}
                    </div>
                  </div>
                  <SaveProfileButton profileId={pr.id} />
                </li>
              ))}
            </ul>
          )}

          {!profilesQ.isLoading && !profileItems.length && <p>No results.</p>}

          {profilesQ.data?.nextCursor && (
            <div className="mt-4">
              <button
                onClick={() => setProfileCursor(profilesQ.data!.nextCursor)}
                disabled={profilesQ.isFetching}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                {profilesQ.isFetching ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 🔓 Modal */}
      <PostModal openId={openPostId} onClose={() => setOpenPostId(null)} />
    </div>
  )
}
