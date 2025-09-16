import NotificationCenterClient from '././client'

export default function Page(){
  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Notifications</h1>
      <NotificationCenterClient />
    </main>
  )
}