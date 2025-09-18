'use client'
import Link from 'next/link'
import { api } from '@/app/providers'

export default function Client() {
  const { data } = api.dashboard.listMine.useQuery()
  const items = data ?? []

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboards</h1>
          <p className="mt-1 text-sm text-neutral-600">
            A dashboard is the home for a production or campaign. Add a cover photo, invite crew, and create callsheets.
          </p>
        </div>
        <Link
          href="/dashboards/new"
          className="rounded-lg bg-black text-white px-3 py-2 text-sm whitespace-nowrap"
        >
          New dashboard
        </Link>
      </div>

      <div className="rounded-xl border bg-white p-4 text-sm text-neutral-700">
        <div className="font-medium">Getting started</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-neutral-500">
          <li>Create a dashboard for each project or shoot.</li>
          <li>Click a card to open it, then upload a cover and manage crew.</li>
          <li>Use <span className="font-medium">Callsheets</span> inside a dashboard to create or view shoot-day plans.</li>
        </ul>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((d) => (
          <li
            key={d.id}
            className="relative rounded-2xl bg-white overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.10)] transition"
          >
            <Link href={`/dashboards/${d.id}`} className="group block">
              <div className="relative aspect-[4/3] bg-neutral-100">
                {d.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 to-neutral-200" />
                )}
                <div className="absolute inset-x-3 bottom-3">
                  <div className="flex items-center justify-between rounded-2xl px-3 py-2 backdrop-blur bg-white/85 shadow">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 truncate">{d.name}</div>
                    </div>
                    <span className="ml-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium bg-blue-600 text-white">
                      Open
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}