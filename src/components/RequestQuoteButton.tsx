'use client'
import { useState } from 'react'
import { api } from '@/app/providers'
import { useRouter } from 'next/navigation'

export default function RequestQuoteButton({ handle }: { handle: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budgetMin, setBudgetMin] = useState<number | ''>('')
  const [budgetMax, setBudgetMax] = useState<number | ''>('')

  const create = api.brief.create.useMutation()
  const invite = api.brief.inviteByHandle.useMutation()

  async function submit() {
    if (!title.trim() || !description.trim()) return
    const brief = await create.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      budgetMin: budgetMin === '' ? undefined : budgetMin,
      budgetMax: budgetMax === '' ? undefined : budgetMax,
      currency: 'CAD',
    })
    await invite.mutateAsync({ briefId: brief.id, handle })
    router.push(`/briefs/${brief.id}`)
  }

  if (!open) {
    return <button className="px-2 py-1 border rounded text-sm" onClick={()=> setOpen(true)}>Request quote</button>
  }

  return (
    <div className="border rounded p-3 space-y-2 bg-white shadow relative z-10">
      <div className="font-medium">Request a quote from @{handle}</div>
      <input className="w-full border rounded px-3 py-2" placeholder="Title"
        value={title} onChange={e=>setTitle(e.target.value)} />
      <textarea className="w-full border rounded px-3 py-2 h-24" placeholder="Brief description"
        value={description} onChange={e=>setDescription(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className="border rounded px-3 py-2" placeholder="Budget min (CAD)"
          value={budgetMin} onChange={e=>setBudgetMin(e.target.value ? Number(e.target.value) : '')} />
        <input className="border rounded px-3 py-2" placeholder="Budget max (CAD)"
          value={budgetMax} onChange={e=>setBudgetMax(e.target.value ? Number(e.target.value) : '')} />
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-2 border rounded" onClick={()=> setOpen(false)}>Cancel</button>
        <button className="px-3 py-2 border rounded" disabled={create.isPending || invite.isPending || !title.trim() || !description.trim()} onClick={submit}>
          {create.isPending || invite.isPending ? 'Creating…' : 'Create & invite'}
        </button>
      </div>
    </div>
  )
}
