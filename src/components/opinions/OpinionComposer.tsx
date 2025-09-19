'use client'

import { useMemo, useState } from 'react'
import { api } from '@/app/providers'

type Kind = 'TEXT' | 'PHOTO' | 'POLL'

export default function OpinionComposer() {
  const [kind, setKind] = useState<Kind>('TEXT')
  const [text, setText] = useState('')
  const [photoUrl, setPhotoUrl] = useState('') // keep simple: paste URL for now
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

  const utils = api.useUtils()
  const create = api.opinions.create.useMutation({
    onSuccess: () => {
      setText(''); setPhotoUrl(''); setPollOptions(['', ''])
      utils.opinions.listNew.invalidate().catch(() => {})
      utils.opinions.listTrending.invalidate().catch(() => {})
      utils.opinions.listHot.invalidate().catch(() => {})
    },
    onError: (e) => alert(String((e as any)?.message || 'Failed to post')),
  })

  const canSubmit = useMemo(() => {
    if (kind === 'TEXT') return text.trim().length > 0
    if (kind === 'PHOTO') return !!photoUrl || text.trim().length > 0
    if (kind === 'POLL') return pollOptions.filter(o => o.trim().length).length >= 2
    return false
  }, [kind, text, photoUrl, pollOptions])

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex gap-2 mb-3">
        <button onClick={() => setKind('TEXT')} className={`px-3 py-1.5 rounded border ${kind === 'TEXT' ? 'bg-black text-white' : ''}`}>Text</button>
        <button onClick={() => setKind('PHOTO')} className={`px-3 py-1.5 rounded border ${kind === 'PHOTO' ? 'bg-black text-white' : ''}`}>Photo</button>
        <button onClick={() => setKind('POLL')} className={`px-3 py-1.5 rounded border ${kind === 'POLL' ? 'bg-black text-white' : ''}`}>Poll</button>
      </div>

      {kind !== 'PHOTO' && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={kind === 'TEXT' ? 'Ask your question…' : 'Add an optional caption…'}
          className="w-full rounded border px-3 py-2 min-h-[80px]"
        />
      )}

      {kind === 'PHOTO' && (
        <div className="space-y-2">
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="Paste image URL (wire to your uploader later)"
            className="w-full rounded border px-3 py-2"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Optional caption"
            className="w-full rounded border px-3 py-2 min-h-[60px]"
          />
        </div>
      )}

      {kind === 'POLL' && (
        <div className="mt-2 space-y-2">
          {pollOptions.map((opt, i) => (
            <input
              key={i}
              value={opt}
              onChange={(e) => {
                const next = [...pollOptions]; next[i] = e.target.value; setPollOptions(next)
              }}
              placeholder={`Option ${i + 1}`}
              className="w-full rounded border px-3 py-2"
            />
          ))}
          <div className="flex gap-2">
            <button
              onClick={() => setPollOptions([...pollOptions, ''])}
              className="rounded border px-3 py-1.5"
            >
              + Add option
            </button>
            {pollOptions.length > 2 && (
              <button
                onClick={() => setPollOptions(pollOptions.slice(0, -1))}
                className="rounded border px-3 py-1.5"
              >
                − Remove last
              </button>
            )}
          </div>
        </div>
      )}

      <div className="pt-3 flex justify-end">
        <button
          disabled={!canSubmit || create.isPending}
          onClick={() => {
            if (kind === 'TEXT') {
              create.mutate({ kind, text: text.trim() })
            } else if (kind === 'PHOTO') {
              const assets = photoUrl ? [{ url: photoUrl }] : []
              create.mutate({ kind, text: text.trim() || undefined, assets })
            } else {
              const options = pollOptions.map(o => o.trim()).filter(Boolean)
              create.mutate({ kind, text: text.trim() || undefined, pollOptions: options })
            }
          }}
          className="rounded-lg bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {create.isPending ? 'Posting…' : 'Post anonymously'}
        </button>
      </div>
    </div>
  )
}