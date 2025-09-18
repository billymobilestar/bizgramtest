'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/app/providers'

export default function NewDashboardPage() {
  const router = useRouter()
  const create = api.dashboard.create.useMutation({
    onSuccess: (d) => router.push(`/dashboards/${d.id}`),
  })

  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadCover(f: File): Promise<string> {
    const res = await fetch('/api/storage/signed-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: f.name, contentType: f.type, folder: 'dashboards' }),
    })
    if (!res.ok) throw new Error('Failed to get upload URL')
    const data = (await res.json()) as any

    // Case 1: S3/R2 style pre-signed PUT (old flow)
    if (data.uploadUrl) {
      const put = await fetch(data.uploadUrl, { method: 'PUT', body: f, headers: { 'Content-Type': f.type } })
      if (!put.ok) throw new Error('Failed to upload cover')
      return data.publicUrl || data.cdnUrl || data.viewUrl || data.uploadUrl.split('?')[0]
    }

    // Case 2: Supabase signed upload (new flow) — requires NEXT_PUBLIC SUPABASE env
    if (data.provider === 'supabase' && data.token && data.objectPath) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
      const { createClient } = await import('@supabase/supabase-js')
      const client = createClient(url as string, key as string)
      const up = await client.storage.from(data.bucket).uploadToSignedUrl(data.objectPath, data.token, f, {
        contentType: f.type,
        upsert: true,
      })
      if (up.error) throw up.error
      return data.publicUrl as string
    }

    throw new Error('Unexpected upload response shape')
  }

  async function onSubmit() {
    setError(null)
    setBusy(true)
    try {
      let coverUrl: string | undefined = undefined
      if (file) {
        coverUrl = await uploadCover(file)
      }
      await create.mutateAsync({ name: name.trim() || 'Untitled dashboard', coverUrl })
    } catch (e: any) {
      setError(e?.message || 'Failed to create dashboard')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-lg font-semibold">Create dashboard</h1>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Name</label>
          <input
            className="border rounded-lg px-3 py-2 w-full"
            placeholder="e.g. Fall Campaign"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Cover photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex gap-2">
          <button
            onClick={onSubmit}
            disabled={busy}
            className="rounded-lg bg-black text-white px-3 py-2 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}