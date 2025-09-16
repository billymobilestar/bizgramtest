// src/app/api/dev/whoami/route.ts
import { auth } from '@clerk/nextjs/server'

export async function GET() {
  const { userId, sessionId } = await auth()
  return Response.json({ userId, sessionId })
}
