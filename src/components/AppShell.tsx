import AppHeader from '@/components/AppHeader'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <AppHeader />
      <div className="container-page py-4">{children}</div>
    </main>
  )
}