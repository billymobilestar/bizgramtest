// src/app/messages/[id]/client.tsx
'use client'

import { useState } from 'react'
import { api } from '@/app/providers'
import { useUser } from '@clerk/nextjs'
import MessageItem from '../MessageItem'
import PostModal from '@/app/components/PostModal'

type Props = { id?: string } // the dynamic route param

export default function ThreadClient({ id }: Props) {
  const { user } = useUser()
  const [openPostId, setOpenPostId] = useState<string | null>(null)

  // Our server expects { threadId }, so pass id as threadId
  const q = api.messages.list.useQuery(
    { threadId: id as string },
    { enabled: !!id, placeholderData: (p) => p }
  )

  if (!id) return <p>Select a conversation.</p>
  if (q.isLoading) return <p>Loading…</p>
  if (q.error) return <p className="text-red-600">{String((q.error as any)?.message || 'Error')}</p>

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-3">
        {q.data?.items.map((m: any) => {
          const isMe = m.fromUserId === user?.id

          // Rich preview for shared posts
          if (m.kind === 'post' && m.post) {
            const thumb = m.post.assets?.[0]?.url
            return (
              <button
                key={m.id}
                onClick={() => setOpenPostId(m.post.id)}
                className={`max-w-[75%] text-left border rounded-2xl overflow-hidden hover:shadow-sm transition ${
                  isMe ? 'self-end' : 'self-start'
                }`}
                aria-label="Open shared post"
              >
                {thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="w-full object-cover aspect-square" />
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
            )
          }

          // Fallback: normal text bubble
          return <MessageItem key={m.id} msg={m} isMe={isMe} />
        })}
      </div>

      {/* Modal for the shared post */}
      <PostModal openId={openPostId} onClose={() => setOpenPostId(null)} />
    </div>
  )
}
