import Client from './client'
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return <main className="p-6"><Client id={id} /></main>
}