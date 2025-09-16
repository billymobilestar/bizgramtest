// src/components/ui/Button.tsx
'use client'
import { cn } from '@/lib/cn'
export default function Button(
  { variant='primary', className, ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'outline'|'ghost' }
){
  const base = 'btn'
  const map = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'border-transparent hover:bg-gray-100'
  }
  return <button className={cn(base, map[variant], className)} {...props} />
}
