// src/server/routers/dm.ts
import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'
import { TRPCError } from '@trpc/server'

export const dmRouter = router({
  // ✅ used by the "New message" button
  listRecipients: protectedProcedure
    .input(z.object({ q: z.string().optional(), limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      return prisma.profile.findMany({
        where: {
          userId: { not: ctx.userId! },
          ...(input.q
            ? {
                OR: [
                  { handle: { contains: input.q, mode: 'insensitive' } },
                  { displayName: { contains: input.q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          userId: true,
          handle: true,
          displayName: true,
          profession: true,
          city: true,
          region: true,
        },
        orderBy: { displayName: 'asc' },
        take: input.limit,
      })
    }),

  // ✅ list the user’s threads (this is what threads.tsx calls)
  listThreads: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!
    return prisma.thread.findMany({
      where: { participantIds: { has: userId } },
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        participantIds: true,
        lastMessageAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, text: true, createdAt: true, fromUserId: true },
        },
      },
    })
  }),

  // ✅ thread detail
  getThread: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const t = await prisma.thread.findUnique({
        where: { id: input.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            select: { id: true, text: true, createdAt: true, fromUserId: true },
          },
        },
      })
      if (!t || !t.participantIds.includes(ctx.userId!)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      return t
    }),

  // ✅ create or reuse a 2-party thread
  startThreadWithUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.userId!
      if (me === input.userId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot DM yourself.' })
      }
      const participants = [me, input.userId].sort()
      const existing = await prisma.thread.findFirst({
        where: { participantIds: { hasEvery: participants } },
      })
      if (existing) return existing
      return prisma.thread.create({ data: { participantIds: participants } })
    }),

  // ✅ send message
  sendMessage: protectedProcedure
    .input(z.object({ threadId: z.string(), text: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const thread = await prisma.thread.findUnique({ where: { id: input.threadId } })
      if (!thread || !thread.participantIds.includes(ctx.userId!)) {
        throw new TRPCError({ code: 'FORBIDDEN' })
      }
      const msg = await prisma.message.create({
        data: {
          threadId: input.threadId,
          fromUserId: ctx.userId!,
          text: input.text,
        },
      })
      await prisma.thread.update({
        where: { id: input.threadId },
        data: { lastMessageAt: msg.createdAt },
      })
      return msg
    }),
})
