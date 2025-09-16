// src/components/ReportButton.tsx
'use client'
import { api } from '@/app/providers'
import { useState } from 'react'

export default function ReportButton({ targetType, targetId, className }:{
  targetType: 'post' | 'profile',
  targetId: string,
  className?: string,
}){
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const report = api.mod.report.useMutation({
    onSuccess: ()=> { setOpen(false); setReason(''); alert('Thanks for your report.') }
  })
  if (!open) {
    return <button className={className ?? 'px-2 py-1 text-xs border rounded'} onClick={()=>setOpen(true)}>Report</button>
  }
  return (
    <div className="border rounded p-2 space-y-2">
      <textarea value={reason} onChange={e=>setReason(e.target.value)} className="w-full border rounded px-2 py-1" placeholder="What’s wrong?" />
      <div className="flex gap-2">
        <button className="px-2 py-1 border rounded" onClick={()=>setOpen(false)}>Cancel</button>
        <button
  type="button"
  onClick={(e) => { e.stopPropagation(); /* report logic */ }}
  className="px-2 py-1 border rounded text-sm"
>
  Report
</button>
      </div>
    </div>
  )
}
