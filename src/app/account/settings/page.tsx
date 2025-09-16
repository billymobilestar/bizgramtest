// src/app/account/settings/page.tsx
import AppHeader from '@/components/AppHeader'
// Make sure SettingsForm.tsx exists in the same folder, or update the import path if the file is named differently or located elsewhere.
// Example if the file is named settings-form.tsx:
import SettingsForm from './SettingsForm'

export default function SettingsPage(){
  return (
    <main>
      <AppHeader />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Profile Settings</h1>
        <SettingsForm />
      </div>
    </main>
  )
}
