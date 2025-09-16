// src/server/utils/bootstrapUser.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/server/utils/prisma'

/**
 * Ensure there is a User and Profile row for the signed-in Clerk user.
 * Also keeps avatarUrl in Profile synced with Clerk's imageUrl.
 */
export async function ensureUser(opts?: { id?: string }) {
  const forcedId = opts?.id
  const { userId: authUserId } = auth()
  const userId = forcedId ?? authUserId
  if (!userId) throw new Error('Not signed in')

  // Pull fresh data from Clerk
  const u = await currentUser()
  const email =
    u?.primaryEmailAddress?.emailAddress ??
    u?.emailAddresses?.[0]?.emailAddress ??
    `user-${userId}@example.local`
  const avatarUrl = u?.imageUrl || null
  const displayName =
    u?.fullName || u?.username || u?.firstName || 'Creator'

  // Ensure User row (id is Clerk userId)
  await prisma.user.upsert({
    where: { id: userId },
    create: { id: userId, email },
    update: { email },
  })

  // Ensure Profile row
  let profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) {
    // make a unique, friendly handle
    const base =
      (u?.username || email.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 20) || `user_${userId.slice(0, 6)}`
    let handle = base
    for (let i = 1; i <= 100; i++) {
      const exists = await prisma.profile.findUnique({ where: { handle } })
      if (!exists) break
      handle = `${base}${i}`
    }
    profile = await prisma.profile.create({
      data: {
        userId,
        handle,
        displayName: displayName || handle,
        profession: 'Creator',
        avatarUrl, // ← set on first create
      },
    })
  } else {
    // ←——— THIS is the bit you asked about (keeps avatar in sync)
    if (avatarUrl && profile.avatarUrl !== avatarUrl) {
      profile = await prisma.profile.update({
        where: { userId },
        data: { avatarUrl },
      })
    }
  }

  return profile
}
