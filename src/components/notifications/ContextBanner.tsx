'use client'
import Link from 'next/link'
import { api } from '@/app/providers'

// Minimal shape we rely on from the API
type NotificationItem = {
  id: string
  title: string
  url?: string | null
  level: 'INFO' | 'ACTIONABLE' | 'CRITICAL' | string
  contextType?: string | null
  contextId?: string | null
}

export default function ContextBanner({ type, id }: { type: string; id: string }) {
  // NOTE: router exposes `notification.listMine`, not `notification.list`
  const q = api.notification.listMine.useInfiniteQuery(
    { limit: 10, unreadOnly: false },
    {
      getNextPageParam: (last) => (last as any)?.nextCursor,
      refetchInterval: 20_000,
      // Avoid background refetch causing flicker while typing elsewhere
      refetchOnWindowFocus: false,
    }
  )

  const all: NotificationItem[] = ((q.data?.pages ?? []).flatMap((p: any) => p.items) ?? []) as NotificationItem[]

  // Only show CRITICAL notifications that belong to this context
  const items = all.filter((n) => n.level === 'CRITICAL' && n.contextType === type && n.contextId === id)
  if (!items.length) return null

  const n = items[0]
  return (
    <div className="p-3 rounded bg-amber-50 border border-amber-200 flex items-center gap-3">
      <div className="font-medium">Heads up:</div>
      <div className="flex-1">{n.title}</div>
      {n.url ? (
        <Link href={n.url} className="px-3 py-1 border rounded bg-white">
          Open
        </Link>
      ) : null}
    </div>
  )
}