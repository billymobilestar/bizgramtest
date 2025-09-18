// src/app/directory/client.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/app/providers'
import Link from 'next/link'
import { MessageSquare, Bookmark } from 'lucide-react'

type Mode = 'PEOPLE' | 'BUSINESS'

function FollowButton({ profileId }: { profileId: string }) {
  const status = api.follow.status.useQuery({ profileId }, { enabled: !!profileId })
  const toggle = api.follow.toggle.useMutation({
    onSuccess: () => status.refetch(),
  })
  const following = !!status.data?.following
  return (
    <button
      onClick={() => toggle.mutate({ profileId })}
      disabled={toggle.isPending}
      className={`px-3 py-1 rounded border ${following ? 'bg-black text-white' : ''}`}
      aria-pressed={following}
      title={following ? 'Unfollow' : 'Follow'}
    >
      {toggle.isPending ? '...' : (following ? 'Following' : 'Follow')}
    </button>
  )
}

export default function Client() {
  // — Controls —
  const [mode, setMode] = useState<Mode>('PEOPLE') // PEOPLE vs BUSINESS
  const [q, setQ] = useState('')
  const [profession, setProfession] = useState('')
  const [city, setCity] = useState('')
  const [region, setRegion] = useState('')
  const [followersMin, setFollowersMin] = useState<string>('')
  const [followersMax, setFollowersMax] = useState<string>('')
  const [sort, setSort] = useState<'relevance' | 'a_z' | 'followers_desc'>('relevance')

  // — Pagination (manual) —
  const [cursor, setCursor] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const accountType = mode === 'BUSINESS' ? 'COMPANY' : 'PERSONAL'

  const query = api.directory.profiles.useQuery(
    {
      q: q.trim() || undefined,
      accountType,
      profession: profession.trim() || undefined,
      city: city.trim() || undefined,
      region: region.trim() || undefined,
      followersMin: followersMin !== '' ? Number(followersMin) : undefined,
      followersMax: followersMax !== '' ? Number(followersMax) : undefined,
      sort,
      limit: 24,
      cursor: cursor ?? undefined,
    },
    { enabled: true, placeholderData: (p) => p }
  )

  // whenever inputs change, reset paging
  useEffect(() => {
    setCursor(null)
    setItems([])
  }, [q, profession, city, region, followersMin, followersMax, sort, mode])

  // accumulate pages
  useEffect(() => {
    if (!query.data) return
    setItems(prev => (cursor ? [...prev, ...query.data.items] : query.data.items))
  }, [query.data, cursor])

  // — Mark for bulk save —
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const toggleMark = (id: string) => {
    setMarked(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }
  const clearMarked = () => setMarked(new Set())

  // Lists for PEOPLE (we save business profiles into PEOPLE lists too)
  const listsQ = api.saved.myLists.useQuery({ kind: 'PEOPLE' }, { placeholderData: (p) => p })
  const addToLists = api.saved.addToLists.useMutation()

  const doBulkSave = async (listIds: string[]) => {
    if (!listIds.length || marked.size === 0) return
    // add each profile to chosen lists
    const ids = Array.from(marked)
    await Promise.all(ids.map(pid => addToLists.mutateAsync({ listIds, profileId: pid })))
    clearMarked()
    alert('Saved to selected lists.')
  }

  const professionsText = (prof: any) =>
    (prof.professions?.length ? prof.professions : [prof.profession].filter(Boolean)).join(' • ')

  // — UI —
  return (
    <div className="space-y-6">
      {/* Hero search box */}
      <div className="mt-2 rounded-2xl border p-4 md:p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select
            value={mode}
            onChange={(e)=> setMode(e.target.value as Mode)}
            className="border rounded-full px-3 py-2"
          >
            <option value="PEOPLE">People</option>
            <option value="BUSINESS">Business</option>
          </select>

          <input
            value={q}
            onChange={(e)=> setQ(e.target.value)}
            placeholder="Who are you looking for?"
            className="flex-1 border rounded-full px-4 py-2"
          />
          <button
            onClick={() => { setCursor(null); setItems([]) }}
            className="px-4 py-2 rounded-full bg-black text-white"
          >
            Search
          </button>
        </div>

        <div className="grid md:grid-cols-5 gap-2">
          <input className="border rounded px-3 py-2" placeholder="Profession"
            value={profession} onChange={e=>setProfession(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="City"
            value={city} onChange={e=>setCity(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Region / State"
            value={region} onChange={e=>setRegion(e.target.value)} />
          <div className="flex gap-2">
            <input className="border rounded px-3 py-2 w-full" placeholder="Min followers"
              inputMode="numeric" value={followersMin} onChange={e=>setFollowersMin(e.target.value.replace(/\D/g,''))} />
            <input className="border rounded px-3 py-2 w-full" placeholder="Max"
              inputMode="numeric" value={followersMax} onChange={e=>setFollowersMax(e.target.value.replace(/\D/g,''))} />
          </div>
          <select className="border rounded px-3 py-2" value={sort} onChange={e=>setSort(e.target.value as any)}>
            <option value="relevance">Relevance</option>
            <option value="a_z">A → Z</option>
            <option value="followers_desc">Most followers</option>
          </select>
        </div>
      </div>

      {/* Bulk bar (shown when something is marked) */}
      {marked.size > 0 && (
        <div className="sticky top-0 z-10 bg-white border rounded p-3 flex items-center gap-3">
          <div className="text-sm">{marked.size} selected</div>

          <div className="ml-auto flex items-center gap-2">
            <select id="bulk-list-picker" className="border rounded px-2 py-1">
              {listsQ.data?.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <button
              className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
              disabled={!listsQ.data?.length || addToLists.isPending}
              onClick={()=>{
                const sel = document.getElementById('bulk-list-picker') as HTMLSelectElement | null
                if (!sel?.value) return
                doBulkSave([sel.value])
              }}
            >
              {addToLists.isPending ? 'Saving…' : 'Save to list'}
            </button>
            <button className="px-3 py-1 rounded border" onClick={clearMarked}>Clear</button>
          </div>
        </div>
      )}

      {/* Results */}
      {query.isLoading && <p>Loading…</p>}
      {query.error && <p className="text-red-600">{String((query.error as any)?.message || 'Error')}</p>}

      {!!items.length && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((pr: any) => {
            const markedNow = marked.has(pr.id)
            return (
              <li key={pr.id} className="relative rounded-2xl bg-white overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.10)] transition">
                {/* Floating mark toggle */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleMark(pr.id) }}
                  aria-pressed={markedNow}
                  title={markedNow ? 'Unselect' : 'Select'}
                  className={`absolute top-2 right-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur shadow-sm transition
                    ${markedNow ? 'bg-black text-white border-black' : 'bg-white/90 text-neutral-700 hover:bg-white'}`}
                >
                  {/* icon: check when selected, plus when not */}
                  {markedNow ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                  <span className="sr-only">{markedNow ? 'Unselect' : 'Select'}</span>
                </button>

                {/* Hero with large image + centered name */}
                <div className="relative aspect-[4/3] bg-neutral-100">
                  {pr.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pr.avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-x-0 top-3 flex flex-col items-center">
                    <div className="text-lg font-semibold tracking-tight text-neutral-900 drop-shadow-sm">
                      {pr.displayName}
                    </div>
                  </div>
                </div>

                {/* Footer content */}
                <div className="p-3 md:p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
                      {pr.avatarUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pr.avatarUrl} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 text-[13px] leading-tight">
                      <div className="truncate text-neutral-800">@{pr.handle}</div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {[pr.city, pr.region].filter(Boolean).join(', ') || professionsText(pr)}
                      </div>
                    </div>
                    <span className="ml-auto text-[10px] uppercase tracking-wide border rounded-full px-2 py-0.5 whitespace-nowrap">
                      {pr.accountType === 'COMPANY' ? 'Business' : 'People'}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-gray-600 line-clamp-1">
                    {professionsText(pr)}
                    { typeof pr.followerCount === 'number' && <> • {pr.followerCount} followers</> }
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <FollowButton profileId={pr.id} />
                    <span className="ml-auto" />
                    <Link
                      href="/messages"
                      aria-label="Message"
                      className="inline-flex items-center justify-center rounded-full border hover:bg-neutral-50 w-8 h-8"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      aria-label="Save"
                      title="Save"
                      className="inline-flex items-center justify-center rounded-full border hover:bg-neutral-50 w-8 h-8"
                      onClick={(e) => { e.stopPropagation(); /* TODO: wire save action */ }}
                    >
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!query.isLoading && !items.length && <p>No results.</p>}

      {query.data?.nextCursor && (
        <div>
          <button
            className="px-4 py-2 rounded border disabled:opacity-50"
            disabled={query.isFetching}
            onClick={()=> setCursor(query.data!.nextCursor)}
          >
            {query.isFetching ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
