import AppHeader from '@/components/AppHeader'
import ThreadClient from './client'

// keep folder as [id]; Next typed routes expect params as a Promise
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <main>
      <AppHeader />
      <div className="max-w-3xl mx-auto p-4">
        <ThreadClient id={id} />
      </div>
    </main>
  )
}