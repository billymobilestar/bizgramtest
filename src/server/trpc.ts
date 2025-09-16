// src/server/trpc.ts
import { initTRPC } from '@trpc/server'
import superjson from 'superjson'
import type { Context } from './context'
import { TRPCError } from '@trpc/server'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx })
})
