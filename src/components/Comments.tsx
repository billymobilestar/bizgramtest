'use client'

import React, { useMemo, useState } from 'react'
import { api } from '@/app/providers'

type Props = { postId: string }

// Simple emoji & sticker sets (no extra deps)
const EMOJIS = ['😀','😁','😂','🤣','😊','😍','😎','🥳','👍','🔥','🙏','👏','💯','🎉','💡','🙌','🤝']
const STICKERS = [
  'https://cdn.jsdelivr.net/gh/joypixels/emoji-assets/png/64/1f389.png', // party popper
  'https://cdn.jsdelivr.net/gh/joypixels/emoji-assets/png/64/1f525.png', // fire
  'https://cdn.jsdelivr.net/gh/joypixels/emoji-assets/png/64/1f60d.png', // heart eyes
  'https://cdn.jsdelivr.net/gh/joypixels/emoji-assets/png/64/1f44d.png', // thumbs up
  'https://cdn.jsdelivr.net/gh/joypixels/emoji-assets/png/64/1f64f.png', // pray
  'https://cdn.jsdelivr.net/gh/joypixels/emoji-assets/png/64/1f4af.png', // 100
]

// Turn plain text into text + clickable links
function linkify(text: string) {
  const urlRe = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
  const parts = text.split(urlRe)
  return parts.map((part, i) => {
    if (/^(https?:\/\/|www\.)/i.test(part)) {
      const href = part.startsWith('http') ? part : `https://${part}`
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-words hover:opacity-80"
        >
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function Comments({ postId }: Props) {
  const utils = api.useUtils()
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showStickers, setShowStickers] = useState(false)

  const list = api.comment.list.useInfiniteQuery(
    { postId, limit: 20 },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    }
  )

  const add = api.comment.add.useMutation({
    onSuccess: async (created) => {
      // Optimistically prepend to the first page
      utils.comment.list.setInfiniteData({ postId, limit: 20 }, (old) => {
        if (!old) return old
        const first = old.pages[0]
        const next = {
          ...old,
          pages: [{ ...first, items: [created, ...first.items] }, ...old.pages.slice(1)],
        }
        return next
      })
      setText('')
      setShowEmoji(false)
      setShowStickers(false)
    },
    onError: (e) => alert((e as any)?.message || 'Failed to post'),
  })

  const items = useMemo(() => (list.data ? list.data.pages.flatMap((p) => p.items) : []), [list.data])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || add.isPending) return
    // Send as TEXT kind (server also supports STICKER kind)
    add.mutate({ kind: 'TEXT', postId, text: t } as any)
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={add.isPending}
          />
          <button
            type="button"
            className="px-3 py-2 rounded border hover:bg-neutral-50"
            onClick={() => { setShowEmoji((s) => !s); setShowStickers(false) }}
            aria-label="Insert emoji"
          >
            😊
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded border hover:bg-neutral-50"
            onClick={() => { setShowStickers((s) => !s); setShowEmoji(false) }}
            aria-label="Send sticker"
          >
            Stickers
          </button>
          <button
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
            type="submit"
            disabled={!text.trim() || add.isPending}
          >
            {add.isPending ? 'Posting…' : 'Post'}
          </button>
        </div>

        {showEmoji && (
          <div className="grid grid-cols-12 gap-1 rounded-lg border p-2 max-w-xl bg-white">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className="text-xl hover:scale-110"
                onClick={() => setText((t) => t + e)}
                aria-label={`Insert ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {showStickers && (
          <div className="grid grid-cols-8 gap-2 rounded-lg border p-2 max-w-xl bg-white">
            {STICKERS.map((url) => (
              <button
                key={url}
                type="button"
                className="rounded-md border hover:bg-neutral-50 p-1"
                onClick={() => add.mutate({ kind: 'STICKER', postId, stickerUrl: url } as any)}
                title="Send sticker"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="sticker" className="h-10 w-10" />
              </button>
            ))}
          </div>
        )}
      </form>

      {list.isLoading && <div className="text-sm text-gray-500">Loading comments…</div>}
      {list.error && (
        <div className="text-sm text-red-600">{String((list.error as any)?.message || 'Error')}</div>
      )}

      <ul className="space-y-2">
        {items.map((c: any) => {
          const kind = c.kind ?? 'TEXT'
          return (
            <li key={c.id} className="border rounded p-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{c.author.displayName}</span>
                {c.author.handle ? <span className="ml-1 text-gray-400">@{c.author.handle}</span> : null}
                <span className="ml-2 text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div className="mt-1">
                {kind === 'STICKER' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.stickerUrl} alt="sticker" className="h-16 w-16" />
                ) : (
                  <p className="whitespace-pre-wrap break-words">{linkify(c.text || '')}</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {list.hasNextPage && (
        <div className="text-center">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => list.fetchNextPage()}
            disabled={list.isFetchingNextPage}
          >
            {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
