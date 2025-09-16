// src/components/ui/Card.tsx
import { cn } from '@/lib/cn'
export default function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>){
  return <div className={cn('card', className)} {...props} />
}
