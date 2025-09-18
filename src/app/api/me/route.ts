import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/server/utils/prisma'
import { bootstrapUser } from '@/server/utils/bootstrapUser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ user: null, profile: null }, { status: 200 })

  // ensure profile row
  await bootstrapUser()

  const user = await currentUser()
  const profile = await prisma.profile.findUnique({ where: { userId } })

  return NextResponse.json({
    user: user ? {
      id: user.id,
      email: user.emailAddresses?.[0]?.emailAddress ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      username: user.username ?? null,
      imageUrl: user.imageUrl ?? null,
    } : null,
    profile,
  })
}