import { cn } from '@/lib/cn'
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>){
  return <input className={cn('w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300', props.className)} {...props} />
}
