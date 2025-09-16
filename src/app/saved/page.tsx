import Client from './client'
import AppHeader from '@/components/AppHeader'

export const metadata = { title: 'Saved' }

export default function Page() {
  return (

    <main className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Saved</h1>
      <Client />
    </main>

  )
}
