// src/app/briefs/[id]/client.tsx
'use client'
import { api } from '@/app/providers'
import { useUser } from '@clerk/nextjs'
import { useState } from 'react'

export default function Client({ id }: { id: string }){
  const { user } = useUser()
  const { data, isLoading, error, refetch } = api.brief.getById.useQuery({ id })
  const invite = api.brief.inviteByHandle.useMutation({ onSuccess: () => refetch() })
  const submit = api.brief.submitProposal.useMutation({ onSuccess: () => refetch() })
  const setStatus = api.brief.setProposalStatus.useMutation({ onSuccess: () => refetch() })
  const [handle, setHandle] = useState('')
  const [message, setMessage] = useState('')
  const [price, setPrice] = useState<number | ''>('')

  if (isLoading) return <p>Loading…</p>
  if (error || !data) return <p className="text-red-600">Error</p>

  const iAmOwner = user?.id === (data as any).createdByUserId

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{data.title}</h1>
        <div className="text-sm text-gray-600">{data.status}</div>
      </div>
      <p className="whitespace-pre-wrap">{data.description}</p>
      {(data.budgetMin || data.budgetMax) && (
        <p className="text-sm text-gray-700">Budget: {data.budgetMin ?? '—'} – {data.budgetMax ?? '—'} {data.currency}</p>
      )}
      {[data.city, data.region].some(Boolean) && (
        <p className="text-sm text-gray-700">Location: {[data.city, data.region].filter(Boolean).join(', ')}</p>
      )}

      {iAmOwner && (
        <div className="border rounded p-3 space-y-2">
          <div className="font-medium">Invite creators (by handle)</div>
          <div className="flex gap-2">
            <input className="border rounded px-3 py-2" placeholder="handle (without @)" value={handle} onChange={e=>setHandle(e.target.value)} />
            <button className="px-3 py-2 border rounded"
              onClick={()=> invite.mutate({ briefId: id, handle })}
              disabled={invite.isPending}
            >{invite.isPending?'Inviting…':'Invite'}</button>
          </div>
          <div>
            <div className="font-medium mt-3">Invited</div>
            <ul className="list-disc ml-5">
              {data.targets.map(t => (
                <li key={t.profileId}>{t.profile.displayName} @{t.profile.handle}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded p-3">
          <div className="font-medium">Proposals</div>
          {!data.proposals.length && <p className="text-sm text-gray-600">No proposals yet.</p>}
          <ul className="divide-y">
            {data.proposals.map(p => (
              <li key={p.id} className="py-2">
                <div className="font-medium">{p.profile.displayName} @{p.profile.handle}</div>
                <div className="text-sm">{p.message}</div>
                <div className="text-sm text-gray-600">Price: {p.price ?? '—'} {data.currency} · {p.status}</div>
                {iAmOwner && p.status === 'submitted' && (
                  <div className="flex gap-2 mt-2">
                    <button className="px-3 py-1 border rounded" onClick={()=> setStatus.mutate({ proposalId: p.id, status: 'accepted' })}>Accept</button>
                    <button className="px-3 py-1 border rounded" onClick={()=> setStatus.mutate({ proposalId: p.id, status: 'declined' })}>Decline</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {!iAmOwner && (
          <div className="border rounded p-3 space-y-2">
            <div className="font-medium">Submit a proposal</div>
            <textarea className="w-full border rounded px-3 py-2 h-32" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Pitch your approach…" />
            <input className="w-full border rounded px-3 py-2" placeholder="Price (optional, CAD)" value={price} onChange={e=>setPrice(e.target.value ? Number(e.target.value) : '')} />
            <button className="px-3 py-2 border rounded" disabled={submit.isPending}
              onClick={()=> submit.mutate({ briefId: id, message, price: price === '' ? undefined : price })}
            >{submit.isPending ? 'Submitting…' : 'Submit proposal'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
