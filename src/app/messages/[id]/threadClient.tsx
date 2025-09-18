// src/app/messages/[id]/client.tsx
'use client'

import { useMemo, useState } from 'react'
import { api } from '@/app/providers'
import { useUser } from '@clerk/nextjs'
import MessageItem from '../MessageItem'
import PostModal from '@/app/components/PostModal'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

type Props = { id?: string } // the dynamic route param

export default function ThreadClient({ id }: Props) {
  const { user } = useUser()
  const [openPostId, setOpenPostId] = useState<string | null>(null)

  // Our server expects { threadId }, so pass id as threadId
  const q = api.messages.list.useQuery(
    { threadId: id as string },
    { enabled: !!id, placeholderData: (p) => p }
  )

  // Build a participants map to resolve names in bubbles & header
  const participantsArray = (q.data as any)?.participants || (q.data as any)?.thread?.participants || []
  const participants = useMemo(() => {
    const map: Record<string, { displayName: string; handle?: string; avatarUrl?: string | null }> = {}
    ;(participantsArray || []).forEach((p: any) => {
      const uid = p?.userId ?? p?.id ?? p?.clerkId
      if (!uid) return
      map[uid] = {
        displayName: p?.displayName ?? p?.name ?? p?.handle ?? `User ${String(uid).slice(0, 6)}`,
        handle: p?.handle ?? undefined,
        avatarUrl: p?.avatarUrl ?? null,
      }
    })
    ;((q.data as any)?.items || []).forEach((m: any) => {
      const uid = m?.fromUserId
      if (!uid || map[uid]) return
      const from = m?.from ?? {}
      map[uid] = {
        displayName: from?.displayName ?? m?.fromDisplayName ?? `User ${String(uid).slice(0, 6)}`,
        handle: from?.handle ?? m?.fromHandle ?? undefined,
        avatarUrl: from?.avatarUrl ?? null,
      }
    })
    return map
  }, [participantsArray, q.data])

  const otherIds = Object.keys(participants).filter((uid) => uid !== user?.id)
  const otherName =
    otherIds.length === 1
      ? participants[otherIds[0]]?.displayName
      : otherIds.length > 1
      ? `${otherIds
          .slice(0, 2)
          .map((id) => participants[id]?.displayName || 'Member')
          .join(', ')}${otherIds.length > 2 ? ` +${otherIds.length - 2}` : ''}`
      : 'Conversation'

  if (!id) return <p>Select a conversation.</p>
  if (q.isLoading) return <p>Loading…</p>
  if (q.error) return <p className="text-red-600">{String((q.error as any)?.message || 'Error')}</p>

  return (
    <div className="flex h-full flex-col">
      {/* Thread header with back button & name */}
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white/90 dark:bg-black/60 backdrop-blur px-3 py-2">
        <Link href="/messages" aria-label="Back" className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-900">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="font-medium truncate">{otherName || 'Conversation'}</div>
      </header>

      <div className="flex-1 space-y-3 p-3">
        {q.data?.items.map((m: any) => {
          const isMe = m.fromUserId === user?.id

          // Rich preview for shared posts (with sender label)
          if (m.kind === 'post' && m.post) {
            const thumb = m.post.assets?.[0]?.url
            const senderLabel = isMe ? 'You' : participants[m.fromUserId]?.displayName || `User ${String(m.fromUserId).slice(0, 6)}`
            return (
              <div key={m.id} className={isMe ? 'ml-auto max-w-[75%]' : 'max-w-[75%]'}>
                <div className="mb-1 text-xs text-neutral-500">{senderLabel}</div>
                <button
                  onClick={() => setOpenPostId(m.post.id)}
                  className="text-left border rounded-2xl overflow-hidden hover:shadow-sm transition w-full"
                  aria-label="Open shared post"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="w-full object-cover aspect-square" />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-xs text-gray-500">Post</div>
                  )}
                  <div className="p-2 text-sm">
                    <div className="font-medium">
                      {m.post.author.displayName}{' '}
                      <span className="text-gray-500">@{m.post.author.handle}</span>
                    </div>
                    {m.post.caption && (
                      <div className="text-gray-700 line-clamp-2">{m.post.caption}</div>
                    )}
                  </div>
                </button>
              </div>
            )
          }

          // Default: let MessageItem render text/image with names & linkification
          return <MessageItem key={m.id} msg={m} isMe={isMe} participants={participants} />
        })}
      </div>

      {/* Modal for the shared post */}
      <PostModal openId={openPostId} onClose={() => setOpenPostId(null)} />
    </div>
  )
}
