import { NextResponse } from 'next/server'
import { prisma } from '@/server/utils/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const body = await req.json().catch(() => ({}))
  const data: any = {}
  if (typeof body.name === 'string') data.name = body.name
  if (typeof body.coverUrl === 'string') data.coverUrl = body.coverUrl

  if (Object.keys(data).length === 0) return NextResponse.json({ ok: true })

  try {
    const updated = await prisma.project.update({
      where: { id },
      data,
      select: { id: true, name: true, coverUrl: true },
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 })
  }
}