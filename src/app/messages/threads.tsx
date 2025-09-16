'use client'
import Link from 'next/link'
import { api } from '@/app/providers'
import { useUser } from '@clerk/nextjs'

export default function Client(){
  const { user } = useUser()
  const { data, isLoading, error } = api.dm.listThreads.useQuery()

  if (isLoading) return <p>Loading…</p>
  if (error) return <p className="text-red-600">Error loading messages.</p>
  if (!data?.length) return <p>No conversations yet.</p>

  return (
    <ul className="divide-y border rounded">
      {data.map(t => {
        const last = t.messages[0]
        const who = last?.fromUserId === user?.id ? 'You: ' : ''
        return (
          <li key={t.id} className="p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">Thread #{t.id.slice(0,6)}</div>
              <div className="text-sm text-gray-600 truncate w-72">
                {who}{last?.text ?? 'No messages yet'}
              </div>
            </div>
            <Link href={`/messages/${t.id}`} className="px-3 py-1 border rounded">
              Open
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
