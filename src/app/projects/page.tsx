// src/app/projects/page.tsx
import Client from './client'

// ensure fresh render (no static cache)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function ProjectsPage() {
  return <Client />
}