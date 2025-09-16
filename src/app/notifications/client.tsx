'use client'
import { useMemo, useState } from 'react'
import { api } from '@/app/providers'
import Link from 'next/link'

type Filter = 'all' | 'unread' | 'system' | 'project'

type UIItem = {
  id: string
  isRead: boolean
  title: string
  body?: string | null
  url?: string | null
  createdAt: string | Date
  contextType?: string | null
}

export default function NotificationCenterClient() {
  const [filter, setFilter] = useState<Filter>('all')

  // Router has `listMine` (not `list`). We only pass unreadOnly when needed.
  const q = api.notification.listMine.useInfiniteQuery(
    { limit: 20, unreadOnly: filter === 'unread' ? true : undefined },
    {
      getNextPageParam: (last: { nextCursor?: string | null }) => last?.nextCursor ?? undefined,
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
    }
  )

  const utils = api.useUtils()

  // Some deployments may not expose `unreadCount`; invalidate it if present.
  const invalidateCounts = async () => {
    const u: any = utils
    if (u.notification?.unreadCount?.invalidate) {
      await u.notification.unreadCount.invalidate()
    }
  }

  const markAll = api.notification.markAllRead.useMutation({
    onSuccess: async () => {
      await invalidateCounts()
      await q.refetch()
    },
  })
  const mark = api.notification.markRead.useMutation({
    onSuccess: async () => {
      await invalidateCounts()
      await q.refetch()
    },
  })

  const rawItems: UIItem[] = useMemo(
    () => (q.data?.pages.flatMap((p: any) => p.items) ?? []) as UIItem[],
    [q.data]
  )

  const items: UIItem[] = useMemo(() => {
    if (filter === 'system') return rawItems.filter((i) => i.contextType === 'SYSTEM')
    if (filter === 'project') return rawItems.filter((i) => i.contextType === 'PROJECT')
    return rawItems
  }, [rawItems, filter])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(['all', 'unread', 'system', 'project'] as const).map((f) => (
          <button
            key={f}
            className={`px-3 py-1 border rounded ${filter === f ? 'bg-black text-white' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
        <button
          className="ml-auto px-3 py-1 border rounded"
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending}
        >
          {markAll.isPending ? 'Marking…' : 'Mark all read'}
        </button>
      </div>

      <div className="border rounded divide-y">
        {items.map((n: UIItem) => (
          <div key={n.id} className={`p-3 ${n.isRead ? 'opacity-70' : ''}`}>
            <div className="flex items-center gap-2">
              <div className="font-medium">{n.title}</div>
              {n.contextType && <span className="text-[10px] border rounded px-1">{n.contextType}</span>}
              <span className="ml-auto text-xs text-gray-500">
                {new Date(n.createdAt as any).toLocaleString()}
              </span>
            </div>
            {n.body && <div className="text-sm text-gray-700">{n.body}</div>}
            <div className="mt-1 flex items-center gap-2">
              {n.url && (
                <Link className="text-sm underline" href={n.url} onClick={() => mark.mutate({ id: n.id })}>
                  Open
                </Link>
              )}
              {!n.isRead && (
                <button
                  className="text-sm px-2 py-0.5 border rounded"
                  onClick={() => mark.mutate({ id: n.id })}
                  disabled={mark.isPending}
                >
                  {mark.isPending ? '…' : 'Mark read'}
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="p-6 text-sm text-gray-500">Nothing here yet.</div>}
      </div>

      {q.hasNextPage && (
        <div>
          <button className="px-4 py-2 border rounded" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
            {q.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}