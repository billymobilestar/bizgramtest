// src/app/messages/[id]/client.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/app/providers'
import { useUser } from '@clerk/nextjs'
import MessageItem from '../MessageItem'
import PostModal from '@/app/components/PostModal'

type Props = { id?: string }

export default function ThreadClient({ id }: Props) {
  const { user } = useUser()
  const utils = api.useUtils()
  const [openPostId, setOpenPostId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const q = api.messages.list.useQuery(
    { threadId: id as string },
    { enabled: !!id, placeholderData: (p) => p }
  )

  const send = api.messages.send.useMutation({
    onMutate: async (vars) => {
      await utils.messages.list.cancel({ threadId: vars.threadId })
      const prev = utils.messages.list.getData({ threadId: vars.threadId })
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        threadId: vars.threadId,
        fromUserId: user?.id ?? 'me',
        text: vars.text,
        createdAt: new Date(),
      } as any
      utils.messages.list.setData({ threadId: vars.threadId }, (old) => ({
        items: [...(old?.items ?? []), optimistic],
      }))
      return { prev }
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prev) utils.messages.list.setData({ threadId: vars.threadId }, ctx.prev as any)
    },
    onSettled: (_res, _err, vars) => {
      utils.messages.list.invalidate({ threadId: vars.threadId }).catch(() => {})
    },
  })

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [q.data?.items?.length])

  if (!id) return <p>Select a conversation.</p>
  if (q.isLoading) return <p>Loading…</p>
  if (q.error) return <p className="text-red-600">{String((q.error as any)?.message || 'Error')}</p>

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doSend()
    }
  }

  const doSend = () => {
    const value = text.trim()
    if (!value || send.isPending) return
    send.mutate({ threadId: id!, text: value })
    setText('')
  }

  return (
    // Parent must be full-height so footer can sit flush at the bottom
    <div className="flex h-full min-h-0 flex-col">
      {/* Scrollable messages only */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 pb-3">
        {q.data?.items.map((m: any) => {
          const isMe = m.fromUserId === user?.id

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

        return <MessageItem key={m.id} msg={m} isMe={isMe} />
        })}
        <div ref={endRef} />
      </div>

      {/* Composer – pinned, no extra bottom gap */}
      <div className="border-t bg-white p-3 [padding-bottom:env(safe-area-inset-bottom)]">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            doSend()
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message… (Shift+Enter for newline)"
            rows={1}
            className="flex-1 resize-none border rounded-lg px-3 py-2 max-h-40"
          />
          <button
            type="submit"
            disabled={!text.trim() || send.isPending}
            className="px-4 py-2 rounded-lg border bg-black text-white disabled:opacity-50"
          >
            {send.isPending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>

      {/* Post modal */}
      <PostModal openId={openPostId} onClose={() => setOpenPostId(null)} />
    </div>
  )
}
