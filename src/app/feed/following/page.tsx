import AppHeader from '@/components/AppHeader'
import Client from '././client'


export default function Page(){
return (
<main>
<AppHeader />
<div className="max-w-5xl mx-auto p-6">
<h1 className="text-2xl font-semibold mb-4">Following</h1>
<Client />
</div>
</main>
)
}