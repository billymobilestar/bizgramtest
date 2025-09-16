'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import MobileMenu, { type MobileMenuItem } from './MobileMenu'

export default function MobileHeaderButton({
  items,
  title,
  className = '',
}: {
  items?: MobileMenuItem[]
  title?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`sm:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-400 ${className}`}
      >
        <Menu className="h-6 w-6" />
      </button>

      <MobileMenu open={open} onClose={() => setOpen(false)} items={items} title={title} />
    </>
  )
}