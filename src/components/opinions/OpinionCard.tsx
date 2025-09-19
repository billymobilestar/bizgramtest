'use client'

import { api } from '@/app/providers'
import { useState } from 'react'
import OpinionComments from '././OpinionComments'

export default function OpinionCard({ opinion }: { opinion: any }) {
  const [showComments, setShowComments] = useState(false)
  const utils = api.useUtils()

  const react = api.opinions.react.useMutation({
    onSuccess: () => {
      utils.opinions.listNew.invalidate().catch(() => {})
      utils.opinions.listTrending.invalidate().catch(() => {})
      utils.opinions.listHot.invalidate().catch(() => {})
    }
  })

  const vote = api.opinions.vote.useMutation({
    onSuccess: () => {
      utils.opinions.listNew.invalidate().catch(() => {})
      utils.opinions.listTrending.invalidate().catch(() => {})
      utils.opinions.listHot.invalidate().catch(() => {})
    }
  })

  return (
    <article className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-neutral-500">{new Date(opinion.createdAt).toLocaleString()}</div>

      {/* Content */}
      <div className="mt-2 space-y-2">
        {opinion.text && <p className="whitespace-pre-wrap">{opinion.text}</p>}

        {opinion.kind === 'PHOTO' && opinion.assets?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={opinion.assets[0].url}
            alt={opinion.assets[0].altText ?? ''}
            className="w-full rounded-lg object-cover"
          />
        )}

        {opinion.kind === 'POLL' && (
          <div className="space-y-2">
            {opinion.pollOptions?.map((opt: any) => (
              <button
                key={opt.id}
                onClick={() => vote.mutate({ id: opinion.id, optionId: opt.id })}
                className="w-full rounded border px-3 py-2 text-left hover:bg-neutral-50"
              >
                <div className="flex items-center justify-between">
                  <span>{opt.label}</span>
                  <span className="text-xs text-neutral-600">{opt.count}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button
          onClick={() => react.mutate({ id: opinion.id })}
          className="rounded border px-3 py-1.5"
        >
          ❤️ {opinion.reactionCount}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="rounded border px-3 py-1.5"
        >
          💬 {opinion.commentCount}
        </button>
        {opinion.kind === 'POLL' && (
          <span className="rounded border px-3 py-1.5">🗳️ {opinion.voteCount}</span>
        )}
      </div>

      {showComments && (
        <div className="mt-3">
          <OpinionComments opinionId={opinion.id} />
        </div>
      )}
    </article>
  )
}