// src/app/projects/[id]/client.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/app/providers'

type Tab = 'details' | 'crew'
type AnyObject = Record<string, any>

/* ---------------------- immutability + binding helpers --------------------- */

function clone<T>(v: T): T {
  try {
    // @ts-ignore - available in modern runtimes
    return structuredClone(v)
  } catch {
    return JSON.parse(JSON.stringify(v))
  }
}

function getDeep<T = any>(obj: AnyObject | undefined, path: string, fallback: T): T {
  if (!obj) return fallback
  try {
    return path.split('.').reduce<any>((a, k) => (a ?? {})[k], obj) ?? fallback
  } catch {
    return fallback
  }
}

function setDeepImmutable(obj: AnyObject | undefined, path: string, value: any) {
  const next = clone(obj ?? {})
  const keys = path.split('.')
  let cur: AnyObject = next
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    const nextKey = keys[i + 1]
    if (cur[k] == null) cur[k] = /^\d+$/.test(nextKey) ? [] : {}
    cur = cur[k]
  }
  cur[keys[keys.length - 1]] = value
  return next
}

function useBindDetails(
  meta: { details: AnyObject },
  setMeta: React.Dispatch<React.SetStateAction<any>>,
  markDirty: () => void
) {
  return (path: string) => ({
    value: String(getDeep(meta.details, path, '')),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setMeta((m: any) => {
        markDirty()
        return { ...m, details: setDeepImmutable(m.details, path, e.target.value) }
      }),
  })
}

/* --------------------------------- page ----------------------------------- */

