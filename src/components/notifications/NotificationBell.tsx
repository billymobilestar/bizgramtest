'use client'
import { useState, useEffect } from 'react'
import { api } from '@/app/providers'
import NotificationDrawer from './NotificationDrawer'
import { useHasMounted } from '@/lib/useHasMounted'

/**
 * NotificationBell
 * - Uses new `unseenCount` endpoint for the badge (replaces `unreadCount`).
 * - Alt/Option + Click on the bell = Mark all as read.
 * - When the drawer closes, we refetch the count to keep the badge in sync.
 * - Keyboard shortcut: Cmd/Ctrl + N toggles the drawer.
 *
 * IMPORTANT: We must NOT change the order of hooks between renders.
 * We call hooks unconditionally and gate side-effects/fetching using `enabled: mounted`.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const mounted = useHasMounted()

  // Keep hook order stable. Always call the hook; disable fetching until mounted.
  const bellQ = api.notification.unseenCount.useQuery(undefined, {
    enabled: mounted,                                  // ✅ no fetch before mount, but hook order stays fixed
    refetchInterval: open ? 15000 : 30000,
    refetchOnWindowFocus: true,
  })

  const markAll = api.notification.markAllRead.useMutation({
    onSuccess: () => bellQ.refetch(),
  })

  // keyboard: Cmd/Ctrl + N toggles
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'n' || e.key === 'N') && (e.ctrlKey || e.metaKey)) {
        setOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const unread = mounted ? (bellQ.data?.count ?? 0) : 0

  // Render nothing until mounted to avoid any SSR/CSR popover mismatch,
  // but keep hooks above to preserve order across renders.
  if (!mounted) return null

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        title="Notifications — click to open, Alt/Option+Click to mark all read"
        onClick={(e) => {
          if (e.altKey) {
            if (!markAll.isPending) markAll.mutate()
          } else {
            setOpen(true)
          }
        }}
        className="relative px-3 py-1 border rounded"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full px-1">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <NotificationDrawer
          onClose={() => {
            setOpen(false)
            bellQ.refetch()
          }}
        />
      )}
    </div>
  )
}