import { prisma } from '@/server/utils/prisma'
import { currentUser } from '@clerk/nextjs/server'

/**
 * Ensure a parent DB User row exists for the given Clerk userId.
 * Prevents FK violations like `Profile_userId_fkey` when creating Profile.
 *
 * If your Prisma `User` model has additional required fields (non-null, no defaults),
 * set sensible defaults below.
 */
export async function ensureDbUser(userId: string) {
  // If your schema does NOT have a `User` model, safely no-op.
  const anyPrisma = prisma as any
  if (!anyPrisma.user?.findUnique) return null

  const existing = await anyPrisma.user.findUnique({ where: { id: userId } })
  if (existing) return existing

  const cu = await currentUser().catch(() => null)
  const email: string | null = cu?.emailAddresses?.find(e => e.id === cu.primaryEmailAddressId)?.emailAddress
    ?? cu?.emailAddresses?.[0]?.emailAddress
    ?? null

  // TODO: If your `User` model requires more fields, set sensible defaults here.
  const created = await anyPrisma.user.create({
    data: {
      id: userId,
      email, // remove if you prefer null or if column doesn't exist
      // role: 'USER',          // example default if required
      // projectId: 'default',  // example default if required
    },
  })
  return created
}