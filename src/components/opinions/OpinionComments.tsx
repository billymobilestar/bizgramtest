'use client'

import { useState } from 'react'
import { api } from '@/app/providers'

export default function OpinionComments({ opinionId }: { opinionId: string }) {
  // For v1 keep it simple: we don’t fetch the list separately (can add later)
  const [text, setText] = useState('')
  const utils = api.useUtils()
  const add = api.opinions.comment.useMutation({
    onSuccess: () => {
      setText('')
      utils.opinions.listNew.invalidate().catch(() => {})
      utils.opinions.listTrending.invalidate().catch(() => {})
      utils.opinions.listHot.invalidate().catch(() => {})
    },
    onError: (e) => alert(String((e as any)?.message || 'Failed to comment')),
  })

  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-neutral-600 mb-2">Anonymous comments</div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write an anonymous comment…"
          className="w-full rounded border px-3 py-2"
        />
        <button
          disabled={!text.trim() || add.isPending}
          onClick={() => add.mutate({ id: opinionId, text: text.trim() })}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {add.isPending ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}