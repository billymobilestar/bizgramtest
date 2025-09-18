import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/server/utils/prisma'
import { slugify } from '@/server/utils/slugify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const raw = url.searchParams.get('handle') || ''
  const candidate = slugify(raw)
  if (!candidate) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 })

  const found = await prisma.profile.findUnique({ where: { handle: candidate } })
  const available = !found || found.userId === userId
  return NextResponse.json({ ok: true, handle: candidate, available })
}