export default function Client({ id }: { id: string }) {
  const q = api.projects.get.useQuery(
    { id },
    {
      placeholderData: (p) => p,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 0,
      staleTime: Infinity, // keep stable while editing
    }
  )
  const utils = api.useUtils()

  const update = api.projects.updateMeta.useMutation({
    onSuccess: () => {
      // Update cache in place (avoid invalidation that can stomp local state)
      utils.projects.get.setData({ id }, (prev: any) =>
        prev
          ? {
              ...prev,
              name: meta.name.trim() || prev.name,
              shootDate: meta.shootDate || null,
              crewCall: meta.crewCall || null,
              shootCall: meta.shootCall || null,
              details: clone(meta.details),
            }
          : prev
      )
    },
    onError: (e) => alert(`Save failed: ${String((e as any)?.message || e)}`),
  })
  const addManual = api.projects.addManualMember.useMutation({
    onSuccess: () => utils.projects.get.invalidate({ id }),
    onError: (e) => alert(`Add failed: ${String((e as any)?.message || e)}`),
  })
  const addMembers = api.projects.addMembers.useMutation({
    onSuccess: () => utils.projects.get.invalidate({ id }),
    onError: (e) => alert(`Add failed: ${String((e as any)?.message || e)}`),
  })
  const delProject = api.projects.delete.useMutation({
    onSuccess: () => (window.location.href = '/projects'),
  })
  const updateMember = api.projects.updateMember.useMutation({
    onSuccess: () => utils.projects.get.invalidate({ id }),
  })

  const [tab, setTab] = useState<Tab>('details')

  // Local form state (single source of truth while editing)
  const [meta, setMeta] = useState({
    name: '',
    shootDate: '',
    crewCall: '',
    shootCall: '',
    details: {} as AnyObject,
  })
  const [dirty, setDirty] = useState(false)
  const hydratedForIdRef = useRef<string | null>(null)

  // hydrate exactly once per project id; never reseed after the user types
  useEffect(() => {
    if (!q.data) return
    if (!dirty && hydratedForIdRef.current !== q.data.id) {
      setMeta({
        name: q.data.name,
        shootDate: q.data.shootDate ? new Date(q.data.shootDate).toISOString() : '',
        crewCall: q.data.crewCall ? new Date(q.data.crewCall).toISOString() : '',
        shootCall: q.data.shootCall ? new Date(q.data.shootCall).toISOString() : '',
        details: clone((q.data.details ?? {}) as AnyObject),
      })
      hydratedForIdRef.current = q.data.id
    }
  }, [q.data, dirty])

  // lists → pick profiles to add
  const lists = api.saved.myLists.useQuery({ kind: 'PEOPLE' })
  const [pickListId, setPickListId] = useState('')
  const pplInList = api.saved.getList.useQuery(pickListId ? { id: pickListId } : (undefined as any), {
    enabled: !!pickListId,
  })
  const selectedProfiles = useMemo(
    () =>
      (pplInList.data?.items ?? [])
        .filter((i: any) => i.type === 'profile' && i.profile)
        .map((i: any) => i.profile!.id),
    [pplInList.data]
  )

  if (q.isLoading) return <p>Loading…</p>
  if (q.error) return <p className="text-red-600">{String((q.error as any)?.message || 'Error')}</p>
  if (!q.data) return <p className="text-red-600">Project not found.</p>

  const members = q.data.members ?? []
  const bind = useBindDetails(meta, setMeta, () => setDirty(true))

  const saveAll = () =>
    update.mutate({
      id,
      name: meta.name.trim() || q.data!.name,
      shootDate: meta.shootDate || null,
      crewCall: meta.crewCall || null,
      shootCall: meta.shootCall || null,
      details: meta.details,
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{q.data.name}</h1>
        <div className="flex items-center gap-2">
          {/* ✅ Print Preview page (restored) */}
          <a
            className="px-3 py-1 rounded border"
            href={`/projects/${id}/callsheet/print`}
            target="_blank"
            rel="noreferrer"
          >
            Preview / Print call sheet
          </a>
          {/* PDF link (kept) */}
          <a
            className="px-3 py-1 rounded border"
            href={`/api/projects/${id}/callsheet`}
            target="_blank"
            rel="noreferrer"
          >
            Open call sheet PDF
          </a>
          <button
            className="px-3 py-1 rounded border text-red-600"
            onClick={() => {
              if (confirm('Delete this project?')) delProject.mutate({ id })
            }}
            disabled={delProject.isPending}
          >
            {delProject.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <button
          className={`px-3 py-1 rounded border ${tab === 'details' ? 'bg-black text-white' : ''}`}
          onClick={() => setTab('details')}
        >
          Details
        </button>
        <button
          className={`px-3 py-1 rounded border ${tab === 'crew' ? 'bg-black text-white' : ''}`}
          onClick={() => setTab('crew')}
        >
          Crew
        </button>
      </div>

      {/* ================================ DETAILS ================================ */}
      {tab === 'details' && (
        <div className="space-y-8">
          {/* S1: Header */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">S1 — Header</h2>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Left block */}
              <div className="space-y-3">
                <label className="block">
                  <div className="text-sm">Company</div>
                  <input className="border rounded px-3 py-2 w-full" {...bind('company.name')} />
                </label>

                <label className="block">
                  <div className="text-sm">Production office address</div>
                  <textarea className="border rounded px-3 py-2 w-full" rows={2} {...bind('office.address')} />
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <label className="block">
                    <div className="text-sm">Email</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('office.email')} />
                  </label>
                  <label className="block">
                    <div className="text-sm">Payroll</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('office.payrollEmail')} />
                  </label>
                  <label className="block">
                    <div className="text-sm">AP</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('office.apEmail')} />
                  </label>
                </div>

                <label className="block">
                  <div className="text-sm">Exec Producers (comma-sep)</div>
                  <input className="border rounded px-3 py-2 w-full" {...bind('crew.execProducersCsv')} />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <div className="text-sm">Producer</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('crew.producer')} />
                  </label>
                  <label className="block">
                    <div className="text-sm">Director</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('crew.director')} />
                  </label>
                </div>

                <label className="block">
                  <div className="text-sm">Writers (comma-sep)</div>
                  <input className="border rounded px-3 py-2 w-full" {...bind('crew.writersCsv')} />
                </label>
              </div>

              {/* Middle block */}
              <div className="space-y-3">
                <label className="block">
                  <div className="text-sm">Title (shown big)</div>
                  <input
                    className="border rounded px-3 py-2 w-full"
                    value={meta.name}
                    onChange={(e) => {
                      setDirty(true)
                      setMeta((m) => ({ ...m, name: e.target.value }))
                    }}
                  />
                </label>
                <div className="grid gap-2">
                  <div className="text-sm">Advisories / Bulletins (3)</div>
                  <input className="border rounded px-3 py-2 w-full" {...bind('header.advisories.0')} />
                  <input className="border rounded px-3 py-2 w-full" {...bind('header.advisories.1')} />
                  <input className="border rounded px-3 py-2 w-full" {...bind('header.advisories.2')} />
                </div>
              </div>

              {/* Right block */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <div className="text-sm">Crew call</div>
                    <input
                      type="datetime-local"
                      className="w-full border rounded px-3 py-2"
                      value={meta.crewCall ? meta.crewCall.slice(0, 16) : ''}
                      onChange={(e) =>
                        setMeta((m) => ({
                          ...m,
                          crewCall: (setDirty(true), e.target.value ? new Date(e.target.value).toISOString() : ''),
                        }))
                      }
                    />
                  </label>
                  <label className="block">
                    <div className="text-sm">Shoot call</div>
                    <input
                      type="datetime-local"
                      className="w-full border rounded px-3 py-2"
                      value={meta.shootCall ? meta.shootCall.slice(0, 16) : ''}
                      onChange={(e) =>
                        setMeta((m) => ({
                          ...m,
                          shootCall: (setDirty(true), e.target.value ? new Date(e.target.value).toISOString() : ''),
                        }))
                      }
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <div className="text-sm">AM Curfew</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('times.amCurfew')} />
                  </label>
                  <label className="block">
                    <div className="text-sm">Tail Lights</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('times.tailLights')} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <div className="text-sm">Sunrise</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('weather.sunrise')} />
                  </label>
                  <label className="block">
                    <div className="text-sm">Sunset</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('weather.sunset')} />
                  </label>
                  <label className="block">
                    <div className="text-sm">High</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('weather.hi')} />
                  </label>
                  <label className="block">
                    <div className="text-sm">Low</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('weather.lo')} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <div className="text-sm">Circus Hot</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('meals.circusHot')} />
                  </label>
                  <label className="block">
                    <div className="text-sm">Breakfast</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('meals.breakfast')} />
                  </label>
                  <label className="block">
                    <div className="text-sm">Lunch</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('meals.lunch')} />
                  </label>
                  <label className="block">
                    <div className="text-sm">Driver Lunch</div>
                    <input className="border rounded px-3 py-2 w-full" {...bind('meals.driverLunch')} />
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* S2: Schedule & Locations */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">S2 — Schedule & Locations</h2>

            <ScheduleEditor
              rows={getDeep(meta.details, 'schedule', [])}
              onChange={(rows) => {
                setDirty(true)
                setMeta((m) => ({ ...m, details: { ...m.details, schedule: rows } }))
              }}
            />

            <div className="grid md:grid-cols-3 gap-3">
              {[
                ['SET', 'locations.set'],
                ['TRUCKS', 'locations.trucks'],
                ['LUNCH', 'locations.lunch'],
                ['CIRCUS', 'locations.circus'],
                ['CREW PARK', 'locations.crewPark'],
                ['BGE', 'locations.bge'],
              ].map(([label, path]) => (
                <label key={path} className="block">
                  <div className="text-sm">{label}</div>
                  <textarea className="border rounded px-3 py-2 w-full" rows={2} {...bind(path)} />
                </label>
              ))}
              <label className="block md:col-span-2">
                <div className="text-sm">NOTES</div>
                <textarea className="border rounded px-3 py-2 w-full" rows={3} {...bind('locations.notes')} />
              </label>
              <label className="block">
                <div className="text-sm">TOTAL PAGES</div>
                <input className="border rounded px-3 py-2 w-full" {...bind('scheduleTotalPages')} />
              </label>
            </div>
          </section>

          {/* S3: Cast */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">S3 — Cast</h2>
            <CastEditor
              rows={getDeep(meta.details, 'cast', [])}
              onChange={(rows) => {
                setDirty(true)
                setMeta((m) => ({ ...m, details: { ...m.details, cast: rows } }))
              }}
            />
          </section>

          {/* S4: Atmosphere & notes */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">S4 — Atmosphere & Stand-ins</h2>
            <AtmosEditor
              rows={getDeep(meta.details, 'atmosphere', [])}
              onChange={(rows) => {
                setDirty(true)
                setMeta((m) => ({ ...m, details: { ...m.details, atmosphere: rows } }))
              }}
            />
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block">
                <div className="text-sm">NOTES</div>
                <textarea className="border rounded px-3 py-2 w-full" rows={4} {...bind('notes')} />
              </label>
              <label className="block">
                <div className="text-sm">CURRENT PAPERWORK</div>
                <textarea className="border rounded px-3 py-2 w-full" rows={4} {...bind('paperwork')} />
              </label>
            </div>
          </section>

          {/* S5: Advanced (next day) */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">S5 — Advanced Shooting Schedule (next day)</h2>

            <ScheduleEditor
              rows={getDeep(meta.details, 'advancedSchedule', [])}
              onChange={(rows) => {
                setDirty(true)
                setMeta((m) => ({ ...m, details: { ...m.details, advancedSchedule: rows } }))
              }}
            />

            <div className="grid md:grid-cols-3 gap-3">
              {[
                ['SET', 'advancedLocations.set'],
                ['TRUCKS', 'advancedLocations.trucks'],
                ['LUNCH', 'advancedLocations.lunch'],
                ['CIRCUS', 'advancedLocations.circus'],
                ['CREW PARK', 'advancedLocations.crewPark'],
                ['BGE', 'advancedLocations.bge'],
              ].map(([label, path]) => (
                <label key={path} className="block">
                  <div className="text-sm">{label}</div>
                  <textarea className="border rounded px-3 py-2 w-full" rows={2} {...bind(path)} />
                </label>
              ))}
              <label className="block md:col-span-2">
                <div className="text-sm">NOTES</div>
                <textarea className="border rounded px-3 py-2 w-full" rows={3} {...bind('advancedLocations.notes')} />
              </label>
              <label className="block">
                <div className="text-sm">TOTAL PAGES</div>
                <input className="border rounded px-3 py-2 w-full" {...bind('advancedScheduleTotalPages')} />
              </label>
            </div>
          </section>

          {/* S6: Contacts & Safety */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">S6 — Key Contacts & Safety</h2>
            <ContactsEditor
              value={getDeep(meta.details, 'contacts', {})}
              onChange={(contacts) => {
                setDirty(true)
                setMeta((m) => ({ ...m, details: { ...m.details, contacts } }))
              }}
            />
            <div className="space-y-3">
              <label className="block">
                <div className="text-sm">Nearest Hospital (address & phone)</div>
                <textarea className="border rounded px-3 py-2 w-full" rows={3} {...bind('safety.hospital')} />
              </label>
              <label className="block">
                <div className="text-sm">Emergency Notes</div>
                <textarea className="border rounded px-3 py-2 w-full" rows={3} {...bind('safety.emergencyNotes')} />
              </label>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-sm">DGC Anonymous Hotline</div>
                  <input className="border rounded px-3 py-2 w-full" {...bind('safety.dgcHotline')} />
                </label>
                <label className="block">
                  <div className="text-sm">WorkSafe BC Hotline</div>
                  <input className="border rounded px-3 py-2 w-full" {...bind('safety.worksafeHotline')} />
                </label>
              </div>
              <label className="block">
                <div className="text-sm">First Aid</div>
                <input className="border rounded px-3 py-2 w-full" {...bind('safety.firstAid')} />
              </label>
            </div>
          </section>

          <div>
            <button className="px-4 py-2 rounded bg-black text-white disabled:opacity-50" onClick={saveAll} disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save all details'}
            </button>
          </div>
        </div>
      )}

      {/* ================================ CREW ================================ */}
      {tab === 'crew' && (
        <div className="space-y-6">
          {/* Add from list */}
          <div className="flex items-end gap-2 flex-wrap">
            <label className="block">
              <div className="text-sm">Add from People list</div>
              <select className="border rounded px-3 py-2" value={pickListId} onChange={(e) => setPickListId(e.target.value)}>
                <option value="">Select…</option>
                {(lists.data ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.count})
                  </option>
                ))}
              </select>
            </label>
            <button
              className="px-3 py-2 rounded border"
              disabled={!selectedProfiles.length || addMembers.isPending}
              onClick={() => addMembers.mutate({ id, profileIds: selectedProfiles })}
            >
              {addMembers.isPending ? 'Adding…' : `Add ${selectedProfiles.length} profile(s)`}
            </button>
          </div>

          {/* Manual add */}
          <ManualAdd onAdd={(payload) => addManual.mutate({ id, ...payload })} />

          {/* Current members */}
          <div className="border rounded overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Dept</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2 w-1"></th>
                </tr>
              </thead>
              <tbody>
                {(members || []).map((m: any) => (
                  <MemberRow
                    key={m.id}
                    m={m}
                    onSave={(patch) => updateMember.mutate({ projectId: id, memberId: m.id, patch })}
                    saving={updateMember.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------ subcomponents ------------------------------ */

function ManualAdd({
  onAdd,
}: {
  onAdd: (p: { name: string; email?: string; phone?: string; role?: string; department?: string }) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [dept, setDept] = useState('')

  return (
    <div className="p-3 border rounded space-y-2">
      <div className="font-medium">Add external crew</div>
      <div className="grid md:grid-cols-3 gap-2">
        <input className="border rounded px-3 py-2" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Role (e.g., 1st AD)" value={role} onChange={(e) => setRole(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Department" value={dept} onChange={(e) => setDept(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <button
        className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
        disabled={!name.trim()}
        onClick={() => {
          onAdd({ name: name.trim(), email: email || undefined, phone: phone || undefined, role: role || undefined, department: dept || undefined })
          setName('')
          setEmail('')
          setPhone('')
          setRole('')
          setDept('')
        }}
      >
        Add
      </button>
    </div>
  )
}

function MemberRow({ m, onSave, saving }: { m: any; onSave: (patch: any) => void; saving: boolean }) {
  const name = m.profile?.displayName ?? m.externalName ?? '—'
  const [role, setRole] = useState(m.role ?? m.profile?.profession ?? '')
  const [dept, setDept] = useState(m.department ?? '')
  const [email, setEmail] = useState(m.email ?? '')
  const [phone, setPhone] = useState(m.phone ?? '')
  return (
    <tr className="border-t">
      <td className="px-3 py-2">{name}</td>
      <td className="px-3 py-2">
        <input className="border rounded px-2 py-1 w-40" value={role} onChange={(e) => setRole(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <input className="border rounded px-2 py-1 w-40" value={dept} onChange={(e) => setDept(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <input className="border rounded px-2 py-1 w-56" value={email} onChange={(e) => setEmail(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <input className="border rounded px-2 py-1 w-40" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <button
          className="px-3 py-1 border rounded"
          onClick={() => onSave({ role, department: dept, email: email || null, phone: phone || null })}
          disabled={saving}
        >
          {saving ? '…' : 'Save'}
        </button>
      </td>
    </tr>
  )
}

function ScheduleEditor({ rows, onChange }: { rows: any[]; onChange: (rows: any[]) => void }) {
  const safe = Array.isArray(rows) ? rows : []
  const add = () => onChange([...(safe || []), { scene: '', description: '', cast: '', dayNight: '', pgs: '' }])
  const rm = (i: number) => onChange(safe.filter((_: any, idx: number) => idx !== i))
  const edit = (i: number, key: string, val: string) => {
    const next = safe.slice()
    next[i] = { ...next[i], [key]: val }
    onChange(next)
  }
  return (
    <div className="border rounded overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="px-2 py-2 w-24">Scene</th>
            <th className="px-2 py-2">Set / Description</th>
            <th className="px-2 py-2 w-28">Cast</th>
            <th className="px-2 py-2 w-16">D/N</th>
            <th className="px-2 py-2 w-16">PGS</th>
            <th className="px-2 py-2 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {(safe || []).map((r: any, i: number) => (
            <tr key={i} className="border-t">
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.scene || ''} onChange={(e) => edit(i, 'scene', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.description || ''} onChange={(e) => edit(i, 'description', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.cast || ''} onChange={(e) => edit(i, 'cast', e.target.value)} placeholder="e.g., 3, 7, 12" />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.dayNight || ''} onChange={(e) => edit(i, 'dayNight', e.target.value)} placeholder="D or N" />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.pgs || ''} onChange={(e) => edit(i, 'pgs', e.target.value)} />
              </td>
              <td className="px-2 py-1 text-right">
                <button className="px-2 py-1 border rounded" onClick={() => rm(i)}>
                  Del
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2">
        <button className="px-3 py-1 border rounded" onClick={add}>
          Add row
        </button>
      </div>
    </div>
  )
}

function CastEditor({
  rows,
  onChange,
  labelPrefix,
}: {
  rows: any[]
  onChange: (rows: any[]) => void
  labelPrefix?: string
}) {
  const add = () =>
    onChange([
      ...(rows || []),
      { no: '', cast: '', character: '', status: '', pulv: '', hmu: '', rehblk: '', setTime: '', comments: '' },
    ])
  const rm = (i: number) => onChange(rows.filter((_: any, idx: number) => idx !== i))
  const edit = (i: number, key: string, val: string) => {
    const next = rows.slice()
    next[i] = { ...next[i], [key]: val }
    onChange(next)
  }
  return (
    <div className="border rounded overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="px-2 py-2 w-14">#</th>
            <th className="px-2 py-2 w-48">{labelPrefix ? `${labelPrefix} Cast` : 'Cast'}</th>
            <th className="px-2 py-2 w-40">Character</th>
            <th className="px-2 py-2 w-28">Status</th>
            <th className="px-2 py-2 w-24">PU/LV</th>
            <th className="px-2 py-2 w-24">HMU</th>
            <th className="px-2 py-2 w-28">REH/BLCK</th>
            <th className="px-2 py-2 w-20">SET</th>
            <th className="px-2 py-2">Comments</th>
            <th className="px-2 py-2 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r: any, i: number) => (
            <tr key={i} className="border-t">
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.no || ''} onChange={(e) => edit(i, 'no', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.cast || ''} onChange={(e) => edit(i, 'cast', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.character || ''} onChange={(e) => edit(i, 'character', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.status || ''} onChange={(e) => edit(i, 'status', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.pulv || ''} onChange={(e) => edit(i, 'pulv', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.hmu || ''} onChange={(e) => edit(i, 'hmu', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.rehblk || ''} onChange={(e) => edit(i, 'rehblk', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.setTime || ''} onChange={(e) => edit(i, 'setTime', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.comments || ''} onChange={(e) => edit(i, 'comments', e.target.value)} />
              </td>
              <td className="px-2 py-1 text-right">
                <button className="px-2 py-1 border rounded" onClick={() => rm(i)}>
                  Del
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2">
        <button className="px-3 py-1 border rounded" onClick={add}>
          Add row
        </button>
      </div>
    </div>
  )
}

function AtmosEditor({ rows, onChange }: { rows: any[]; onChange: (rows: any[]) => void }) {
  const add = () => onChange([...(rows || []), { new: '', name: '', call: '', onSet: '', remarks: '' }])
  const rm = (i: number) => onChange(rows.filter((_: any, idx: number) => idx !== i))
  const edit = (i: number, key: string, val: string) => {
    const n = rows.slice()
    n[i] = { ...n[i], [key]: val }
    onChange(n)
  }
  return (
    <div className="border rounded overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left">
            <th className="px-2 py-2 w-16">#New</th>
            <th className="px-2 py-2 w-64">Name</th>
            <th className="px-2 py-2 w-28">Call</th>
            <th className="px-2 py-2 w-28">On Set</th>
            <th className="px-2 py-2">Remarks</th>
            <th className="px-2 py-2 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {(rows || []).map((r: any, i: number) => (
            <tr key={i} className="border-t">
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.new || ''} onChange={(e) => edit(i, 'new', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.name || ''} onChange={(e) => edit(i, 'name', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.call || ''} onChange={(e) => edit(i, 'call', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.onSet || ''} onChange={(e) => edit(i, 'onSet', e.target.value)} />
              </td>
              <td className="px-2 py-1">
                <input className="border rounded px-2 py-1 w-full" value={r.remarks || ''} onChange={(e) => edit(i, 'remarks', e.target.value)} />
              </td>
              <td className="px-2 py-1 text-right">
                <button className="px-2 py-1 border rounded" onClick={() => rm(i)}>
                  Del
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-2">
        <button className="px-3 py-1 border rounded" onClick={add}>
          Add row
        </button>
      </div>
    </div>
  )
}

function ContactsEditor({
  value,
  onChange,
}: {
  value: AnyObject
  onChange: (v: AnyObject) => void
}) {
  const roles = ['PM', '1st AD', '2nd AD', '3rd AD', 'Location Manager', 'Asst. Loc. Manager', 'Transport Coord', 'Transport Capt.']
  const set = (role: string, field: 'name' | 'phone' | 'email', val: string) => {
    const next = { ...(value || {}) }
    const entry = { ...(next[role] || {}) }
    entry[field] = val
    entry.text = [entry.name, entry.phone, entry.email].filter(Boolean).join(' • ')
    next[role] = entry
    onChange(next)
  }
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {roles.map((role) => (
        <div key={role} className="border rounded p-3 space-y-2">
          <div className="text-sm font-medium">{role}</div>
          <input className="border rounded px-2 py-1 w-full" placeholder="Name" value={value?.[role]?.name || ''} onChange={(e) => set(role, 'name', e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded px-2 py-1" placeholder="Phone" value={value?.[role]?.phone || ''} onChange={(e) => set(role, 'phone', e.target.value)} />
            <input className="border rounded px-2 py-1" placeholder="Email" value={value?.[role]?.email || ''} onChange={(e) => set(role, 'email', e.target.value)} />
          </div>
        </div>
      ))}
    </div>
  )
}