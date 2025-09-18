import Client from '././client'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function DashboardPage({ params }: { params: { id: string } }) {
  return <Client id={params.id} />
}