import AppHeader from '@/components/AppHeader'
import Client from '././client'

export default function SavedListPage({ params }: { params: { id: string } }){
  return (
    <main>

      <div className="max-w-5xl mx-auto p-6">
        <Client id={params.id} />
      </div>
    </main>
  )
}
