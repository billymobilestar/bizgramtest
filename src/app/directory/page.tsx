// src/app/directory/page.tsx

import Client from './client'

export default function DirectoryPage() {
  return (
    <>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold">Welcome to the Directory</h1>
          <p className="text-gray-600">Find people and businesses by profession, location, followers, and rates.</p>
        </header>
        <Client />
      </main>
    </>
  )
}
