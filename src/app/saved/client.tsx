'use client'

import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/app/providers'

type Kind = 'POSTS' | 'PEOPLE'

export default function Client() {
  const [tab, setTab] = useState<Kind>('POSTS')

  const lists = api.saved.myLists.useQuery({ kind: tab }, { placeholderData: (p) => p })
  const utils = api.useUtils()
  const create = api.saved.createList.useMutation({
    onSuccess: async () => {
      await utils.saved.myLists.invalidate({ kind: tab })
      setNewName('')
      setShowForm(false)
    },
  })

  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')

  const doCreate = () => {
    const name = newName.trim()
    if (!name || create.isPending) return
    create.mutate({ name, kind: tab })
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          className={`px-3 py-1 rounded border ${tab === 'POSTS' ? 'bg-black text-white' : ''}`}
          onClick={() => setTab('POSTS')}
        >
          Posts
        </button>
        <button
          className={`px-3 py-1 rounded border ${tab === 'PEOPLE' ? 'bg-black text-white' : ''}`}
          onClick={() => setTab('PEOPLE')}
        >
          People
        </button>
        <div className="ml-auto">
          {!showForm ? (
            <button className="px-3 py-1 rounded border" onClick={() => setShowForm(true)}>
              New list
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                placeholder={`New ${tab === 'POSTS' ? 'Posts' : 'People'} list name`}
                className="border rounded px-3 py-1"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button
                className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
                onClick={doCreate}
                disabled={!newName.trim() || create.isPending}
              >
                {create.isPending ? 'Creating…' : 'Create'}
              </button>
              <button className="px-3 py-1 rounded border" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lists */}
      {lists.isLoading && <p>Loading…</p>}
      {lists.error && <p className="text-red-600">{String((lists.error as any)?.message || 'Error')}</p>}

      {!lists.isLoading && (lists.data?.length ?? 0) === 0 && (
        <p className="text-gray-600">No {tab === 'POSTS' ? 'Posts' : 'People'} lists yet. Create one above.</p>
      )}

      {!!lists.data?.length && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lists.data!.map((l) => (
            <li key={l.id} className="p-3 border rounded-lg hover:shadow-sm transition">
              <Link href={`/saved/${l.id}`} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {l.count} {l.kind === 'POSTS' ? 'posts' : 'people'}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wide border rounded px-2 py-0.5">
                  {l.kind}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
