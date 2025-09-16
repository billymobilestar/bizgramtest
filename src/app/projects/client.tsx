// src/app/projects/client.tsx
'use client'
import { useState } from 'react'
import { api } from '@/app/providers'
import { useRouter } from 'next/navigation'

export default function Client(){
  const router = useRouter()
  const list = api.projects.listMine.useQuery()
  const create = api.projects.create.useMutation({
    onSuccess: (res) => { router.push(`/projects/${res.id}`) },
  })

  const [name, setName] = useState('')
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="border rounded px-3 py-2"
          placeholder="Project name"
          value={name}
          onChange={e=>setName(e.target.value)}
        />
        <button
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={create.isPending}
          onClick={()=> create.mutate({ name: name.trim() || 'Untitled Project' })}
        >
          {create.isPending ? 'Creating…' : 'Create project'}
        </button>
      </div>

      <ul className="divide-y border rounded">
        {(list.data ?? []).map(p => (
          <li key={p.id} className="p-3 flex items-center justify-between">
            <div className="font-medium">{p.name}</div>
            <a className="text-sm underline" href={`/projects/${p.id}`}>Open</a>
          </li>
        ))}
      </ul>
    </div>
  )
}