// src/app/messages/MessageItem.tsx
'use client'
import PostModal from '@/app/components/PostModal'

import { useState } from 'react'

type MsgPost = {
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

type MsgText = {
  id: string
  kind: 'text'
  fromUserId: string
  createdAt: string | Date
  text: string
}

export default function MessageItem({ msg, isMe }:{ msg: MsgPost | MsgText; isMe: boolean }) {
  const [open, setOpen] = useState<string | null>(null)

  if (msg.kind === 'post') {
    const p = msg.post
    return (
      <>
        <div
          className={`max-w-[260px] rounded-xl border overflow-hidden cursor-pointer ${
            isMe ? 'ml-auto' : ''
          }`}
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
      </>
    )
  }

  // plain text bubble
  return (
    <div className={`max-w-[70%] rounded-2xl px-3 py-2 border ${isMe ? 'ml-auto bg-gray-50' : 'bg-white'}`}>
      {msg.text}
    </div>
  )
}
