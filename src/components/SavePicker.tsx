'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/app/providers'

type Kind = 'POSTS' | 'PEOPLE'

export default function SavePicker({
  open,
  kind,
  target,                 // { postId?: string; profileId?: string }
  onClose,
  onDone,
}: {
  open: boolean
  kind: Kind
  target: { postId?: string; profileId?: string }
  onClose: () => void
  onDone?: () => void
}) {
  const utils = api.useUtils()
  const listsQ = api.saved.myLists.useQuery({ kind }, { enabled: open })
  const membershipQ = api.saved.membershipForTarget.useQuery(
    target.postId ? { postId: target.postId } : { profileId: target.profileId! },
    { enabled: open && (!!target.postId || !!target.profileId) }
  )

  const createList = api.saved.createList.useMutation({
    onSuccess: () => utils.saved.myLists.invalidate({ kind }).catch(() => {}),
  })

  const addToLists = api.saved.addToLists.useMutation({
    onSuccess: async () => {
      // refresh membership so checkboxes reflect reality if you reopen
      await utils.saved.membershipForTarget.invalidate(
        target.postId ? { postId: target.postId } : { profileId: target.profileId! }
      )
      onDone?.()
      onClose()
    },
  })

  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const selectedIds = useMemo(
    () => Object.keys(selected).filter(id => selected[id]),
    [selected]
  )

  useEffect(() => {
    if (!membershipQ.data) return
    const pre: Record<string, boolean> = {}
    membershipQ.data.listIds.forEach(id => { pre[id] = true })
    setSelected(pre)
  }, [membershipQ.data])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Save to {kind === 'POSTS' ? 'Posts' : 'People'} list(s)</div>
          <button onClick={onClose} className="text-sm text-gray-500">Close</button>
        </div>

        {/* lists */}
        <div className="max-h-64 overflow-auto space-y-1 border rounded p-2">
          {listsQ.isLoading && <div className="text-sm text-gray-500">Loading lists…</div>}
          {!listsQ.isLoading && !listsQ.data?.length && (
            <div className="text-sm text-gray-500">
              No {kind === 'POSTS' ? 'Posts' : 'People'} lists yet. Create one below.
            </div>
          )}
          {(listsQ.data ?? []).map(l => (
            <label key={l.id} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-gray-50">
              <input
                type="checkbox"
                checked={!!selected[l.id]}
                onChange={e => {
                  const v = e.currentTarget.checked
                  setSelected(s => ({ ...s, [l.id]: v }))
                }}
              />
              <span className="flex-1 truncate">{l.name}</span>
              <span className="text-gray-500 text-xs">{l.count}</span>
            </label>
          ))}
        </div>

        {/* new list */}
        <CreateInline
          kind={kind}
          onCreate={async (name) => {
            if (!name.trim()) return
            const made = await createList.mutateAsync({ name: name.trim(), kind })
            setSelected(s => ({ ...s, [made.id]: true }))
          }}
          busy={createList.isPending}
        />

        <div className="mt-3 flex gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
          <button
            onClick={() => {
              if (!selectedIds.length) return
              addToLists.mutate({
                listIds: selectedIds,
                ...(target.postId ? { postId: target.postId } : { profileId: target.profileId })
              })
            }}
            disabled={!selectedIds.length || addToLists.isPending}
            className="px-3 py-2 rounded border bg-black text-white disabled:opacity-50"
          >
            {addToLists.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateInline({
  kind, onCreate, busy,
}: { kind: 'POSTS'|'PEOPLE'; onCreate: (name: string)=>void|Promise<void>; busy?: boolean }) {
  const [name, setName] = useState('')
  return (
    <div className="mt-3">
      <div className="text-sm font-medium mb-1">Create a new {kind === 'POSTS' ? 'Posts' : 'People'} list</div>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.currentTarget.value)}
          placeholder={kind === 'POSTS' ? 'e.g. Moodboard' : 'e.g. Directors'}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={() => onCreate(name)}
          disabled={!name.trim() || busy}
          className="px-3 py-2 rounded border disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  )
}
