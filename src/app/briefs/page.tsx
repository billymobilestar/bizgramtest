// src/app/briefs/page.tsx

import Client from '././client'

export default function BriefsPage(){
  return (
    <main>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Briefs</h1>
          <a href="/briefs/new" className="px-3 py-1 border rounded">New Brief</a>
        </div>
        <Client />
      </div>
    </main>
  )
}
