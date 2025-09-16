'use client'
import { api } from '@/app/providers'
import { useState, useEffect } from 'react'

export default function Page(){
  const { data } = api.notification.getPrefs.useQuery()
  const setPrefsMut = api.notification.setPrefs.useMutation()
  const [form, setForm] = useState({ emailEnabled: true, digest: 'off', quietStart: '', quietEnd: '' })

  useEffect(()=>{ if (data) setForm({
    emailEnabled: data.emailEnabled ?? true,
    digest: (data.digest as any) ?? 'off',
    quietStart: data.quietStart ?? '',
    quietEnd: data.quietEnd ?? '',
  }) }, [data])

  const on = (k: keyof typeof form, v: any) => setForm(s => ({ ...s, [k]: v }))

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Notification Preferences</h1>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.emailEnabled} onChange={e=>on('emailEnabled', e.target.checked)} />
        <span>Email notifications</span>
      </label>
      <label className="block">
        <div className="text-sm">Digest</div>
        <select className="border rounded px-3 py-2" value={form.digest} onChange={e=>on('digest', e.target.value)}>
          <option value="off">Off</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <div className="text-sm">Quiet start (HH:MM)</div>
          <input className="border rounded px-3 py-2 w-full" value={form.quietStart} onChange={e=>on('quietStart', e.target.value)} placeholder="22:00" />
        </label>
        <label className="block">
          <div className="text-sm">Quiet end (HH:MM)</div>
          <input className="border rounded px-3 py-2 w-full" value={form.quietEnd} onChange={e=>on('quietEnd', e.target.value)} placeholder="07:00" />
        </label>
      </div>
      <button className="px-4 py-2 border rounded" disabled={setPrefsMut.isPending}
        onClick={()=>setPrefsMut.mutate(form as any)}
      >
        {setPrefsMut.isPending ? 'Saving…' : 'Save'}
      </button>
    </main>
  )
}