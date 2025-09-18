// src/app/projects/client.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/app/providers'

export default function Client() {
  const [name, setName] = useState('')

  const list = api.projects.listMine.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 0,
  })

  const utils = api.useUtils()
  const create = api.projects.create.useMutation({
    onSuccess: () => {
      setName('')
      utils.projects.listMine.invalidate()
    },
    onError: (e) => alert(String((e as any)?.message || 'Create failed')),
  })

  const items = list.data ?? []

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-xl font-semibold">Projects</h1>

      {/* Create project */}
      <div className="flex gap-2">
        <input
          className="w-full rounded-lg border px-3 py-2"
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="rounded-lg bg-black px-3 py-2 text-white disabled:opacity-50"
          disabled={create.isPending}
          onClick={() => {
            const n = (name || '').trim() || 'Untitled Project'
            create.mutate({ name: n })
          }}
        >
          {create.isPending ? 'Creating…' : 'Create'}
        </button>
      </div>

      {/* Plain list (no cards) */}
      <ul className="divide-y rounded-xl border bg-white">
        {items.map((p: any) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <div className="truncate font-medium">{p.name || 'Untitled Project'}</div>
              {p.shootDate && (
                <div className="text-xs text-neutral-500">
                  {new Date(p.shootDate).toLocaleString()}
                </div>
              )}
            </div>
            <Link
              href={`/projects/${p.id}`}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
              aria-label={`Open project ${p.name || 'Untitled Project'}`}
            >
              Open
            </Link>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-6 text-sm text-neutral-600">No projects yet. Create your first one above.</li>
        )}
      </ul>
    </div>
  )
}