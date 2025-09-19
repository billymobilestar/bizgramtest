'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/app/providers'
import OpinionComposer from '@/components/opinions/OpinionComposer'
import OpinionCard from '@/components/opinions/OpinionCard'
import RightRail from '@/components/opinions/RightRail'

type Tab = 'new' | 'trending' | 'hot'

export default function Client() {
  const [tab, setTab] = useState<Tab>('new')
  const [cursor, setCursor] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])

  const qNew = api.opinions.listNew.useQuery({ limit: 12, cursor: cursor ?? undefined }, { enabled: tab === 'new', placeholderData: (p) => p })
  const qTrend = api.opinions.listTrending.useQuery({ limit: 12, cursor: cursor ?? undefined }, { enabled: tab === 'trending', placeholderData: (p) => p })
  const qHot = api.opinions.listHot.useQuery({ limit: 12, cursor: cursor ?? undefined }, { enabled: tab === 'hot', placeholderData: (p) => p })

  const q = tab === 'new' ? qNew : tab === 'trending' ? qTrend : qHot

  useEffect(() => {
    setCursor(null)
    setItems([])
  }, [tab])

  useEffect(() => {
    if (!q.data) return
    setItems(prev => (cursor ? [...prev, ...q.data.items] : q.data.items))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data?.nextCursor])

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <header className="mb-4">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Opinions</h1>
            <p className="text-sm text-neutral-600">
              Ask the world—anonymously. Text, photo, or poll. Others can react and comment anonymously too.
            </p>
          </header>

          <OpinionComposer />

          <div className="mt-4 flex gap-2">
            <button onClick={() => setTab('new')} className={`px-3 py-1.5 rounded border ${tab === 'new' ? 'bg-black text-white' : ''}`}>New</button>
            <button onClick={() => setTab('trending')} className={`px-3 py-1.5 rounded border ${tab === 'trending' ? 'bg-black text-white' : ''}`}>Trending</button>
            <button onClick={() => setTab('hot')} className={`px-3 py-1.5 rounded border ${tab === 'hot' ? 'bg-black text-white' : ''}`}>Hot</button>
          </div>

          <section className="mt-4 space-y-4">
            {q.isLoading && <div>Loading…</div>}
            {q.error && <div className="text-red-600">{String((q.error as any)?.message || 'Error')}</div>}

            {!!items.length && items.map((op: any) => (
              <OpinionCard key={op.id} opinion={op} />
            ))}

            {!q.isLoading && !items.length && <div>No opinions yet.</div>}

            {q.data?.nextCursor && (
              <div className="pt-2">
                <button
                  onClick={() => setCursor(q.data!.nextCursor)}
                  disabled={q.isFetching}
                  className="rounded border px-4 py-2 disabled:opacity-50"
                >
                  {q.isFetching ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </section>
        </div>

        <RightRail />
      </div>
    </div>
  )
}