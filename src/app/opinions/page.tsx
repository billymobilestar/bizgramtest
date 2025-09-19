// src/app/opinions/page.tsx
import Client from './client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function OpinionsPage() {
  return <Client />
}