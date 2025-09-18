import { NextResponse } from 'next/server'
import { prisma } from '@/server/utils/prisma'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const p = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, coverUrl: true },
    })
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(p)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 400 })
  }
}