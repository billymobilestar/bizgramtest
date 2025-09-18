import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/server/utils/prisma'
import { ensureDbUser } from '@/server/utils/ensureDbUser'
import { slugify } from './slugify'

function emailLocal(email?: string | null) {
  if (!email) return ''
  const [local] = email.split('@')
  return local || ''
}

async function uniqueHandle(base: string) {
  let handle = slugify(base) || 'user'
  handle = handle.replace(/^-+|-+$/g, '') || 'user'
  let tryHandle = handle
  for (let i = 0; i < 20; i++) {
    const exists = await prisma.profile.findUnique({ where: { handle: tryHandle } })
    if (!exists) return tryHandle
    tryHandle = `${handle}${Math.floor(100 + Math.random() * 900)}`
  }
  return `${handle}${Date.now().toString().slice(-4)}`
}

export async function bootstrapUser() {
  const user = await currentUser()
  if (!user) return { ok: false, reason: 'no-user' as const }
  // Ensure DB User exists to satisfy Profile.userId FK
  await ensureDbUser(user.id)

  const primaryEmail = user.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
    ?? user.emailAddresses?.[0]?.emailAddress
    ?? null

  // Ensure profile row exists
  let profile = await prisma.profile.findUnique({ where: { userId: user.id } })

  if (!profile) {
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username ||
      emailLocal(primaryEmail) ||
      'New user'

    const preferHandle =
      user.username ||
      emailLocal(primaryEmail) ||
      displayName.replace(/\s+/g, '')

    const handle = await uniqueHandle(preferHandle || 'user')

    profile = await prisma.profile.create({
      data: {
        userId: user.id,
        displayName,
        handle,
        avatarUrl: user.imageUrl ?? null,
        profession: 'Creator',           // required string in schema
        professions: [],                 // initialize multi-field if present
        city: null,
        region: null,
        bio: null,
      },
    })
  }

  return { ok: true as const, profile }
}