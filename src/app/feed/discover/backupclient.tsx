'use client'
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/app/providers'
import PostCard from '@/components/PostCard'
import PostModal from '../../components/PostModal'
import { Input } from '../../../components/ui/Input'
import Button from '../../../components/ui/Button'

type Filters = {
  q: string
  profession: string
  city: string
  region: string
  tags: string[]
}

const emptyFilters: Filters = { q: '', profession: '', city: '', region: '', tags: [] }

export default function Client(){
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [cursor, setCursor] = useState<string | null>(null)
  const [openPostId, setOpenPostId] = useState<string | null>(null)

  // debounce q so typing doesn't flash-empty the list
  const [qRaw, setQRaw] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setFilters(f => ({ ...f, q: qRaw })), 250)
    return () => clearTimeout(t)
  }, [qRaw])

  // Clear button
  function clearAll(){
    setQRaw('')
    setFilters(emptyFilters)
    setCursor(null)
  }

  // Decide: no filters => plain discover; any filters => discoverSearch
  const hasFilters = useMemo(() => {
    const { q, profession, city, region, tags } = filters
    return !!(q || profession || city || region || (tags && tags.length))
  }, [filters])

  const discover = api.feed.discover.useQuery(
    { cursor, limit: 15 },
    {
      enabled: !hasFilters,
      placeholderData: (p) => p,           // ← keeps old data while loading, avoids "disappear"
      refetchOnWindowFocus: false,
    }
  )

  const search = api.feed.discoverSearch.useQuery(
    { cursor, limit: 15, ...filters, sort: 'newest' },
    {
      enabled: hasFilters,
      placeholderData: (p) => p,
      refetchOnWindowFocus: false,
    }
  )

  const data = hasFilters ? search.data : discover.data
  const isLoading = hasFilters ? search.isLoading : discover.isLoading
  const isFetching = hasFilters ? search.isFetching : discover.isFetching

  const items = data?.items ?? []

  // whenever filters change, reset cursor so you see the first page
  useEffect(() => { setCursor(null) }, [hasFilters, filters.q, filters.profession, filters.city, filters.region])

  return (
    <div className="space-y-4">
      {/* Search strip */}
      <div className="card p-3 grid md:grid-cols-5 gap-2">
        <div className="md:col-span-2">
          <Input placeholder="Search posts, creators, tags…" value={qRaw} onChange={e=>setQRaw(e.target.value)} />
        </div>
        <Input placeholder="Profession" value={filters.profession} onChange={e=>setFilters(f=>({ ...f, profession: e.target.value }))} />
        <Input placeholder="City" value={filters.city} onChange={e=>setFilters(f=>({ ...f, city: e.target.value }))} />
        <Input placeholder="Region" value={filters.region} onChange={e=>setFilters(f=>({ ...f, region: e.target.value }))} />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={clearAll}>Clear</Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading && <p>Loading…</p>}
      {!!items.length && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {items.map((p: any) => (
           <div
        key={p.id}
        role="button"
        tabIndex={0}
        onClick={() => setOpenId(p.id)}
        onKeyDown={(e) => { if (e.key === 'Enter') setOpenId(p.id) }}
        className="text-left"
        >
        <PostCard post={p} />
      </div>
          ))}
        </div>
      )}
      {!isLoading && !items.length && (
        <div className="text-gray-600">Nothing to show.</div>
      )}

      {data?.nextCursor && (
        <div className="text-center">
          <Button variant="outline" onClick={()=> setCursor(data!.nextCursor!)} disabled={isFetching}>
            {isFetching ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}

      {/* Modal for quick-view */}
      <PostModal openId={openPostId} onClose={()=> setOpenPostId(null)} />
    </div>
  )
}
