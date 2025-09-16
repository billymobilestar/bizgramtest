// src/components/Time.tsx
'use client'

import { useMemo } from 'react'

type Props = {
  iso: string | Date | null | undefined
  opts?: Intl.DateTimeFormatOptions & { timeZone?: string }
  as?: 'time' | 'span'
  className?: string
}

export default function Time({ iso, opts, as='time', className }: Props) {
  const dt = typeof iso === 'string' ? new Date(iso) : iso ?? null
  const formatted = useMemo(() => {
    if (!dt) return ''
    // Fix the timeZone so SSR vs client won’t drift by user locale.
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', ...(opts||{}) })
    return fmt.format(dt)
  }, [dt, opts])

  const Tag: any = as
  return <Tag dateTime={dt?.toISOString()} className={className} suppressHydrationWarning>{formatted}</Tag>
}