'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/app/providers'
import { useRouter } from 'next/navigation'

export default function NewDMButton() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement | null>(null)

  const recipientsQ = api.dm.listRecipients.useQuery(
    { q, limit: 20 },
    { enabled: open } // only load when opened
  )

  const start = api.dm.startThreadWithUser.useMutation({
    onSuccess: (t) => router.push(`/messages/${t.id}`),
  })

  // close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current) return
      if (!panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div className="relative inline-block" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 border rounded"
      >
        New message
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-80 border rounded bg-white shadow">
          <div className="p-2 border-b">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by handle or name…"
              className="w-full border rounded px-2 py-1"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-auto">
            {recipientsQ.isLoading && (
              <div className="p-3 text-sm text-gray-600">Loading…</div>
            )}
            {recipientsQ.error && (
              <div className="p-3 text-sm text-red-600">Error loading users</div>
            )}

            {recipientsQ.data && recipientsQ.data.length === 0 && (
              <div className="p-3 text-sm text-gray-700">No users available.</div>
            )}

            {recipientsQ.data?.map((r) => (
              <button
                key={r.userId}
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                onClick={() => {
                  if (start.isPending) return
                  start.mutate({ userId: r.userId })
                }}
              >
                <div className="font-medium">
                  {r.displayName}{' '}
                  <span className="text-gray-500">@{r.handle}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {[r.profession, [r.city, r.region].filter(Boolean).join(', ')]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
