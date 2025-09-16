
import Client from './threads'
import NewDMButton from '@/components/NewDMButton'   // ← add

export default function MessagesPage(){
  return (
    <main>

      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Messages</h1>
          <NewDMButton />  {/* ← here */}
        </div>
        <Client />
      </div>
    </main>
  )
}
