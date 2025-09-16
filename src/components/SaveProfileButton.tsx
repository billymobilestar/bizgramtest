'use client'
import { useEffect, useMemo, useState } from 'react'
import { api } from '@/app/providers'

export default function SaveProfileButton({ profileId }: { profileId: string }) {
  const [open, setOpen] = useState(false)

  // Lists of kind PEOPLE
  const listsQ = api.saved.myLists.useQuery({ kind: 'PEOPLE' }, { enabled: open, placeholderData: p => p })
  // Which lists already contain this profile
  const membershipQ = api.saved.membershipForTarget.useQuery({ profileId }, { enabled: open && !!profileId, placeholderData: p => p })

  const add = api.saved.addToLists.useMutation({
    onSuccess: () => api.useUtils().saved.myLists.invalidate().catch(() => {}),
  })
  const create = api.saved.createList.useMutation({
    onSuccess: () => listsQ.refetch().catch(() => {}),
  })

  const [selected, setSelected] = useState<Record<string, boolean>>({})
  useEffect(() => {
    if (open && membershipQ.data) {
      const map: Record<string, boolean> = {}
      for (const id of membershipQ.data.listIds) map[id] = true
      setSelected(map)
    }
  }, [open, membershipQ.data])

  const chosenIds = useMemo(() => Object.keys(selected).filter(id => selected[id]), [selected])

  async function onSave() {
    if (!chosenIds.length || add.isPending) return
    await add.mutateAsync({ listIds: chosenIds, profileId })
    setOpen(false)
  }

  async function onCreate(name: string) {
    const n = name.trim()
    if (!n || create.isPending) return
    const res = await create.mutateAsync({ name: n, kind: 'PEOPLE' })
    setSelected(s => ({ ...s, [res.id]: true }))
  }

  return (
    <div className="relative inline-block">
      <button className="px-2 py-1 border rounded text-sm" onClick={() => setOpen(v => !v)}>
        Save
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 w-72 rounded-xl border bg-white shadow-lg p-3">
          <div className="font-medium mb-2">Save to…</div>

          {listsQ.isLoading && <div className="text-sm text-gray-500">Loading lists…</div>}

          {!!listsQ.data?.length && (
            <div className="max-h-56 overflow-auto space-y-1">
              {listsQ.data.map(l => (
                <label key={l.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!selected[l.id]}
                    onChange={e => setSelected(s => ({ ...s, [l.id]: e.target.checked }))}
                  />
                  <span>{l.name} <span className="text-gray-500">({l.count})</span></span>
                </label>
              ))}
            </div>
          )}

          {!listsQ.isLoading && !listsQ.data?.length && (
            <div className="text-sm text-gray-500">No “People” lists yet. Create one below.</div>
          )}

          <NewListRow creating={create.isPending} onCreate={onCreate} />

          <div className="flex gap-2 mt-3">
            <button className="px-3 py-1.5 rounded border" onClick={() => setOpen(false)}>Cancel</button>
            <button
              className="px-3 py-1.5 rounded border bg-black text-white disabled:opacity-50"
              onClick={onSave}
              disabled={!chosenIds.length || add.isPending}
            >
              {add.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function NewListRow({ onCreate, creating }: { onCreate: (name: string) => void; creating: boolean }) {
  const [name, setName] = useState('')
  return (
    <form
      onSubmit={e => { e.preventDefault(); onCreate(name); setName('') }}
      className="mt-3 flex items-center gap-2"
    >
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="New list name"
        className="flex-1 border rounded px-2 py-1 text-sm"
      />
      <button type="submit" className="px-2 py-1 border rounded text-sm" disabled={!name.trim() || creating}>
        {creating ? '…' : 'Add'}
      </button>
    </form>
  )
}
