'use client'

import React, { useMemo, useState } from 'react'
import { api } from '@/app/providers'

type Props = { postId: string }

export default function Comments({ postId }: Props) {
  const utils = api.useUtils()
  const [text, setText] = useState('')

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
    },
    onError: (e) => alert((e as any)?.message || 'Failed to post'),
  })

  const items = useMemo(() => (list.data ? list.data.pages.flatMap((p) => p.items) : []), [list.data])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || add.isPending) return
    add.mutate({ postId, text: t })
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          placeholder="Write a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={add.isPending}
        />
        <button
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          type="submit"
          disabled={!text.trim() || add.isPending}
        >
          {add.isPending ? 'Posting…' : 'Post'}
        </button>
      </form>

      {list.isLoading && <div className="text-sm text-gray-500">Loading comments…</div>}
      {list.error && (
        <div className="text-sm text-red-600">{String((list.error as any)?.message || 'Error')}</div>
      )}

      <ul className="space-y-2">
        {items.map((c: any) => (
          <li key={c.id} className="border rounded p-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{c.author.displayName}</span>
              {c.author.handle ? <span className="ml-1 text-gray-400">@{c.author.handle}</span> : null}
              <span className="ml-2 text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <div className="mt-1 whitespace-pre-wrap">{c.text}</div>
          </li>
        ))}
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
