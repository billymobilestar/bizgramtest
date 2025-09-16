import Client from './client'

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  return (
    <main>
      <div className="max-w-4xl mx-auto p-4">
        <Client handle={handle} />
      </div>
    </main>
  )
}
