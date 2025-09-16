// src/app/briefs/client.tsx
'use client'
import Link from 'next/link'
import { api } from '@/app/providers'

export default function Client(){
  const { data, isLoading, error } = api.brief.myBriefs.useQuery()
  if (isLoading) return <p>Loading…</p>
  if (error) return <p className="text-red-600">Error</p>
  if (!data?.length) return <p>No briefs yet.</p>
  return (
    <ul className="divide-y border rounded">
      {data.map(b => (
        <li key={b.id} className="p-3 flex items-center justify-between">
          <div>
            <div className="font-medium">{b.title}</div>
            <div className="text-sm text-gray-600">{b.status} · {b.proposals.length} proposals</div>
          </div>
          <Link className="px-3 py-1 border rounded" href={`/briefs/${b.id}`}>Open</Link>
        </li>
      ))}
    </ul>
  )
}
