// src/components/ui/Badge.tsx
import { cn } from '@/lib/cn'
export default function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>){
  return <span className={cn('badge', className)} {...props} />
}
