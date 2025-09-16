'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/app/providers'

export default function ProjectsClient(){
  const router = useRouter()
  const list = api.projects.listMine.useQuery(undefined, { refetchOnWindowFocus: false })
  const [name, setName] = useState('')
  const create = api.projects.create.useMutation({
    onSuccess: (res) => { if (res?.id) router.push(`/projects/${res.id}`) },
    onError: (e:any) => alert(e?.message || 'Failed to create project'),
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} placeholder="Project name" />
        <button
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={create.isPending}
          onClick={()=> create.mutate({ name: name.trim() || 'Untitled Project' })}
        >
          {create.isPending ? 'Creating…' : 'Create project'}
        </button>
      </div>

      {list.isLoading && <p>Loading…</p>}
      {list.error && <p className="text-red-600">{String((list.error as any)?.message || 'Error')}</p>}

      <ul className="divide-y border rounded">
        {(list.data ?? []).map(p => (
          <li key={p.id} className="p-3 flex items-center justify-between">
            <div className="font-medium">{p.name}</div>
            <button className="text-sm underline" onClick={()=>router.push(`/projects/${p.id}`)}>Open</button>
          </li>
        ))}
      </ul>
    </div>
  )
}