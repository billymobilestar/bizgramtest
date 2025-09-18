import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/server/utils/prisma'
import { bootstrapUser } from '@/server/utils/bootstrapUser'
import { redirect } from 'next/navigation'

export default async function OnboardingGate() {
  const { userId } = await auth()
  if (!userId) return null
  await bootstrapUser()
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { handle: true, displayName: true },
  })
  if (!profile) return null

  // Infer whether the user needs onboarding based on essential fields
  const needsOnboarding =
    !profile.displayName || profile.displayName.trim().length < 2 ||
    !profile.handle || profile.handle.trim().length < 2 ||
    /^user[_-]?/i.test(profile.handle) // treat placeholder-like handles as incomplete

  if (needsOnboarding) redirect('/welcome')
  return null
}