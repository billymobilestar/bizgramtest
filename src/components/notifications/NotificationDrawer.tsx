'use client'
import { api } from '@/app/providers'
import Link from 'next/link'

type N = {
  id: string
  title: string | null
  body: string | null
  url: string | null
  isRead: boolean
  contextType?: string | null
  contextId?: string | null
  createdAt: string | Date
}

export default function NotificationDrawer({ onClose }: { onClose: () => void }) {
  const utils = api.useUtils()

  // Use the router's available `listMine` endpoint (no `recent` in this project)
  const q = api.notification.listMine.useQuery(
    { limit: 20, unreadOnly: false },
    { refetchInterval: 15000 }
  )

  const markRead = api.notification.markRead.useMutation({
    onSuccess: async () => {
      // Invalidate list queries (no `unreadCount` endpoint in this project)
      await utils.notification.listMine.invalidate()
    },
  })

  const items: N[] = (q.data?.items as N[] | undefined) ?? []

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-[360px] bg-white shadow-xl p-3 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Notifications</div>
          <button onClick={onClose} className="text-sm px-2 py-1 border rounded">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {items.map((n: N) => (
            <div key={n.id} className={`py-2 ${n.isRead ? 'opacity-70' : ''}`}>
              <div className="text-sm font-medium">{n.title}</div>
              {n.body && <div className="text-xs text-gray-600 line-clamp-2">{n.body}</div>}
              <div className="mt-1 flex items-center gap-2">
                {n.url && (
                  <Link
                    href={n.url}
                    className="text-xs underline"
                    onClick={() => markRead.mutate({ id: n.id })}
                  >
                    Open
                  </Link>
                )}
                {!n.isRead && (
                  <button
                    className="text-xs px-2 py-0.5 border rounded"
                    onClick={() => markRead.mutate({ id: n.id })}
                  >
                    Mark read
                  </button>
                )}
                {n.contextType && n.contextId && (
                  <span className="text-[10px] text-gray-500 border rounded px-1">
                    {n.contextType}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 ml-auto">
                  {new Date(n.createdAt as unknown as string).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-sm text-gray-500 py-4">No notifications yet.</div>
          )}
        </div>
        <div className="pt-2 border-t">
          <Link href="/notifications" className="text-sm underline" onClick={onClose}>
            View all
          </Link>
        </div>
      </aside>
    </div>
  )
}