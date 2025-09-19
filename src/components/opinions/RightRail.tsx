'use client'

import { api } from '@/app/providers'
import Link from 'next/link'

export default function RightRail() {
  const trending = api.opinions.listTrending.useQuery({ limit: 5 })
  const hot = api.opinions.listHot.useQuery({ limit: 5 })

  return (
    <aside className="lg:sticky lg:top-20 space-y-6">
      <section className="rounded-xl border bg-white p-4">
        <h3 className="font-semibold">Trending</h3>
        <ul className="mt-2 space-y-2">
          {(trending.data?.items ?? []).map((op: any) => (
            <li key={op.id} className="text-sm">
              <div className="truncate">
                {op.text || (op.kind === 'PHOTO' ? '📷 Photo' : '🗳️ Poll')}
              </div>
              <div className="text-xs text-neutral-600">
                ❤️ {op.reactionCount} · 💬 {op.commentCount} {op.kind === 'POLL' ? `· 🗳️ ${op.voteCount}` : ''}
              </div>
            </li>
          ))}
          {!trending.isLoading && !(trending.data?.items?.length) && (
            <li className="text-sm text-neutral-600">No items.</li>
          )}
        </ul>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h3 className="font-semibold">Hot</h3>
        <ul className="mt-2 space-y-2">
          {(hot.data?.items ?? []).map((op: any) => (
            <li key={op.id} className="text-sm">
              <div className="truncate">
                {op.text || (op.kind === 'PHOTO' ? '📷 Photo' : '🗳️ Poll')}
              </div>
              <div className="text-xs text-neutral-600">
                ❤️ {op.reactionCount} · 💬 {op.commentCount} {op.kind === 'POLL' ? `· 🗳️ ${op.voteCount}` : ''}
              </div>
            </li>
          ))}
          {!hot.isLoading && !(hot.data?.items?.length) && (
            <li className="text-sm text-neutral-600">No items.</li>
          )}
        </ul>
      </section>
    </aside>
  )
}