'use client'
import { useEffect, useState } from 'react'
import Button from '../../components/ui/Button'
import { api } from '@/app/providers'

export default function SharePostButton({ postId }: { postId: string }){
  const [open, setOpen] = useState(false)
  const following = api.follow.listFollowing.useQuery(undefined, { enabled: open })
  const share = api.messages.sharePost.useMutation()

  const [selected, setSelected] = useState<Record<string, boolean>>({})

  useEffect(() => { if (!open) setSelected({}) }, [open])

  async function doShare(){
    const ids = Object.keys(selected).filter(id => selected[id])
    if (!ids.length) return
    await share.mutateAsync({ postId, targetProfileIds: ids })
    setOpen(false)
  }

  if (!open) {
    return <Button variant="outline" onClick={()=> setOpen(true)}>Share</Button>
  }

  return (
    <div className="absolute mt-10 right-0 z-50">
      <div className="card p-3 w-72">
        <div className="font-medium mb-2">Share with…</div>
        <div className="max-h-60 overflow-auto space-y-1">
          {(following.data ?? []).map(p => (
            <label key={p.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!selected[p.id]} onChange={e=>{
                const v = e.target.checked
                setSelected(s => ({ ...s, [p.id]: v }))
              }} />
              <span>{p.displayName} <span className="text-gray-500">@{p.handle}</span></span>
            </label>
          ))}
          {following.isLoading && <div className="text-sm text-gray-500">Loading…</div>}
          {!following.isLoading && !following.data?.length && <div className="text-sm text-gray-500">You’re not following anyone yet.</div>}
        </div>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" onClick={()=> setOpen(false)}>Cancel</Button>
          <Button onClick={doShare} disabled={share.isPending}>Send</Button>
        </div>
      </div>
    </div>
  )
}
