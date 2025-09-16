// src/server/context.ts
import { auth } from '@clerk/nextjs/server'

export type Context = {
  userId: string | null
  req: Request
  headers: Headers
}

export async function createTRPCContext(opts: { req: Request }): Promise<Context> {
  // Important: await here to satisfy TS and ensure we read the request's auth
  const { userId } = await auth()
  return {
    userId: userId ?? null,
    req: opts.req,
    headers: opts.req.headers,
  }
}
