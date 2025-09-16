

import { redirect } from 'next/navigation'


export default function Page() {
  redirect('/search')
}
/*export default function DiscoverPage(){
  return (
    <main>
      <AppHeader />
      <div className="max-w-6xl mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-3">Discover</h1>
        <Client />
      </div>
    </main>
  )
}*/
