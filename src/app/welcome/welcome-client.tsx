'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WelcomeClient({ initialDisplayName, initialHandle }: { initialDisplayName: string; initialHandle: string }) {
  const r = useRouter()
  const [displayName, setDisplayName] = useState(initialDisplayName || '')
  const [handle, setHandle] = useState(initialHandle || '')
  const [accountType, setAccountType] = useState<'PERSONAL' | 'COMPANY'>('PERSONAL')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const ok = useMemo(() => displayName.trim().length >= 2 && handle.trim().length >= 2 && available !== false, [displayName, handle, available])

  // live check handle (debounced)
  useEffect(() => {
    if (!handle.trim()) { setAvailable(null); return }
    const t = setTimeout(async () => {
      try {
        setChecking(true)
        const q = new URLSearchParams({ handle }).toString()
        const res = await fetch(`/api/handle/check?${q}`, { cache: 'no-store' })
        const j = await res.json()
        setAvailable(res.ok ? j.available : null)
      } catch {
        setAvailable(null)
      } finally {
        setChecking(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [handle])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ok) return
    setSaving(true)
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, handle, accountType }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j?.error || 'Failed to save')
        return
      }
      r.replace('/') // done!
      r.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Welcome! Let’s set up your profile</h1>
        <p className="text-sm text-neutral-600">Just the essentials — you can change these anytime.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required minLength={2} maxLength={60}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-400"
            placeholder="Jane Doe"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Handle</label>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">@</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required minLength={2} maxLength={40}
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              placeholder="janedoe"
            />
            <span className="text-sm">
              {checking ? 'Checking…' : available === false ? 'Taken' : available === true ? 'Available' : ''}
            </span>
          </div>
          <p className="text-xs text-neutral-500">Lowercase letters and numbers; we’ll format it if needed.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Account type</label>
          <div className="flex gap-3">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="acct" checked={accountType === 'PERSONAL'} onChange={() => setAccountType('PERSONAL')} />
              <span>Personal</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="acct" checked={accountType === 'COMPANY'} onChange={() => setAccountType('COMPANY')} />
              <span>Company</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={!ok || saving}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 hover:bg-neutral-50 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save & continue'}
        </button>
      </form>
    </main>
  )
}