'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/app/providers'
import { useState } from 'react'

export default function Client({ id }: { id: string }) {
  const router = useRouter()
  const q = api.dashboard.byId.useQuery({ id })
  const updCover = api.dashboard.updateCover.useMutation({
    onSuccess: () => q.refetch()
  })
  const createProject = api.projects.create.useMutation({
    onSuccess: (res) => router.push(`/projects/${res.id}`)
  })
  const [busy, setBusy] = useState(false)
  const d = q.data

  async function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !d) return
    setBusy(true)
    try {
      const res = await fetch('/api/storage/signed-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: f.name, contentType: f.type, folder: 'dashboards' }),
      })
      if (!res.ok) throw new Error('Failed to get upload URL')
      const data = await res.json() as any
      if (data.uploadUrl) {
        const put = await fetch(data.uploadUrl, { method: 'PUT', body: f, headers: { 'Content-Type': f.type } })
        if (!put.ok) throw new Error('Failed to upload cover')
        const publicUrl = data.publicUrl || data.cdnUrl || data.viewUrl || data.uploadUrl.split('?')[0]
        await updCover.mutateAsync({ id: d.id, coverUrl: publicUrl })
      } else if (data.publicUrl) {
        await updCover.mutateAsync({ id: d.id, coverUrl: data.publicUrl })
      } else {
        throw new Error('Unexpected upload response')
      }
    } catch (err) {
      alert((err as any)?.message || 'Failed to update cover')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  if (!d) return <div>Loading…</div>

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Cover header */}
      <div className="rounded-2xl overflow-hidden shadow">
        <div className="relative aspect-[21/9] bg-neutral-100">
          {d.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : null}
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between">
            <div className="rounded-xl px-3 py-2 bg-white/85 backdrop-blur shadow">
              <div className="text-lg font-semibold">{d.name}</div>
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg bg-black text-white px-3 py-2 text-sm cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={onPickCover} disabled={busy} />
              {busy ? 'Uploading…' : 'Change cover'}
            </label>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Crew section */}
        <section className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold">Crew</h2>
          <p className="text-sm text-neutral-600 mt-1">
            Manage your team. Add, edit, and assign crew members for your callsheets.
          </p>
          <div className="mt-3 flex gap-2">
            {/* If you have a dedicated crew route, replace the href below */}
            <Link href="/projects" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50">
              Go to crew
            </Link>
          </div>
        </section>

        {/* Callsheets section */}
        <section className="rounded-2xl border p-4 bg-white">
          <h2 className="font-semibold">Callsheets</h2>
          <p className="text-sm text-neutral-600 mt-1">
            Create a new callsheet or view all existing callsheets.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-black text-white px-3 py-1.5 text-sm disabled:opacity-50"
              onClick={() => createProject.mutate({ name: 'Untitled Callsheet' })}
              disabled={createProject.isPending}
            >
              {createProject.isPending ? 'Creating…' : 'Create new callsheet'}
            </button>
            <Link href="/projects" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-neutral-50">
              View all callsheets
            </Link>
          </div>

          {/* Show linked callsheets (if any) */}
          {d.callsheets.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Linked</div>
              <ul className="space-y-1">
                {d.callsheets.map(cs => (
                  <li key={cs.project.id} className="text-sm">
                    <Link href={`/projects/${cs.project.id}`} className="hover:underline">
                      {cs.project.name || cs.project.id}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}