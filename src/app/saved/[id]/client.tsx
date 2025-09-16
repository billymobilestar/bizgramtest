'use client'
import { api } from '@/app/providers'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import PostCard from '@/components/PostCard'

export default function Client({ id }: { id: string }){
  const { data, isLoading, error, refetch } = api.saved.getList.useQuery({ id })
  const rename = api.saved.renameList.useMutation({ onSuccess: ()=> refetch() })
  const del = api.saved.deleteList.useMutation({ onSuccess: ()=> { window.location.href = '/saved' } })

  const bulkSend = api.messages.bulkSendToProfiles.useMutation()

  const [newName, setNewName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [msg, setMsg] = useState('Hey {{name}}, ')

  const isPeople = data?.kind === 'PEOPLE'
  const peopleItems = useMemo(
    () => (data?.items ?? []).filter(i => i.type === 'profile' && i.profile).map(i => i.profile!),
    [data?.items]
  )
  const postItems = useMemo(
    () => (data?.items ?? []).filter(i => i.type === 'post' && i.post).map(i => i.post!),
    [data?.items]
  )

  const toggle = (pid: string) =>
    setSelected(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid])
  const allSelected = isPeople && selected.length === peopleItems.length && peopleItems.length > 0

  const toggleAll = () => {
    if (!isPeople) return
    setSelected(allSelected ? [] : peopleItems.map(p => p.id))
  }

  const doBulkSend = () => {
    const clean = msg.trim()
    if (!isPeople || !clean || !selected.length || bulkSend.isPending) return
    bulkSend.mutate(
      { profileIds: selected, text: clean },
      {
        onSuccess: (res) => {
          alert(`Sent to ${res.count} recipient${res.count === 1 ? '' : 's'}.`)
          setSelected([])
          setMsg('Hey {{name}}, ')
        },
      }
    )
  }

  if (isLoading) return <p>Loading…</p>
  if (error || !data) return <p className="text-red-600">Error</p>

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <div className="text-sm text-gray-600">
            {data.items.length} item{data.items.length === 1 ? '' : 's'} &middot; {data.kind}
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e=>setNewName(e.target.value)}
            placeholder="Rename list"
            className="border rounded px-3 py-2"
          />
          <button
            className="px-3 py-2 border rounded"
            onClick={()=>{
              if (!newName.trim()) return
              rename.mutate({ id, name: newName.trim() })
              setNewName('')
            }}
          >
            Rename
          </button>
          <button
            className="px-3 py-2 border rounded"
            onClick={()=> {
              if (confirm('Delete this list? Items inside will be removed.')) del.mutate({ id })
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Composer (only for PEOPLE) */}
      {isPeople && (
        <div className="sticky top-0 z-10 bg-white border rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium">
              Bulk message selected ({selected.length})
            </div>
            <button
              className="text-sm underline disabled:opacity-50"
              onClick={toggleAll}
              disabled={peopleItems.length === 0}
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <textarea
            value={msg}
            onChange={e=>setMsg(e.target.value)}
            rows={2}
            className="w-full border rounded px-3 py-2"
            placeholder="Write your message… (use {{name}}, {firstName}, {displayName}, {handle})"
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
          Tokens: <code>{'{{name}}'}</code>, <code>{'{firstName}'}</code>, <code>{'{displayName}'}</code>, <code>{'{handle}'}</code>
            </div>
            <button
              onClick={doBulkSend}
              disabled={!selected.length || !msg.trim() || bulkSend.isPending}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {bulkSend.isPending ? 'Sending…' : 'Send to selected'}
            </button>
          </div>
        </div>
      )}

      {/* Items */}
      {!data.items.length && <p>No items yet.</p>}

      {/* POSTS list: show your grid */}
      {data.kind === 'POSTS' && (
        <div className="grid md:grid-cols-3 gap-4">
          {postItems.map(p => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}

      {/* PEOPLE list: selectable rows */}
      {data.kind === 'PEOPLE' && (
        <ul className="divide-y border rounded">
          {peopleItems.map(pr => (
            <li key={pr.id} className="p-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-3 flex-1">
                <input
                  type="checkbox"
                  checked={selected.includes(pr.id)}
                  onChange={() => toggle(pr.id)}
                />
                <div>
                  <div className="font-medium">
                    {pr.displayName} <span className="text-gray-500">@{pr.handle}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {pr.profession} — {[pr.city, pr.region].filter(Boolean).join(', ')}
                  </div>
                </div>
              </label>
              <Link href={`/u/${pr.handle}`} className="text-sm underline">View</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
