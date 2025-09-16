// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server/routers/_app'
import { createTRPCContext } from '@/server/context'

export const runtime = 'nodejs' // keep Node to avoid any Edge/cookie oddities
export const dynamic = 'force-dynamic'
const handler = (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError({ error, path }) {
      console.error('tRPC error on path', path, error)
    },
  })
}

export { handler as GET, handler as POST }
