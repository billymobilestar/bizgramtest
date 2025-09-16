// src/server/routers/moderation.ts
import { z } from 'zod'
import { router, protectedProcedure } from '@/server/trpc'
import { prisma } from '@/server/utils/prisma'

export const moderationRouter = router({
  report: protectedProcedure
    .input(z.object({
      targetType: z.enum(['post','profile']),
      targetId: z.string(),
      reason: z.string().min(3).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      await prisma.report.create({
        data: {
          reporterUserId: ctx.userId!,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
        },
      })
      return { ok: true }
    }),
})
