// src/app/messages/MessageItem.tsx
'use client'
import PostModal from '@/app/components/PostModal'
import Link from 'next/link'
import { useMemo, useState } from 'react'

// --- Message shapes ---
export type MsgPost = {
  id: string
  kind: 'post'
  fromUserId: string
  createdAt: string | Date
  post: {
    id: string
    caption: string | null
    author: { handle: string; displayName: string; avatarUrl: string | null } | null
    assetUrl: string | null
  }
}

export type MsgText = {
  id: string
  kind: 'text'
  fromUserId: string
  createdAt: string | Date
  text: string
}

export type MsgImage = {
  id: string
  kind: 'image'
  fromUserId: string
  createdAt: string | Date
  url: string
  alt?: string | null
}

type Participant = { displayName: string; handle?: string; avatarUrl?: string | null }

export default function MessageItem({
  msg,
  isMe,
  participants,
}: {
  msg: MsgPost | MsgText | MsgImage
  isMe: boolean
  /** Optional map to resolve names from ids */
  participants?: Record<string, Participant>
}) {
  const [open, setOpen] = useState<string | null>(null)

  // Resolve a human name for the sender
  const senderName = useMemo(() => {
    if (isMe) return 'You'
    const p = participants?.[msg.fromUserId]
    return p?.displayName ?? `User ${msg.fromUserId.slice(0, 6)}`
  }, [isMe, msg.fromUserId, participants])

  // helper: linkify plain text
  function linkify(text: string) {
    const urlRe = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
    const parts = text.split(urlRe)
    return parts.map((part, i) => {
      if (urlRe.test(part)) {
        const href = part.startsWith('http') ? part : `https://${part}`
        return (
          <Link key={i} href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 break-words">
            {part}
          </Link>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  // POST share card
  if (msg.kind === 'post') {
    const p = msg.post
    return (
      <div className={isMe ? 'ml-auto max-w-[280px]' : 'max-w-[280px]'}>
        <div className="mb-1 text-xs text-neutral-500">{senderName}</div>
        <div
          className={`rounded-xl border overflow-hidden cursor-pointer ${isMe ? '' : ''}`}
          onClick={() => setOpen(p.id)}
          title="Open post"
        >
          {/* image preview */}
          {p.assetUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.assetUrl} alt="" className="w-full aspect-square object-cover" />
          ) : (
            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-xs text-gray-500">
              Post
            </div>
          )}
          {/* meta */}
          <div className="p-2 text-sm">
            <div className="font-medium">
              {p.author ? `${p.author.displayName} @${p.author.handle}` : 'Post'}
            </div>
            {p.caption && (
              <div className="text-gray-600 line-clamp-2">{p.caption}</div>
            )}
          </div>
        </div>

        {/* modal */}
        {open && <PostModal openId={open} onClose={() => setOpen(null)} />}
      </div>
    )
  }

  // IMAGE bubble
  if (msg.kind === 'image') {
    return (
      <div className={isMe ? 'ml-auto max-w-[280px]' : 'max-w-[280px]'}>
        <div className="mb-1 text-xs text-neutral-500">{senderName}</div>
        <a
          href={(msg as MsgImage).url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block overflow-hidden rounded-2xl border ${isMe ? '' : ''}`}
          title="Open image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={(msg as MsgImage).url}
            alt={(msg as MsgImage).alt ?? ''}
            className="w-full max-h-[360px] object-cover"
          />
        </a>
      </div>
    )
  }

  // TEXT bubble
  return (
    <div className={isMe ? 'ml-auto max-w-[70%]' : 'max-w-[70%]'}>
      <div className="mb-1 text-xs text-neutral-500">{senderName}</div>
      <div className={`rounded-2xl px-3 py-2 border ${isMe ? 'bg-gray-50' : 'bg-white'}`}>
        {linkify((msg as MsgText).text)}
      </div>
    </div>
  )
}
