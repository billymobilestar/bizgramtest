// src/app/account/page.tsx
import { ensureUser } from '@/server/utils/bootstrapUser'
import AppHeader from '@/components/AppHeader'
import ProfileClient from './profileClient'


export const metadata = { title: 'Profile • BizGram' }


/*export default async function ProfilePage() {
  await ensureUser()
  return (
    <main>
      <AppHeader />
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <Client />
      </div>
    </main>
  )
}*/

export default function AccountPage(){
  return (
    <main>

      <div className="p-6 max-w-6xl mx-auto">
        <ProfileClient />
      </div>
    </main>
  )
}
