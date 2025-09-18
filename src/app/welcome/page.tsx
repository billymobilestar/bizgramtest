import Client from '././welcome-client'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/server/utils/prisma'
import { bootstrapUser } from '@/server/utils/bootstrapUser'

export const runtime = 'nodejs'

export default async function WelcomePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  await bootstrapUser()
  const profile = await prisma.profile.findUnique({ where: { userId } })

  // If essentials are already complete, let them through
  const isComplete =
    !!profile &&
    !!profile.displayName &&
    profile.displayName.trim().length >= 2 &&
    !!profile.handle &&
    profile.handle.trim().length >= 2 &&
    !/^user[_-]?/i.test(profile.handle)

  if (isComplete) redirect('/')

  return <Client initialDisplayName={profile?.displayName ?? ''} initialHandle={profile?.handle ?? ''} />
}