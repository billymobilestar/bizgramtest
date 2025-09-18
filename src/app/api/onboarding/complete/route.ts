import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/server/utils/prisma'
import { slugify } from '@/server/utils/slugify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Body = z.object({
  displayName: z.string().trim().min(2).max(60),
  handle: z.string().trim().min(2).max(40),
  accountType: z.enum(['PERSONAL', 'COMPANY']).optional(),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const json = await req.json()
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', details: parsed.error.flatten() }, { status: 400 })
  }

  const { displayName, handle, accountType } = parsed.data
  const cleanHandle = slugify(handle)

  const existing = await prisma.profile.findUnique({ where: { handle: cleanHandle } })
  if (existing && existing.userId !== userId) {
    return NextResponse.json({ error: 'handle-taken' }, { status: 409 })
  }

  const updated = await prisma.profile.update({
    where: { userId },
    data: {
      displayName,
      handle: cleanHandle,
      accountType: accountType ?? undefined,
    },
    select: { id: true, userId: true, displayName: true, handle: true },
  })

  return NextResponse.json({ ok: true, profile: updated })
}