// src/app/api/dev/bootstrap/route.ts
import { NextResponse } from 'next/server'
import { ensureUser } from '@/server/utils/bootstrapUser'

export async function GET() {
  try {
    await ensureUser() // pulls user from Clerk server-side
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'bootstrap failed' }, { status: 500 })
  }
}
